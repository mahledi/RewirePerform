import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NativeAuthReturnHandler from "@/components/auth/NativeAuthReturnHandler";
import {
  clearPostSignupOnboarding,
  pendingPostAuthorizationTeamCode,
  pendingPostSignupIntent,
} from "@/lib/postSignupOnboarding";

const mocks = vi.hoisted(() => ({
  appUrlOpen: null as ((event: { url: string }) => void) | null,
  exchangeCodeForSession: vi.fn(),
  getLaunchUrl: vi.fn(),
  removeListener: vi.fn(),
  setSession: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true },
}));

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn(async (event: string, listener: (value: { url: string }) => void) => {
      if (event === "appUrlOpen") mocks.appUrlOpen = listener;
      return { remove: mocks.removeListener };
    }),
    getLaunchUrl: mocks.getLaunchUrl,
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      setSession: mocks.setSession,
    },
  },
}));

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</output>;
};

const renderHandler = () => render(
  <MemoryRouter initialEntries={["/"]}>
    <NativeAuthReturnHandler />
    <LocationProbe />
  </MemoryRouter>,
);

const nativeSessionUrl = (query = "flow=signup") =>
  `https://rewireperform.com/auth?${query}#access_token=access-secret&refresh_token=refresh-secret&type=signup`;

const nativeRecoveryUrl = (credentials = "#access_token=recovery-access&refresh_token=recovery-refresh&type=recovery") =>
  `com.rewireperform.app://auth/reset-password?flow=recovery${credentials}`;

const iosRecoveryUrl = (credentials = "#access_token=ios-recovery-access&refresh_token=ios-recovery-refresh&type=recovery") =>
  `https://rewireperform.com/auth/reset-password?flow=recovery${credentials}`;

describe("native auth return handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    clearPostSignupOnboarding("athlete-1");
    mocks.appUrlOpen = null;
    mocks.getLaunchUrl.mockResolvedValue(undefined);
    mocks.setSession.mockResolvedValue({ data: { session: { user: { id: "athlete-1" } } }, error: null });
    mocks.exchangeCodeForSession.mockResolvedValue({ data: { session: { user: { id: "athlete-1" } } }, error: null });
  });

  it("restores a cold-start session and removes all credentials from the local route", async () => {
    mocks.getLaunchUrl.mockResolvedValue({ url: nativeSessionUrl() });
    renderHandler();

    await waitFor(() => expect(mocks.setSession).toHaveBeenCalledWith({
      access_token: "access-secret",
      refresh_token: "refresh-secret",
    }));
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/minor-consent?next=%2Fquestionnaire",
    );
    expect(screen.getByTestId("location")).not.toHaveTextContent("secret");
    expect(pendingPostSignupIntent("athlete-1")).toBe("solo");
  });

  it("opens a cold-start Android password recovery inside the app without exposing credentials", async () => {
    mocks.getLaunchUrl.mockResolvedValue({ url: nativeRecoveryUrl() });
    renderHandler();

    await waitFor(() => expect(mocks.setSession).toHaveBeenCalledWith({
      access_token: "recovery-access",
      refresh_token: "recovery-refresh",
    }));
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/auth/reset-password?verified=1",
    );
    expect(screen.getByTestId("location")).not.toHaveTextContent("recovery-access");
    expect(pendingPostSignupIntent("athlete-1")).toBeNull();
  });

  it("opens a cold-start iOS password recovery universal link inside the app", async () => {
    mocks.getLaunchUrl.mockResolvedValue({ url: iosRecoveryUrl() });
    renderHandler();

    await waitFor(() => expect(mocks.setSession).toHaveBeenCalledWith({
      access_token: "ios-recovery-access",
      refresh_token: "ios-recovery-refresh",
    }));
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/auth/reset-password?verified=1",
    );
    expect(screen.getByTestId("location")).not.toHaveTextContent("ios-recovery-access");
    expect(pendingPostSignupIntent("athlete-1")).toBeNull();
  });

  it("handles a warm Android recovery code exactly once and never starts signup onboarding", async () => {
    renderHandler();
    await waitFor(() => expect(mocks.appUrlOpen).toBeTypeOf("function"));
    const url = nativeRecoveryUrl("&code=recovery-code");

    await act(async () => {
      mocks.appUrlOpen?.({ url });
      mocks.appUrlOpen?.({ url });
    });

    await waitFor(() => expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("recovery-code"));
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/auth/reset-password?verified=1",
    );
    expect(pendingPostSignupIntent("athlete-1")).toBeNull();
  });

  it("fails closed for a crossed Android recovery callback", async () => {
    mocks.getLaunchUrl.mockResolvedValue({
      url: nativeRecoveryUrl("#access_token=private&refresh_token=private&type=signup"),
    });
    renderHandler();

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(
      "/auth/reset-password?error_code=invalid_callback",
    ));
    expect(mocks.setSession).not.toHaveBeenCalled();
    expect(screen.getByTestId("location")).not.toHaveTextContent("private");
  });

  it("handles an already-open app, queues the team code and ignores callback replay", async () => {
    renderHandler();
    await waitFor(() => expect(mocks.appUrlOpen).toBeTypeOf("function"));
    const url = nativeSessionUrl("flow=signup&intent=join&team=abc123");

    await act(async () => {
      mocks.appUrlOpen?.({ url });
      mocks.appUrlOpen?.({ url });
    });

    await waitFor(() => expect(mocks.setSession).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/minor-consent?next=%2Fquestionnaire",
    );
    expect(pendingPostSignupIntent("athlete-1")).toBe("join");
    expect(pendingPostAuthorizationTeamCode("athlete-1")).toBe("ABC123");
  });

  it("opens a cold-start team invite without treating it as an auth callback", async () => {
    mocks.getLaunchUrl.mockResolvedValue({ url: "https://rewireperform.com/join?team=abc123" });
    renderHandler();

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(
      "/auth?mode=signup&intent=join&team=ABC123",
    ));
    expect(mocks.setSession).not.toHaveBeenCalled();
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(mocks.getLaunchUrl).toHaveBeenCalledTimes(1);
  });

  it("opens a cold-start personal coach invitation without changing the auth session", async () => {
    const token = "a".repeat(64);
    mocks.getLaunchUrl.mockResolvedValue({
      url: `https://rewireperform.com/organization/invite?token=${token}`,
    });
    renderHandler();

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(
      `/organization/invite?token=${token}`,
    ));
    expect(mocks.setSession).not.toHaveBeenCalled();
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("opens a cold-start shareable Co-Coach code without changing the auth session", async () => {
    const code = "A1B2C3D4E5F60718293A";
    mocks.getLaunchUrl.mockResolvedValue({
      url: `https://rewireperform.com/organization/invite?coach=${code}`,
    });
    renderHandler();

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(
      `/organization/invite?coach=${code}`,
    ));
    expect(mocks.setSession).not.toHaveBeenCalled();
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("fails closed for a malformed personal coach invitation", async () => {
    renderHandler();
    await waitFor(() => expect(mocks.appUrlOpen).toBeTypeOf("function"));

    await act(async () => {
      mocks.appUrlOpen?.({
        url: `https://rewireperform.com/organization/invite?token=${"a".repeat(64)}&redirect=https://evil.example`,
      });
    });

    expect(screen.getByTestId("location")).toHaveTextContent("/organization/invite");
    expect(screen.getByTestId("location")).not.toHaveTextContent("evil");
    expect(mocks.setSession).not.toHaveBeenCalled();
  });

  it("does not reopen post-signup onboarding after the athlete completed the pre-auth flight", async () => {
    mocks.getLaunchUrl.mockResolvedValue({ url: nativeSessionUrl("flow=signup&intro=athlete") });
    renderHandler();

    await waitFor(() => expect(mocks.setSession).toHaveBeenCalledTimes(1));
    expect(pendingPostSignupIntent("athlete-1")).toBeNull();
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/minor-consent?next=%2Fquestionnaire",
    );
  });

  it("does not replay the cold-start invite when its own navigation changes the route", async () => {
    mocks.getLaunchUrl.mockResolvedValue({ url: "https://rewireperform.com/join?team=abc123" });
    renderHandler();

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(
      "/auth?mode=signup&intent=join&team=ABC123",
    ));
    await act(async () => Promise.resolve());

    expect(mocks.getLaunchUrl).toHaveBeenCalledTimes(1);
    expect(mocks.setSession).not.toHaveBeenCalled();
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("opens a team invite while the app is already running without touching the auth session", async () => {
    renderHandler();
    await waitFor(() => expect(mocks.appUrlOpen).toBeTypeOf("function"));

    await act(async () => {
      mocks.appUrlOpen?.({ url: "https://rewireperform.com/join?team=abc123" });
    });

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/auth?mode=signup&intent=join&team=ABC123",
    );
    expect(mocks.setSession).not.toHaveBeenCalled();
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("fails closed for a malformed team invite without exposing its payload", async () => {
    renderHandler();
    await waitFor(() => expect(mocks.appUrlOpen).toBeTypeOf("function"));

    await act(async () => {
      mocks.appUrlOpen?.({ url: "https://rewireperform.com/join?team=BAD%2F12" });
    });

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/auth?mode=signup&intent=join&invite_error=invalid",
    );
    expect(screen.getByTestId("location")).not.toHaveTextContent("BAD");
    expect(mocks.setSession).not.toHaveBeenCalled();
  });

  it("fails closed for manipulated callbacks without exposing their payload", async () => {
    renderHandler();
    await waitFor(() => expect(mocks.appUrlOpen).toBeTypeOf("function"));

    await act(async () => {
      mocks.appUrlOpen?.({
        url: "https://rewireperform.com/auth?flow=signup&intent=join&team=BAD%2F12#access_token=private&refresh_token=private&type=signup",
      });
    });

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(
      "/auth?flow=signup&error_code=invalid_callback",
    ));
    expect(mocks.setSession).not.toHaveBeenCalled();
    expect(screen.getByTestId("location")).not.toHaveTextContent("private");
  });

  it("allows the user to retry the same callback after a transient session failure", async () => {
    mocks.setSession
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce({ data: { session: { user: { id: "athlete-1" } } }, error: null });
    renderHandler();
    await waitFor(() => expect(mocks.appUrlOpen).toBeTypeOf("function"));
    const url = nativeSessionUrl();

    await act(async () => {
      mocks.appUrlOpen?.({ url });
    });
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(
      "/auth?flow=signup&error_code=invalid_callback",
    ));

    await act(async () => {
      mocks.appUrlOpen?.({ url });
    });

    await waitFor(() => expect(mocks.setSession).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/minor-consent?next=%2Fquestionnaire",
    );
  });
});
