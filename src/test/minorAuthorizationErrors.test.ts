import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getMinorAuthorizationStatus,
  MinorAuthorizationError,
} from "@/lib/minorAuthorization";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: mocks.invoke },
  },
}));

const captureFailure = async (request: Promise<unknown>) => {
  try {
    await request;
  } catch (error) {
    expect(error).toBeInstanceOf(MinorAuthorizationError);
    return (error as MinorAuthorizationError).failure;
  }
  throw new Error("Expected authorization request to fail");
};

const httpError = (status: number) => new FunctionsHttpError(new Response(
  JSON.stringify({ error: `status_${status}` }),
  { status, headers: { "content-type": "application/json" } },
));

describe("minor authorization transport errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("distinguishes a Supabase Functions fetch failure", async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: new FunctionsFetchError(new TypeError("Load failed")),
    });

    await expect(captureFailure(getMinorAuthorizationStatus())).resolves.toEqual({
      code: "fetch_error",
      retryable: true,
    });
  });

  it("distinguishes a relay failure without blind retries", async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: new FunctionsRelayError({ region: "eu-central-1" }),
    });

    await expect(captureFailure(getMinorAuthorizationStatus())).resolves.toEqual({
      code: "relay_error",
      retryable: false,
    });
  });

  it.each([
    [401, "unauthorized", false],
    [403, "forbidden", false],
    [429, "rate_limited", true],
    [503, "service_unavailable", true],
    [500, "http_error", false],
  ] as const)("classifies HTTP %i", async (status, code, retryable) => {
    mocks.invoke.mockResolvedValue({ data: null, error: httpError(status) });

    await expect(captureFailure(getMinorAuthorizationStatus())).resolves.toEqual({
      code,
      retryable,
      status,
    });
  });

  it("rejects an invalid success payload", async () => {
    mocks.invoke.mockResolvedValue({ data: { product_status: "authorized" }, error: null });

    await expect(captureFailure(getMinorAuthorizationStatus())).resolves.toEqual({
      code: "invalid_response",
      retryable: false,
    });
  });

  it("classifies its own deadline as a timeout", async () => {
    vi.useFakeTimers();
    mocks.invoke.mockReturnValue(new Promise(() => undefined));

    const observed = vi.fn();
    const result = captureFailure(getMinorAuthorizationStatus({ timeoutMs: 200 }))
      .then((failure) => {
        observed(failure);
        return failure;
      });
    await vi.advanceTimersByTimeAsync(200);

    expect(observed).toHaveBeenCalledWith({ code: "timeout", retryable: true });
    await result;
  });

  it("keeps a caller abort distinct from a timeout", async () => {
    const controller = new AbortController();
    mocks.invoke.mockReturnValue(new Promise(() => undefined));

    const observed = vi.fn();
    const result = captureFailure(getMinorAuthorizationStatus({
      signal: controller.signal,
      timeoutMs: 1_000,
    })).then((failure) => {
      observed(failure);
      return failure;
    });
    controller.abort();

    await vi.waitFor(() => {
      expect(observed).toHaveBeenCalledWith({ code: "aborted", retryable: false });
    });
    await result;
  });
});
