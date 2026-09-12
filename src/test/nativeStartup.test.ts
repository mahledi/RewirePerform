import { cleanup, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hide: vi.fn(),
  setStyle: vi.fn(),
  setBackgroundColor: vi.fn(),
  setOverlaysWebView: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true },
}));

vi.mock("@capacitor/splash-screen", () => ({
  SplashScreen: { hide: mocks.hide },
}));

vi.mock("@capacitor/status-bar", () => ({
  StatusBar: {
    setStyle: mocks.setStyle,
    setBackgroundColor: mocks.setBackgroundColor,
    setOverlaysWebView: mocks.setOverlaysWebView,
  },
  Style: { Light: "LIGHT" },
}));

import { configureNativeShell } from "@/lib/nativeApp";

describe("native startup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hide.mockResolvedValue(undefined);
    mocks.setStyle.mockResolvedValue(undefined);
    mocks.setBackgroundColor.mockResolvedValue(undefined);
    mocks.setOverlaysWebView.mockResolvedValue(undefined);
    document.body.innerHTML = '<div id="root"></div>';
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  it("keeps the native logo visible while the app loading shell is mounted", async () => {
    const root = document.getElementById("root")!;
    root.innerHTML = '<main data-app-loading-shell="true"></main>';
    const stop = configureNativeShell();

    await new Promise((resolve) => window.setTimeout(resolve, 50));

    expect(mocks.hide).not.toHaveBeenCalled();
    stop();
  });

  it("hides the native logo only after real app content has rendered", async () => {
    const root = document.getElementById("root")!;
    root.innerHTML = '<main data-app-loading-shell="true"></main>';
    const stop = configureNativeShell();

    root.innerHTML = '<main><h1>Dashboard</h1></main>';

    await waitFor(() => expect(mocks.hide).toHaveBeenCalledWith({ fadeOutDuration: 120 }));

    stop();
  });
});
