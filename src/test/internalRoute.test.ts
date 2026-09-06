import { describe, expect, it } from "vitest";
import { safeInternalRoute, safeInternalUrl } from "@/lib/internalRoute";

describe("safe internal route", () => {
  it("accepts local paths with query parameters and fragments", () => {
    expect(safeInternalRoute("/progress?view=week#latest")).toBe("/progress?view=week#latest");
  });

  it.each([
    "https://evil.example/",
    "//evil.example/",
    "/\\evil.example",
    "/%5cevil.example",
    "/%2fevil.example",
    "/\u0000dashboard",
  ])("rejects an external or ambiguously normalized route: %s", (value) => {
    expect(safeInternalRoute(value)).toBeNull();
  });

  it("rejects blocked sensitive path prefixes", () => {
    expect(safeInternalRoute("/guardian/decision#token=secret", {
      blockedPathPrefixes: ["/guardian/decision"],
    })).toBeNull();
  });

  it.each([
    "https://evil.example/",
    "//evil.example/",
    "/\\evil.example",
    "/%5cevil.example",
    "/%2fevil.example",
  ])("falls back to the app origin for an unsafe notification target: %s", (value) => {
    expect(safeInternalUrl(value, "https://rewireperform.com")).toBe(
      "https://rewireperform.com/",
    );
  });

  it("builds an absolute same-origin URL for a safe notification target", () => {
    expect(
      safeInternalUrl("/progress?view=week#latest", "https://rewireperform.com"),
    ).toBe("https://rewireperform.com/progress?view=week#latest");
  });
});
