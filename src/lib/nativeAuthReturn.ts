export const NATIVE_AUTH_RETURN_ORIGIN = "https://rewireperform.com";
export const NATIVE_SIGNUP_RETURN_PATH = "/auth";

type NativeSignupContext = {
  intent: "solo" | "join";
  teamCode: string | null;
  redirect: string | null;
};

export type NativeSignupReturn =
  | ({ kind: "session"; accessToken: string; refreshToken: string } & NativeSignupContext)
  | ({ kind: "code"; authCode: string } & NativeSignupContext)
  | { kind: "error"; errorCode: string }
  | { kind: "ignore" };

const readParams = (value: string) => new URLSearchParams(value.replace(/^[?#]/u, ""));

const safeLocalRoute = (value: string | null) =>
  value && /^\/(?!\/)/u.test(value) && !value.startsWith("/guardian/decision")
    ? value
    : null;

const readSignupContext = (url: URL): NativeSignupContext | null => {
  const intent = url.searchParams.get("intent") === "join" ? "join" : "solo";
  const teamCode = url.searchParams.get("team")?.trim().toUpperCase() ?? null;
  if (intent === "join" && (!teamCode || !/^[A-Z0-9]{6}$/u.test(teamCode))) return null;

  return {
    intent,
    teamCode: intent === "join" ? teamCode : null,
    redirect: safeLocalRoute(url.searchParams.get("redirect")),
  };
};

export const parseNativeSignupReturn = (rawUrl: string): NativeSignupReturn => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { kind: "ignore" };
  }

  if (
    url.origin !== NATIVE_AUTH_RETURN_ORIGIN
    || url.pathname !== NATIVE_SIGNUP_RETURN_PATH
    || url.searchParams.get("flow") !== "signup"
  ) {
    return { kind: "ignore" };
  }

  const query = url.searchParams;
  const fragment = readParams(url.hash);
  const errorCode = fragment.get("error_code")
    ?? query.get("error_code")
    ?? fragment.get("error")
    ?? query.get("error");
  if (errorCode) return { kind: "error", errorCode };

  const context = readSignupContext(url);
  if (!context) return { kind: "error", errorCode: "invalid_callback" };

  const callbackType = fragment.get("type");
  const accessToken = fragment.get("access_token");
  const refreshToken = fragment.get("refresh_token");
  if (accessToken || refreshToken) {
    if (callbackType !== "signup" || !accessToken || !refreshToken) {
      return { kind: "error", errorCode: "invalid_callback" };
    }
    return { kind: "session", accessToken, refreshToken, ...context };
  }

  const authCode = query.get("code");
  if (authCode) return { kind: "code", authCode, ...context };

  return { kind: "error", errorCode: "invalid_callback" };
};

export const nativeSignupContinuationRoute = (
  value: Extract<NativeSignupReturn, { kind: "session" | "code" }>,
) => {
  const nextRoute = value.redirect ?? "/questionnaire";
  if (value.intent === "solo") {
    return `/minor-consent?next=${encodeURIComponent(nextRoute)}`;
  }

  const params = new URLSearchParams({ redirect: nextRoute });
  if (value.intent === "join" && value.teamCode) {
    params.set("intent", "join");
    params.set("team", value.teamCode);
  }
  return `/auth?${params.toString()}`;
};
