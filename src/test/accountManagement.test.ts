import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
      updateUser: mocks.updateUser,
    },
    functions: { invoke: mocks.invoke },
  },
}));

vi.mock("@/lib/nativeNotifications", () => ({
  disableNativeReminders: vi.fn(),
  isNativeNotificationsAvailable: vi.fn(() => false),
}));

import {
  AccountManagementError,
  changeAccountPassword,
  clearDeletedAccountFromDevice,
  deleteCurrentAccount,
  loadAccountDeletionPreview,
} from "@/lib/accountManagement";

describe("account management client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.signOut.mockResolvedValue({ error: null });
  });

  it("loads only the deletion preview from the server", async () => {
    mocks.invoke.mockResolvedValue({
      data: { ownedTeams: [], programInstanceIds: ["instance-1"] },
      error: null,
    });

    await expect(loadAccountDeletionPreview()).resolves.toEqual({
      ownedTeams: [],
      programInstanceIds: ["instance-1"],
    });
    expect(mocks.invoke).toHaveBeenCalledWith("delete-account", {
      body: { action: "inspect" },
    });
  });

  it("confirms the password with Auth and never sends it to the deletion function", async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    mocks.invoke.mockResolvedValue({ data: { deleted: true }, error: null });
    const transfers = { "team-1": "coach-2" };

    await deleteCurrentAccount("athlete@example.com", "secret-password", transfers);

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "athlete@example.com",
      password: "secret-password",
    });
    expect(mocks.invoke).toHaveBeenCalledWith("delete-account", {
      body: { action: "delete", transfers },
    });
    expect(JSON.stringify(mocks.invoke.mock.calls)).not.toContain("secret-password");
  });

  it("stops before invoking deletion when password confirmation fails", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: {},
      error: new Error("Invalid login credentials"),
    });

    await expect(
      deleteCurrentAccount("athlete@example.com", "wrong", {}),
    ).rejects.toMatchObject({
      code: "invalid_password",
    } satisfies Partial<AccountManagementError>);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("distinguishes a password service failure from a wrong password", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: {},
      error: { message: "Network request failed", status: 503 },
    });

    await expect(
      deleteCurrentAccount("athlete@example.com", "secret", {}),
    ).rejects.toMatchObject({
      code: "password_confirmation_failed",
    } satisfies Partial<AccountManagementError>);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("changes a password only through the authenticated Auth client", async () => {
    mocks.updateUser.mockResolvedValue({ data: {}, error: null });

    await changeAccountPassword("old-password", "new-password");

    expect(mocks.updateUser).toHaveBeenCalledWith({
      current_password: "old-password",
      password: "new-password",
    });
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("removes only local drafts that belong to the deleted account", async () => {
    window.localStorage.setItem("rewire:draft:journal:user-1:2026-07-14", "own journal");
    window.localStorage.setItem("rewire:draft:checkin:user-2:2026-07-14:training", "other checkin");
    window.localStorage.setItem("rewire:draft:questionnaire:instance-1:onboarding_v2", "own questionnaire");
    window.localStorage.setItem("rewire:draft:questionnaire:instance-2:onboarding_v2", "other questionnaire");
    window.localStorage.setItem("rewire:draft:questionnaire:onboarding_v2", "legacy questionnaire");

    await clearDeletedAccountFromDevice("user-1", ["instance-1"]);

    expect(window.localStorage.getItem("rewire:draft:journal:user-1:2026-07-14")).toBeNull();
    expect(window.localStorage.getItem("rewire:draft:questionnaire:instance-1:onboarding_v2")).toBeNull();
    expect(window.localStorage.getItem("rewire:draft:questionnaire:onboarding_v2")).toBeNull();
    expect(window.localStorage.getItem("rewire:draft:checkin:user-2:2026-07-14:training")).toBe("other checkin");
    expect(window.localStorage.getItem("rewire:draft:questionnaire:instance-2:onboarding_v2")).toBe("other questionnaire");
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
