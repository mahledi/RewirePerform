import { beforeEach, describe, expect, it, vi } from "vitest";

const capacitor = vi.hoisted(() => ({
  isNativePlatform: vi.fn(),
  getPlatform: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: capacitor,
}));

import { buildFeedbackTechnicalContext } from "@/lib/feedbackTechnicalContext";

describe("feedback technical context", () => {
  beforeEach(() => {
    capacitor.isNativePlatform.mockReturnValue(false);
    capacitor.getPlatform.mockReturnValue("web");
    window.history.replaceState({}, "", "/settings?private=value#fragment");
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
  });

  it("collects only coarse browser diagnostics without query values", () => {
    expect(buildFeedbackTechnicalContext()).toEqual({
      schema_version: "feedback-technical-context-v1",
      runtime: "browser",
      platform: "web",
      route: "/settings",
      online: true,
      app_version: "unknown",
    });
  });

  it("distinguishes native iOS without collecting a device identifier", () => {
    capacitor.isNativePlatform.mockReturnValue(true);
    capacitor.getPlatform.mockReturnValue("ios");

    const context = buildFeedbackTechnicalContext();
    expect(context).toMatchObject({ runtime: "native", platform: "ios" });
    expect(JSON.stringify(context)).not.toMatch(/email|name|user|device|token/iu);
  });

  it("marks an installed web app as standalone", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });

    expect(buildFeedbackTechnicalContext().runtime).toBe("standalone");
  });
});
