export const MIN_ACCOUNT_PASSWORD_LENGTH = 8;
export const PRODUCTION_APP_ORIGIN = "https://rewireperform.com";

type AuthErrorLike = {
  code?: string;
  message?: string;
  status?: number;
};

export type AuthLinkError = {
  code: string;
  message: string;
};

const readParams = (value: string) => new URLSearchParams(value.replace(/^[?#]/, ""));

export const parseAuthLinkError = (search: string, hash: string): AuthLinkError | null => {
  const query = readParams(search);
  const fragment = readParams(hash);
  const code = fragment.get("error_code") ?? query.get("error_code") ?? fragment.get("error") ?? query.get("error");

  if (!code) return null;

  if (code === "otp_expired" || code === "access_denied") {
    return {
      code,
      message: "Dieser Sicherheitslink ist abgelaufen oder wurde bereits verwendet.",
    };
  }

  return {
    code,
    message: "Dieser Sicherheitslink konnte nicht bestätigt werden.",
  };
};

export const isEmailNotConfirmedError = (error: AuthErrorLike) => {
  const message = error.message?.toLowerCase() ?? "";
  return error.code === "email_not_confirmed" || message.includes("email not confirmed");
};

export const authErrorMessage = (error: AuthErrorLike, fallback: string) => {
  const message = error.message?.toLowerCase() ?? "";

  if (error.code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return "E-Mail oder Passwort ist nicht korrekt.";
  }
  if (isEmailNotConfirmedError(error)) {
    return "Bitte bestätige zuerst deine E-Mail-Adresse.";
  }
  if (error.status === 429 || error.code === "over_email_send_rate_limit" || message.includes("rate limit")) {
    return "Bitte warte kurz, bevor du eine weitere E-Mail anforderst.";
  }
  if (error.code === "weak_password" || message.includes("password should be")) {
    return `Das Passwort muss mindestens ${MIN_ACCOUNT_PASSWORD_LENGTH} Zeichen haben.`;
  }
  if (error.code === "same_password" || message.includes("same password")) {
    return "Das neue Passwort muss sich vom bisherigen Passwort unterscheiden.";
  }
  if (error.code === "otp_expired" || message.includes("expired")) {
    return "Der Code ist abgelaufen. Fordere bitte eine neue E-Mail an.";
  }
  if (error.code === "otp_disabled" || message.includes("invalid token") || message.includes("token has expired")) {
    return "Der Code ist ungültig oder wurde bereits verwendet.";
  }

  return fallback;
};

export const publicAuthOrigin = ({ origin, protocol }: { origin: string; protocol: string }) => (
  protocol === "http:" || protocol === "https:" ? origin : PRODUCTION_APP_ORIGIN
);

export const passwordResetRedirectUrl = (origin: string) => new URL("/auth/reset-password", origin).toString();
