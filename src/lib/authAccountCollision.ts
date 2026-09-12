export const EXISTING_ACCOUNT_NOTICE = "Für diese E-Mail besteht möglicherweise bereits ein Konto.";

type SignUpUserLike = {
  identities?: unknown[] | null;
} | null;

type AuthErrorLike = {
  message?: string;
  code?: string;
} | null;

const EXISTING_ACCOUNT_ERROR_CODES = new Set([
  "email_exists",
  "user_already_exists",
  "user_already_registered",
]);

/**
 * Supabase deliberately obscures repeated sign-ups when email confirmation is
 * enabled. Depending on the Auth version, that is either an explicit error or
 * a fake user without identities. Keep the resulting copy neutral so the
 * public form does not become an account-enumeration endpoint.
 */
export const isObscuredExistingAccountSignUp = (
  user: SignUpUserLike,
  error: AuthErrorLike,
): boolean => {
  const normalizedCode = error?.code?.trim().toLowerCase() ?? "";
  if (EXISTING_ACCOUNT_ERROR_CODES.has(normalizedCode)) return true;

  const normalizedMessage = error?.message?.trim().toLowerCase() ?? "";
  if (
    normalizedMessage.includes("already registered")
    || normalizedMessage.includes("already exists")
    || normalizedMessage.includes("already been registered")
    || normalizedMessage.includes("user already registered")
  ) return true;

  return Boolean(user && Array.isArray(user.identities) && user.identities.length === 0);
};
