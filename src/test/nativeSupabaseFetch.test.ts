import { afterEach, describe, expect, it, vi } from "vitest";
import type { HttpOptions, HttpResponse } from "@capacitor/core";
import { createClient } from "@supabase/supabase-js";
import { createNativeSupabaseFetch } from "@/lib/nativeSupabaseFetch";

const SUPABASE_URL = "https://project-ref.supabase.co";

const nativeResponse = (
  data: unknown,
  overrides: Partial<HttpResponse> = {},
): HttpResponse => ({
  data,
  headers: { "content-type": "application/json" },
  status: 200,
  url: `${SUPABASE_URL}/rest/v1/profiles`,
  ...overrides,
});

const createHarness = ({
  isNativeIos = true,
  nativeRequest = vi.fn<(options: HttpOptions) => Promise<HttpResponse>>(),
  fallbackFetch = vi.fn<typeof fetch>(),
  requestTimeoutMs = 1_000,
}: {
  isNativeIos?: boolean;
  nativeRequest?: ReturnType<typeof vi.fn<(options: HttpOptions) => Promise<HttpResponse>>>;
  fallbackFetch?: ReturnType<typeof vi.fn<typeof fetch>>;
  requestTimeoutMs?: number;
} = {}) => ({
  fallbackFetch,
  nativeRequest,
  fetch: createNativeSupabaseFetch({
    supabaseUrl: SUPABASE_URL,
    isNativeIos: () => isNativeIos,
    nativeRequest,
    fallbackFetch,
    requestTimeoutMs,
  }),
});

const captureError = async (request: Promise<Response>) => {
  try {
    await request;
  } catch (error) {
    return error as Error;
  }
  throw new Error("Expected request to fail");
};

afterEach(() => {
  vi.useRealTimers();
});

describe("native Supabase fetch", () => {
  it("keeps browser requests on the existing web fetch", async () => {
    const webResponse = new Response("web", { status: 200 });
    const harness = createHarness({ isNativeIos: false });
    harness.fallbackFetch.mockResolvedValue(webResponse);

    await expect(
      harness.fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id`),
    ).resolves.toBe(webResponse);

    expect(harness.fallbackFetch).toHaveBeenCalledTimes(1);
    expect(harness.nativeRequest).not.toHaveBeenCalled();
  });

  it("moves native iOS GET requests including query and auth headers to CapacitorHttp", async () => {
    const harness = createHarness();
    harness.nativeRequest.mockResolvedValue(nativeResponse([{ id: "profile-1" }]));

    const response = await harness.fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`,
      {
        headers: {
          apikey: "publishable-key",
          Authorization: "Bearer access-token",
        },
      },
    );

    expect(harness.fallbackFetch).not.toHaveBeenCalled();
    expect(harness.nativeRequest).toHaveBeenCalledWith({
      url: `${SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`,
      method: "GET",
      headers: {
        apikey: "publishable-key",
        authorization: "Bearer access-token",
      },
      connectTimeout: 1_000,
      readTimeout: 1_000,
      disableRedirects: true,
      responseType: "text",
      shouldEncodeUrlParams: false,
    });
    await expect(response.json()).resolves.toEqual([{ id: "profile-1" }]);
  });

  it("preserves the exact JSON body for native Supabase writes", async () => {
    const harness = createHarness();
    harness.nativeRequest.mockResolvedValue(nativeResponse({ saved: true }));

    await harness.fetch(`${SUPABASE_URL}/functions/v1/example`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status" }),
    });

    expect(harness.nativeRequest).toHaveBeenCalledWith({
      url: `${SUPABASE_URL}/functions/v1/example`,
      method: "POST",
      headers: { "content-type": "application/json" },
      data: "{\"action\":\"status\"}",
      connectTimeout: 1_000,
      readTimeout: 1_000,
      disableRedirects: true,
      responseType: "text",
      shouldEncodeUrlParams: false,
    });
  });

  it("returns HTTP failures as normal fetch responses for Supabase to classify", async () => {
    const harness = createHarness();
    harness.nativeRequest.mockResolvedValue(nativeResponse(
      { error: "forbidden" },
      { status: 403 },
    ));

    const response = await harness.fetch(`${SUPABASE_URL}/rest/v1/profiles`);

    expect(response.status).toBe(403);
    expect(response.ok).toBe(false);
    await expect(response.json()).resolves.toEqual({ error: "forbidden" });
  });

  it("blocks unexpected native hosts without sending credentials", async () => {
    const harness = createHarness();

    await expect(
      harness.fetch("https://example.com/rest/v1/profiles", {
        headers: { Authorization: "Bearer access-token" },
      }),
    ).rejects.toThrow("Native Supabase request blocked");

    expect(harness.nativeRequest).not.toHaveBeenCalled();
    expect(harness.fallbackFetch).not.toHaveBeenCalled();
  });

  it("rejects an aborted request and ignores a later native success", async () => {
    let resolveNative: ((response: HttpResponse) => void) | null = null;
    const harness = createHarness({
      nativeRequest: vi.fn(() => new Promise<HttpResponse>((resolve) => {
        resolveNative = resolve;
      })),
    });
    const controller = new AbortController();
    const request = harness.fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      signal: controller.signal,
    });

    controller.abort();
    await expect(request).rejects.toMatchObject({ name: "AbortError" });

    resolveNative?.(nativeResponse([{ id: "late" }]));
    await Promise.resolve();
  });

  it("bounds a hanging native request with a sanitized network timeout", async () => {
    vi.useFakeTimers();
    const harness = createHarness({
      nativeRequest: vi.fn(() => new Promise<HttpResponse>(() => undefined)),
      requestTimeoutMs: 50,
    });

    const request = harness.fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      headers: { Authorization: "Bearer should-never-appear" },
    });
    const captured = captureError(request);
    await vi.advanceTimersByTimeAsync(50);

    const error = await captured;
    expect(error.message).toBe("Native Supabase network request timed out");
    expect(error.message).not.toContain("should-never-appear");
  });

  it("does not expose native error details that could contain credentials", async () => {
    const harness = createHarness({
      nativeRequest: vi.fn().mockRejectedValue(
        new Error("Bearer secret-token at a sensitive URL"),
      ),
    });

    const request = harness.fetch(`${SUPABASE_URL}/rest/v1/profiles`);

    const error = await captureError(request);
    expect(error.message).toBe("Native Supabase network request failed");
    expect(error.message).not.toContain("secret-token");
  });

  it("works through the real Supabase client for PostgREST and Edge Functions", async () => {
    const harness = createHarness();
    harness.nativeRequest.mockImplementation(async (options) => {
      if (options.url.includes("/rest/v1/profiles")) {
        return nativeResponse(
          [{ id: "profile-1" }],
          { url: options.url },
        );
      }
      if (options.url.includes("/functions/v1/example")) {
        return nativeResponse(
          { state: "ready" },
          { url: options.url },
        );
      }
      throw new Error("Unexpected test URL");
    });
    const client = createClient(SUPABASE_URL, "publishable-key", {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
      global: { fetch: harness.fetch },
    });

    const tableResult = await client.from("profiles").select("id").limit(1);
    const functionResult = await client.functions.invoke("example", {
      body: { action: "status" },
    });

    expect(tableResult).toEqual(expect.objectContaining({
      count: null,
      data: [{ id: "profile-1" }],
      error: null,
      status: 200,
      statusText: "",
    }));
    expect(functionResult).toEqual(expect.objectContaining({
      data: { state: "ready" },
      error: null,
      response: expect.any(Response),
    }));
    expect(harness.nativeRequest).toHaveBeenCalledTimes(2);
    expect(harness.nativeRequest.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      method: "GET",
      url: expect.stringContaining("/rest/v1/profiles?select=id&limit=1"),
    }));
    expect(harness.nativeRequest.mock.calls[1]?.[0]).toEqual(expect.objectContaining({
      data: "{\"action\":\"status\"}",
      method: "POST",
      url: `${SUPABASE_URL}/functions/v1/example`,
    }));
  });
});
