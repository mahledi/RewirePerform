const PREFIX = "rewire:draft:";

export function readLocalDraft<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${PREFIX}${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeLocalDraft<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // Local draft recovery is best-effort. Server persistence still runs.
  }
}

export function clearLocalDraft(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`${PREFIX}${key}`);
  } catch {
    // Best-effort cleanup.
  }
}
