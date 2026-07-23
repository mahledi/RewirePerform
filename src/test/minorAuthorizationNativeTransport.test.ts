import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getMinorAuthorizationStatus,
  MinorAuthorizationError,
} from "@/lib/minorAuthorization";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  invoke: vi.fn(),
  isNativePlatform: vi.fn(),
  nativePost: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: mocks.isNativePlatform },
  CapacitorHttp: { post: mocks.nativePost },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: mocks.getSession },
    functions: { invoke: mocks.invoke },
  },
}));

const authorized = {
  state: "product_authorized",
  product_status: "authorized",
};

const captureFailure = async (request: Promise<unknown>) => {
  try {
    await request;
  } catch (error) {
    expect(error).toBeInstanceOf(MinorAuthorizationError);
    return (error as MinorAuthorizationError).failure;
  }
  throw new Error("Expected authorization request to fail");
};

describe("minor authorization native status transport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_SUPABASE_URL", "https://project-ref.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-test-key");
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "access-token" } },
      error: null,
    });
    mocks.nativePost.mockResolvedValue({
      data: authorized,
      headers: { "content-type": "application/json" },
      status: 200,
      url: "https://project-ref.supabase.co/functions/v1/minor-guardian-user",
    });
  });

  it("bypasses a hanging WebView fetch for the native status read", async () => {
    mocks.invoke.mockReturnValue(new Promise(() => undefined));

    await expect(getMinorAuthorizationStatus()).resolves.toEqual(authorized);

    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(mocks.nativePost).toHaveBeenCalledWith({
      url: "https://project-ref.supabase.co/functions/v1/minor-guardian-user",
      headers: {
        Authorization: "Bearer access-token",
        apikey: "publishable-test-key",
        "Content-Type": "application/json",
      },
      data: { action: "status" },
      connectTimeout: 2_500,
      readTimeout: 2_500,
      disableRedirects: true,
      responseType: "json",
    });
  });

  it("keeps the browser on the existing Supabase Functions transport", async () => {
    mocks.isNativePlatform.mockReturnValue(false);
    mocks.invoke.mockResolvedValue({ data: authorized, error: null });

    await expect(getMinorAuthorizationStatus()).resolves.toEqual(authorized);

    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.nativePost).not.toHaveBeenCalled();
  });

  it.each([
    [401, "unauthorized", false],
    [403, "forbidden", false],
    [429, "rate_limited", true],
    [503, "service_unavailable", true],
  ] as const)("classifies native HTTP %i", async (status, code, retryable) => {
    mocks.nativePost.mockResolvedValue({
      data: { error: `status_${status}` },
      headers: { "content-type": "application/json" },
      status,
      url: "https://project-ref.supabase.co/functions/v1/minor-guardian-user",
    });

    await expect(captureFailure(getMinorAuthorizationStatus())).resolves.toEqual({
      code,
      retryable,
      status,
    });
  });

  it("fails closed when the native response is not a status payload", async () => {
    mocks.nativePost.mockResolvedValue({
      data: { product_status: "authorized" },
      headers: { "content-type": "application/json" },
      status: 200,
      url: "https://project-ref.supabase.co/functions/v1/minor-guardian-user",
    });

    await expect(captureFailure(getMinorAuthorizationStatus())).resolves.toEqual({
      code: "invalid_response",
      retryable: false,
    });
  });
});
