import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NativeAuthReturnHandler from "@/components/auth/NativeAuthReturnHandler";

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

describe("native auth return handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  it("handles an already-open app, preserves the team code and ignores callback replay", async () => {
    renderHandler();
    await waitFor(() => expect(mocks.appUrlOpen).toBeTypeOf("function"));
    const url = nativeSessionUrl("flow=signup&intent=join&team=abc123");

    await act(async () => {
      mocks.appUrlOpen?.({ url });
      mocks.appUrlOpen?.({ url });
    });

    await waitFor(() => expect(mocks.setSession).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/auth?redirect=%2Fquestionnaire&intent=join&team=ABC123",
    );
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
