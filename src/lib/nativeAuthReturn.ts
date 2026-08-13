import { safeInternalRoute } from "@/lib/internalRoute";
import { parseOrganizationInviteUrl } from "@/lib/organizationInvite";

export const NATIVE_AUTH_RETURN_ORIGIN = "https://rewireperform.com";
export const NATIVE_SIGNUP_RETURN_PATH = "/auth";

type NativeSignupContext = {
  intent: "solo" | "join" | "organization";
  teamCode: string | null;
  redirect: string | null;
  intro: "athlete" | "coach" | null;
};

export type NativeSignupReturn =
  | ({ kind: "session"; accessToken: string; refreshToken: string } & NativeSignupContext)
  | ({ kind: "code"; authCode: string } & NativeSignupContext)
  | { kind: "error"; errorCode: string }
  | { kind: "ignore" };

const readParams = (value: string) => new URLSearchParams(value.replace(/^[?#]/u, ""));

const readSignupContext = (url: URL): NativeSignupContext | null => {
  const requestedIntent = url.searchParams.get("intent");
  const intent = requestedIntent === "join"
    ? "join"
    : requestedIntent === "organization"
      ? "organization"
      : "solo";
  const requestedIntro = url.searchParams.get("intro");
  const intro = requestedIntro === "athlete" || requestedIntro === "coach" ? requestedIntro : null;
  const teamCode = url.searchParams.get("team")?.trim().toUpperCase() ?? null;
  if (intent === "join" && (!teamCode || !/^[A-Z0-9]{6}$/u.test(teamCode))) return null;
  if (intent === "organization" && intro && intro !== "coach") return null;
  if (intent !== "organization" && intro && intro !== "athlete") return null;

  let redirect = safeInternalRoute(url.searchParams.get("redirect"), {
    blockedPathPrefixes: ["/guardian/decision"],
  });
  if (intent === "organization") {
    if (!redirect) return null;
    const invitation = parseOrganizationInviteUrl(new URL(redirect, NATIVE_AUTH_RETURN_ORIGIN).toString());
    if (invitation.kind !== "invite") return null;
    redirect = invitation.route;
  }

  return {
    intent,
    teamCode: intent === "join" ? teamCode : null,
    redirect,
    intro,
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
  if (value.intent === "organization" && value.redirect) return value.redirect;
  const nextRoute = "/questionnaire";
  return `/minor-consent?next=${encodeURIComponent(nextRoute)}`;
};
