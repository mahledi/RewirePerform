export type SafeAuthConfirmation = {
  url: string;
  type: "confirmation" | "recovery";
};

const CONFIRMATION_PARAM = "?confirmation_url=";

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
