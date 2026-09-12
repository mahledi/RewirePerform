export type SafeAuthConfirmation = {
  url: string;
  type: "confirmation" | "recovery";
};

const CONFIRMATION_PARAM = "?confirmation_url=";
const ANDROID_AUTH_SCHEME = "com.rewireperform.app:";
const ANDROID_USER_AGENT = /\bAndroid\b/iu;

export const hasSafeAndroidConfirmationTarget = (
  confirmation: SafeAuthConfirmation,
): boolean => {
  try {
    const providerUrl = new URL(confirmation.url);
    const redirectValue = providerUrl.searchParams.get("redirect_to");
    if (!redirectValue) return false;

    const redirectUrl = new URL(redirectValue);
    if (
      redirectUrl.protocol !== ANDROID_AUTH_SCHEME
      || redirectUrl.hostname !== "auth"
      || redirectUrl.username !== ""
      || redirectUrl.password !== ""
      || redirectUrl.port !== ""
      || redirectUrl.hash !== ""
    ) {
      return false;
    }

    if (confirmation.type === "recovery") {
      return redirectUrl.pathname === "/reset-password"
        && redirectUrl.searchParams.get("flow") === "recovery";
    }

    return (redirectUrl.pathname === "" || redirectUrl.pathname === "/")
      && redirectUrl.searchParams.get("flow") === "signup";
  } catch {
    return false;
  }
};

export const shouldAutoOpenAndroidConfirmation = (
  confirmation: SafeAuthConfirmation | null,
  platform: string,
  userAgent: string,
): boolean => (
  confirmation !== null
  && hasSafeAndroidConfirmationTarget(confirmation)
  && (platform === "android" || ANDROID_USER_AGENT.test(userAgent))
);

export const parseAuthConfirmationUrl = (
  search: string,
  supabaseOrigin: string,
): SafeAuthConfirmation | null => {
  if (!search.startsWith(CONFIRMATION_PARAM)) return null;

  try {
    const rawValue = search.slice(CONFIRMATION_PARAM.length);
    const rawUrl = /^https?:\/\//i.test(rawValue) ? rawValue : decodeURIComponent(rawValue);
    const confirmationUrl = new URL(rawUrl);
    const expectedOrigin = new URL(supabaseOrigin).origin;
    const providerType = confirmationUrl.searchParams.get("type");

    if (confirmationUrl.origin !== expectedOrigin) return null;
    if (confirmationUrl.pathname !== "/auth/v1/verify") return null;
    if (!confirmationUrl.searchParams.get("token")) return null;
    if (providerType === "recovery") {
      return { url: confirmationUrl.toString(), type: "recovery" };
    }
    if (providerType === "signup" || providerType === "email") {
      return { url: confirmationUrl.toString(), type: "confirmation" };
    }
  } catch {
    return null;
  }

  return null;
};
