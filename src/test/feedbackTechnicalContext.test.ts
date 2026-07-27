import { beforeEach, describe, expect, it, vi } from "vitest";

const capacitor = vi.hoisted(() => ({
  isNativePlatform: vi.fn(),
  getPlatform: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: capacitor,
}));

import {
  buildFeedbackTechnicalContext,
  normalizeFeedbackAppVersion,
} from "@/lib/feedbackTechnicalContext";

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

  it("keeps only bounded semver-like client release labels", () => {
    expect(normalizeFeedbackAppVersion("1.2.3")).toBe("1.2.3");
    expect(normalizeFeedbackAppVersion("1.2.3+45")).toBe("1.2.3+45");
    expect(normalizeFeedbackAppVersion("1.2.3-beta")).toBe("unknown");
    expect(normalizeFeedbackAppVersion("customer:123e4567-e89b-12d3-a456-426614174000"))
      .toBe("unknown");
    expect(normalizeFeedbackAppVersion(undefined)).toBe("unknown");
  });
});
