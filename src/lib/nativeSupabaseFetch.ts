import {
  Capacitor,
  CapacitorHttp,
  type HttpOptions,
  type HttpResponse,
} from "@capacitor/core";

const DEFAULT_NATIVE_REQUEST_TIMEOUT_MS = 6_000;
const MAX_NATIVE_RESPONSE_LENGTH = 2 * 1024 * 1024;

type NativeRequest = (options: HttpOptions) => Promise<HttpResponse>;

interface NativeSupabaseFetchOptions {
  supabaseUrl: string;
  isNativeIos?: () => boolean;
  nativeRequest?: NativeRequest;
  fallbackFetch?: typeof fetch;
  requestTimeoutMs?: number;
}

const createAbortError = () =>
  new DOMException("The operation was aborted.", "AbortError");

const createNetworkError = (message: string) => new TypeError(message);

const responseBody = (response: HttpResponse, method: string) => {
  if (
    method === "HEAD"
    || response.status === 204
    || response.status === 205
    || response.data === null
    || response.data === undefined
  ) {
    return null;
  }

  const body = typeof response.data === "string"
    ? response.data
    : JSON.stringify(response.data);
  if (body.length > MAX_NATIVE_RESPONSE_LENGTH) {
    throw createNetworkError("Native Supabase response exceeded the safety limit");
  }
  return body;
};

const toFetchResponse = (
  nativeResponse: HttpResponse,
  requestUrl: string,
  method: string,
  allowedOrigin: string,
) => {
  if (
    !Number.isInteger(nativeResponse.status)
    || nativeResponse.status < 200
    || nativeResponse.status > 599
  ) {
    throw createNetworkError("Native Supabase response was invalid");
  }

  const responseUrl = nativeResponse.url || requestUrl;
  let parsedResponseUrl: URL;
  try {
    parsedResponseUrl = new URL(responseUrl);
  } catch {
    throw createNetworkError("Native Supabase response was invalid");
  }
  if (parsedResponseUrl.origin !== allowedOrigin) {
    throw createNetworkError("Native Supabase response was blocked");
  }

  const response = new Response(responseBody(nativeResponse, method), {
    headers: nativeResponse.headers,
    status: nativeResponse.status,
  });
  Object.defineProperty(response, "url", {
    configurable: true,
    value: parsedResponseUrl.toString(),
  });
  return response;
};

const readRequestBody = async (request: Request) => {
  if (request.method === "GET" || request.method === "HEAD" || request.body === null) {
    return undefined;
  }
  return request.clone().text();
};

export const createNativeSupabaseFetch = ({
  supabaseUrl,
  isNativeIos = () =>
    Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios",
  nativeRequest = (options) => CapacitorHttp.request(options),
  fallbackFetch = (input, init) => globalThis.fetch(input, init),
  requestTimeoutMs = DEFAULT_NATIVE_REQUEST_TIMEOUT_MS,
}: NativeSupabaseFetchOptions): typeof fetch => {
  const allowedUrl = new URL(supabaseUrl);
  if (
    allowedUrl.protocol !== "https:"
    || allowedUrl.username
    || allowedUrl.password
    || allowedUrl.search
    || allowedUrl.hash
  ) {
    throw new Error("Invalid Supabase URL for native transport");
  }
  const allowedOrigin = allowedUrl.origin;

  return async (input, init) => {
    if (!isNativeIos()) return fallbackFetch(input, init);

    let request: Request;
    const requestSignal = init?.signal
      ?? (input instanceof Request ? input.signal : undefined);
    try {
      const { signal: _signal, ...requestInit } = init ?? {};
      request = new Request(input, requestInit);
    } catch {
      throw createNetworkError("Native Supabase request was invalid");
    }

    let requestUrl: URL;
    try {
      requestUrl = new URL(request.url);
    } catch {
      throw createNetworkError("Native Supabase request was invalid");
    }
    if (requestUrl.protocol !== "https:" || requestUrl.origin !== allowedOrigin) {
      throw createNetworkError("Native Supabase request blocked");
    }
    const signal = requestSignal ?? request.signal;
    if (signal.aborted) throw createAbortError();

    const method = request.method.toUpperCase();
    const body = await readRequestBody(request);
    if (signal.aborted) throw createAbortError();

    const nativeOptions: HttpOptions = {
      url: requestUrl.toString(),
      method,
      headers: Object.fromEntries(request.headers.entries()),
      ...(body !== undefined ? { data: body } : {}),
      connectTimeout: requestTimeoutMs,
      readTimeout: requestTimeoutMs,
      disableRedirects: true,
      responseType: "text",
      shouldEncodeUrlParams: false,
    };

    return new Promise<Response>((resolve, reject) => {
      let settled = false;
      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        signal.removeEventListener("abort", handleAbort);
        callback();
      };
      const handleAbort = () => finish(() => reject(createAbortError()));
      const timeoutId = window.setTimeout(() => {
        finish(() => reject(
          createNetworkError("Native Supabase network request timed out"),
        ));
      }, requestTimeoutMs);

      signal.addEventListener("abort", handleAbort, { once: true });
      void nativeRequest(nativeOptions).then(
        (nativeResponse) => finish(() => {
          try {
            resolve(toFetchResponse(
              nativeResponse,
              requestUrl.toString(),
              method,
              allowedOrigin,
            ));
          } catch (error) {
            reject(error);
          }
        }),
        () => finish(() => reject(
          createNetworkError("Native Supabase network request failed"),
        )),
      );
    });
  };
};
