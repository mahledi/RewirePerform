import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { disableNativeReminders, isNativeNotificationsAvailable } from "@/lib/nativeNotifications";
import { clearPostSignupOnboarding } from "@/lib/postSignupOnboarding";

export interface AccountDeletionCandidate {
  userId: string;
  fullName: string;
}

export interface AccountDeletionTeam {
  id: string;
  name: string;
  archived: boolean;
  candidates: AccountDeletionCandidate[];
}

export interface AccountDeletionPreview {
  ownedTeams: AccountDeletionTeam[];
  programInstanceIds: string[];
}

export type AccountDeletionTransfers = Record<string, string>;

const LEGACY_QUESTIONNAIRE_DRAFT_KEY = "rewire:draft:questionnaire:onboarding_v2";

export class AccountManagementError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AccountManagementError";
    this.code = code;
  }
}

const functionErrorCode = async (error: unknown) => {
  if (!(error instanceof FunctionsHttpError)) return null;
  try {
    const payload = await error.context.json() as { error?: unknown };
    return typeof payload.error === "string" ? payload.error : null;
  } catch {
    return null;
  }
};

const accountError = (code: string | null) => {
  if (code === "team_transfer_required") {
    return new AccountManagementError(code, "Die Teamverwaltung muss zuerst vollständig übertragen werden.");
  }
  if (code === "recent_auth_required") {
    return new AccountManagementError(code, "Bitte bestätige dein Passwort erneut.");
  }
  if (code === "unauthorized") {
    return new AccountManagementError(code, "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.");
  }
  return new AccountManagementError(
    code ?? "account_service_unavailable",
    "Der Vorgang konnte gerade nicht abgeschlossen werden. Deine Daten wurden nicht verändert.",
  );
};

export const loadAccountDeletionPreview = async (): Promise<AccountDeletionPreview> => {
  const { data, error } = await supabase.functions.invoke<AccountDeletionPreview>("delete-account", {
    body: { action: "inspect" },
  });
  if (error) throw accountError(await functionErrorCode(error));
  if (
    !data ||
    !Array.isArray(data.ownedTeams) ||
    !Array.isArray(data.programInstanceIds) ||
    !data.programInstanceIds.every((id) => typeof id === "string")
  ) {
    throw accountError(null);
  }
  return data;
};

export const changeAccountPassword = async (
  currentPassword: string,
  newPassword: string,
) => {
  const { error } = await supabase.auth.updateUser({
    current_password: currentPassword,
    password: newPassword,
  });
  if (!error) return;

  const normalized = error.message.toLowerCase();
  if (normalized.includes("password") && (normalized.includes("incorrect") || normalized.includes("invalid"))) {
    throw new AccountManagementError("invalid_password", "Das aktuelle Passwort ist nicht korrekt.");
  }
  if (normalized.includes("weak") || normalized.includes("short")) {
    throw new AccountManagementError("weak_password", "Bitte verwende ein stärkeres Passwort.");
  }
  throw new AccountManagementError("password_change_failed", "Das Passwort konnte gerade nicht geändert werden.");
};

export const deleteCurrentAccount = async (
  email: string,
  currentPassword: string,
  transfers: AccountDeletionTransfers,
) => {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (signInError) {
    const authError = signInError as { code?: string; message?: string; status?: number };
    const normalized = authError.message?.toLowerCase() ?? "";
    if (
      authError.code === "invalid_credentials" ||
      normalized.includes("invalid login credentials") ||
      normalized.includes("invalid password")
    ) {
      throw new AccountManagementError("invalid_password", "Das aktuelle Passwort ist nicht korrekt.");
    }
    if (authError.status === 429 || authError.code?.includes("rate_limit")) {
      throw new AccountManagementError(
        "password_rate_limited",
        "Zu viele Versuche. Bitte warte kurz und versuche es erneut.",
      );
    }
    throw new AccountManagementError(
      "password_confirmation_failed",
      "Das Passwort konnte gerade nicht geprüft werden. Deine Daten wurden nicht verändert.",
    );
  }

  const { data, error } = await supabase.functions.invoke<{ deleted?: boolean }>("delete-account", {
    body: { action: "delete", transfers },
  });
  if (error) throw accountError(await functionErrorCode(error));
  if (data?.deleted !== true) throw accountError(null);
};

const removeLocalAccountKeys = (userId: string, programInstanceIds: string[]) => {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    const draftPrefix = "rewire:draft:";
    const questionnaireInstancePrefixes = programInstanceIds.map(
      (instanceId) => `${draftPrefix}questionnaire:${instanceId}:`,
    );
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key) continue;
      const belongsToDeletedAccount =
        key.startsWith(`${draftPrefix}journal:${userId}:`) ||
        key.startsWith(`${draftPrefix}checkin:${userId}:`) ||
        key.startsWith(`${draftPrefix}questionnaire:${userId}:`) ||
        key === LEGACY_QUESTIONNAIRE_DRAFT_KEY ||
        questionnaireInstancePrefixes.some((prefix) => key.startsWith(prefix));
      if (
        key === "cached_user_role" ||
        key === "cached_user_id" ||
        key === `cached_user_role:${userId}` ||
        key === `rewire:pending_data_contribution_consent:${userId}` ||
        key === `rewire_native_reminders:${userId}` ||
        belongsToDeletedAccount ||
        key.startsWith(`missed-day-review:${userId}:`)
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));

    if (window.localStorage.getItem("rewire_native_reminders_owner") === userId) {
      window.localStorage.removeItem("rewire_native_reminders_owner");
    }
  } catch {
    // Device cleanup is best-effort after the server has confirmed deletion.
  }
};

const unsubscribeBrowserPush = async () => {
  if (
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator) ||
    typeof PushManager === "undefined"
  ) {
    return;
  }
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  await subscription?.unsubscribe();
};

export const clearDeletedAccountFromDevice = async (
  userId: string,
  programInstanceIds: string[] = [],
) => {
  try {
    if (isNativeNotificationsAvailable()) await disableNativeReminders(userId);
    else await unsubscribeBrowserPush();
  } catch {
    // The account is already gone server-side; local cleanup must not hide success.
  }

  removeLocalAccountKeys(userId, programInstanceIds);
  clearPostSignupOnboarding(userId);
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
};
