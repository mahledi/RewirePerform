export const POST_SIGNUP_ONBOARDING_VERSION = "1";
export const POST_SIGNUP_ONBOARDING_STORAGE_PREFIX = "rewireperform:post-signup-onboarding";

export type PostSignupIntent = "solo" | "join";

type PostSignupOnboardingState = {
  version: typeof POST_SIGNUP_ONBOARDING_VERSION;
  status: "pending" | "complete";
  intent: PostSignupIntent;
  teamCode?: string;
  revision: number;
};

type PostSignupOnboardingWrite = Omit<PostSignupOnboardingState, "revision">;

const memoryState = new Map<string, PostSignupOnboardingState>();

export const postSignupOnboardingStorageKey = (userId: string) =>
  `${POST_SIGNUP_ONBOARDING_STORAGE_PREFIX}:${encodeURIComponent(userId)}`;

const parseState = (raw: string | null): PostSignupOnboardingState | null => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PostSignupOnboardingState>;
    if (
      value.version !== POST_SIGNUP_ONBOARDING_VERSION
      || (value.status !== "pending" && value.status !== "complete")
      || (value.intent !== "solo" && value.intent !== "join")
      || (value.teamCode !== undefined && !/^[A-Z0-9]{6}$/u.test(value.teamCode))
    ) {
      return null;
    }
    return {
      version: value.version,
      status: value.status,
      intent: value.intent,
      ...(value.teamCode ? { teamCode: value.teamCode } : {}),
      revision: Number.isSafeInteger(value.revision) && Number(value.revision) >= 0
        ? Number(value.revision)
        : 0,
    };
  } catch {
    return null;
  }
};

const readStorage = (resolveStorage: () => Storage, key: string) => {
  try {
    return parseState(resolveStorage().getItem(key));
  } catch {
    return null;
  }
};

const readCandidates = (key: string) => [
  memoryState.get(key) ?? null,
  readStorage(() => window.localStorage, key),
  readStorage(() => window.sessionStorage, key),
];

const readState = (userId: string): PostSignupOnboardingState | null => {
  if (!userId) return null;
  const key = postSignupOnboardingStorageKey(userId);
  const candidates = readCandidates(key);
  const authoritativeStatus = candidates.some((value) => value?.status === "complete")
    ? "complete"
    : "pending";
  const authoritativeCandidates = candidates.filter(
    (value): value is PostSignupOnboardingState => value?.status === authoritativeStatus,
  );
  return authoritativeCandidates.reduce<PostSignupOnboardingState | null>(
    (latest, value) => !latest || value.revision > latest.revision ? value : latest,
    null,
  );
};

const writeState = (userId: string, nextValue: PostSignupOnboardingWrite) => {
  if (!userId) return;
  const key = postSignupOnboardingStorageKey(userId);
  const revision = readCandidates(key).reduce(
    (latest, value) => Math.max(latest, value?.revision ?? 0),
    0,
  ) + 1;
  const value: PostSignupOnboardingState = { ...nextValue, revision };
  const serialized = JSON.stringify(value);
  memoryState.set(key, value);
  try { window.localStorage.setItem(key, serialized); } catch { /* fall through */ }
  try { window.sessionStorage.setItem(key, serialized); } catch {
    // The in-memory marker still prevents loops in the current app process.
  }
};

export const beginPostSignupOnboarding = (userId: string, intent: PostSignupIntent) => {
  const current = readState(userId);
  if (current?.status === "complete") return;
  writeState(userId, {
    version: POST_SIGNUP_ONBOARDING_VERSION,
    status: "pending",
    intent,
  });
};

export const queuePostAuthorizationTeamJoin = (
  userId: string,
  rawCode: string,
  requiresOnboarding: boolean,
) => {
  const teamCode = rawCode.trim().toUpperCase();
  if (!userId || !/^[A-Z0-9]{6}$/u.test(teamCode)) return false;
  const current = readState(userId);
  writeState(userId, {
    version: POST_SIGNUP_ONBOARDING_VERSION,
    status: current?.status === "pending" || (requiresOnboarding && current?.status !== "complete")
      ? "pending"
      : "complete",
    intent: "join",
    teamCode,
  });
  return true;
};

export const pendingPostAuthorizationTeamCode = (userId: string) =>
  readState(userId)?.teamCode ?? null;

export const clearPostAuthorizationTeamJoin = (userId: string) => {
  const current = readState(userId);
  if (!current?.teamCode) return;
  writeState(userId, {
    version: current.version,
    status: current.status,
    intent: current.intent,
  });
};

export const pendingPostSignupIntent = (userId: string): PostSignupIntent | null => {
  const current = readState(userId);
  return current?.status === "pending" ? current.intent : null;
};

export const completePostSignupOnboarding = (userId: string, intent: PostSignupIntent) => {
  const current = readState(userId);
  if (current?.status === "complete" && current.intent === intent) return;
  writeState(userId, {
    version: POST_SIGNUP_ONBOARDING_VERSION,
    status: "complete",
    intent,
    ...(current?.teamCode ? { teamCode: current.teamCode } : {}),
  });
};

export const clearPostSignupOnboarding = (userId: string) => {
  if (!userId) return;
  const key = postSignupOnboardingStorageKey(userId);
  memoryState.delete(key);
  try { window.localStorage.removeItem(key); } catch { /* best effort */ }
  try { window.sessionStorage.removeItem(key); } catch { /* best effort */ }
};

export const postSignupWelcomeRoute = (intent: PostSignupIntent) =>
  `/welcome?flow=post-signup&intent=${intent}`;
