import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  beginPostSignupOnboarding,
  clearPostSignupOnboarding,
  completePostSignupOnboarding,
  clearPostAuthorizationTeamJoin,
  pendingPostAuthorizationTeamCode,
  pendingPostSignupIntent,
  postSignupOnboardingStorageKey,
  postSignupWelcomeRoute,
  queuePostAuthorizationTeamJoin,
} from "@/lib/postSignupOnboarding";

describe("post-signup onboarding state", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    clearPostSignupOnboarding("user-1");
  });

  it("stores pending state per user and preserves the selected signup path", () => {
    beginPostSignupOnboarding("user-1", "join");
    expect(pendingPostSignupIntent("user-1")).toBe("join");
    expect(pendingPostSignupIntent("user-2")).toBeNull();
    expect(postSignupWelcomeRoute("join")).toBe("/welcome?flow=post-signup&intent=join");
  });

  it("never downgrades a completed introduction when an email callback is replayed", () => {
    beginPostSignupOnboarding("user-1", "solo");
    completePostSignupOnboarding("user-1", "solo");
    beginPostSignupOnboarding("user-1", "join");
    expect(pendingPostSignupIntent("user-1")).toBeNull();
  });

  it("queues and clears a normalized team code without changing pending introduction state", () => {
    beginPostSignupOnboarding("user-1", "join");
    expect(queuePostAuthorizationTeamJoin("user-1", " abc123 ", true)).toBe(true);
    expect(pendingPostAuthorizationTeamCode("user-1")).toBe("ABC123");
    expect(pendingPostSignupIntent("user-1")).toBe("join");

    completePostSignupOnboarding("user-1", "join");
    expect(pendingPostAuthorizationTeamCode("user-1")).toBe("ABC123");
    clearPostAuthorizationTeamJoin("user-1");
    expect(pendingPostAuthorizationTeamCode("user-1")).toBeNull();
    expect(pendingPostSignupIntent("user-1")).toBeNull();
  });

  it("rejects malformed queued team codes", () => {
    expect(queuePostAuthorizationTeamJoin("user-1", "BAD/12", true)).toBe(false);
    expect(pendingPostAuthorizationTeamCode("user-1")).toBeNull();
  });

  it("uses session storage when persistent storage is unavailable", () => {
    const originalSetItem = Storage.prototype.setItem;
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (this === window.localStorage) throw new DOMException("Storage unavailable");
      return originalSetItem.call(this, key, value);
    });

    beginPostSignupOnboarding("user-1", "solo");
    expect(window.sessionStorage.getItem(postSignupOnboardingStorageKey("user-1"))).toContain('"status":"pending"');
    expect(pendingPostSignupIntent("user-1")).toBe("solo");
    setItem.mockRestore();
  });

  it("survives a SecurityError while WKWebView exposes persistent storage", () => {
    const localStorageDescriptor = Object.getOwnPropertyDescriptor(window, "localStorage");
    expect(localStorageDescriptor).toBeDefined();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get: () => {
        throw new DOMException("Storage access denied", "SecurityError");
      },
    });

    try {
      beginPostSignupOnboarding("user-1", "join");
      expect(pendingPostSignupIntent("user-1")).toBe("join");
      expect(queuePostAuthorizationTeamJoin("user-1", "ABC123", true)).toBe(true);
      expect(pendingPostAuthorizationTeamCode("user-1")).toBe("ABC123");
    } finally {
      Object.defineProperty(window, "localStorage", localStorageDescriptor!);
    }
  });

  it("keeps completion authoritative when persistent storage still contains an older pending marker", () => {
    beginPostSignupOnboarding("user-1", "solo");
    const originalSetItem = Storage.prototype.setItem;
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (this === window.localStorage) throw new DOMException("Storage quota exceeded");
      return originalSetItem.call(this, key, value);
    });

    completePostSignupOnboarding("user-1", "solo");
    expect(window.localStorage.getItem(postSignupOnboardingStorageKey("user-1"))).toContain('"status":"pending"');
    expect(window.sessionStorage.getItem(postSignupOnboardingStorageKey("user-1"))).toContain('"status":"complete"');
    expect(pendingPostSignupIntent("user-1")).toBeNull();
    setItem.mockRestore();
  });

  it("keeps a queued team code after reload when an older local completion could not be overwritten", async () => {
    const key = postSignupOnboardingStorageKey("user-1");
    window.localStorage.setItem(
      key,
      JSON.stringify({ version: "1", status: "complete", intent: "solo" }),
    );
    const originalSetItem = Storage.prototype.setItem;
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      storageKey: string,
      value: string,
    ) {
      if (this === window.localStorage) throw new DOMException("Storage quota exceeded");
      return originalSetItem.call(this, storageKey, value);
    });

    expect(queuePostAuthorizationTeamJoin("user-1", "ABC123", false)).toBe(true);
    expect(window.sessionStorage.getItem(key)).toContain('"teamCode":"ABC123"');

    vi.resetModules();
    const reloadedOnboarding = await import("@/lib/postSignupOnboarding");
    expect(reloadedOnboarding.pendingPostAuthorizationTeamCode("user-1")).toBe("ABC123");
    expect(reloadedOnboarding.pendingPostSignupIntent("user-1")).toBeNull();
    setItem.mockRestore();
  });

  it("does not resurrect a cleared team code after reload when the stale local marker could not be overwritten", async () => {
    queuePostAuthorizationTeamJoin("user-1", "ABC123", false);
    const key = postSignupOnboardingStorageKey("user-1");
    const originalSetItem = Storage.prototype.setItem;
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      storageKey: string,
      value: string,
    ) {
      if (this === window.localStorage) throw new DOMException("Storage quota exceeded");
      return originalSetItem.call(this, storageKey, value);
    });

    clearPostAuthorizationTeamJoin("user-1");
    expect(window.localStorage.getItem(key)).toContain('"teamCode":"ABC123"');
    expect(pendingPostAuthorizationTeamCode("user-1")).toBeNull();

    vi.resetModules();
    const reloadedOnboarding = await import("@/lib/postSignupOnboarding");
    expect(reloadedOnboarding.pendingPostAuthorizationTeamCode("user-1")).toBeNull();
    setItem.mockRestore();
  });

  it("clears both persistent and session markers during account cleanup", () => {
    beginPostSignupOnboarding("user-1", "solo");
    window.sessionStorage.setItem(
      postSignupOnboardingStorageKey("user-1"),
      JSON.stringify({ version: "1", status: "pending", intent: "solo" }),
    );
    clearPostSignupOnboarding("user-1");
    expect(window.localStorage.getItem(postSignupOnboardingStorageKey("user-1"))).toBeNull();
    expect(window.sessionStorage.getItem(postSignupOnboardingStorageKey("user-1"))).toBeNull();
    expect(pendingPostSignupIntent("user-1")).toBeNull();
  });
});
