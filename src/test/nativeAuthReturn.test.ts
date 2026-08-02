import { describe, expect, it } from "vitest";
import {
  nativeSignupContinuationRoute,
  parseNativeSignupReturn,
} from "@/lib/nativeAuthReturn";

const sessionUrl = (
  origin = "https://rewireperform.com",
  query = "flow=signup",
  fragment = "access_token=access-secret&refresh_token=refresh-secret&type=signup",
) => `${origin}/auth?${query}#${fragment}`;

describe("native signup auth return", () => {
  it("accepts only the production signup route and extracts a verified session", () => {
    expect(parseNativeSignupReturn(sessionUrl())).toEqual({
      kind: "session",
      accessToken: "access-secret",
      refreshToken: "refresh-secret",
      intent: "solo",
      teamCode: null,
      redirect: null,
    });

    for (const url of [
      sessionUrl("http://rewireperform.com"),
      sessionUrl("https://www.rewireperform.com"),
      "https://rewireperform.com/auth/reset-password?flow=signup#access_token=a&refresh_token=b&type=signup",
      sessionUrl("https://rewireperform.com", "flow=recovery"),
    ]) {
      expect(parseNativeSignupReturn(url)).toEqual({ kind: "ignore" });
    }
  });

  it("preserves a validated team context while continuing through minor authorization", () => {
    const parsed = parseNativeSignupReturn(sessionUrl(
      "https://rewireperform.com",
      "flow=signup&intent=join&team=abc123&redirect=%2Fadmin",
    ));
    expect(parsed).toMatchObject({
      kind: "session",
      intent: "join",
      teamCode: "ABC123",
      redirect: "/admin",
    });
    if (parsed.kind !== "session") throw new Error("expected session");

    const route = nativeSignupContinuationRoute(parsed);
    expect(route).toBe("/minor-consent?next=%2Fquestionnaire");
    expect(route).not.toContain("ABC123");
    expect(route).not.toContain("access-secret");
    expect(route).not.toContain("refresh-secret");
  });

  it("continues a solo signup directly in the native age flow", () => {
    const parsed = parseNativeSignupReturn(sessionUrl());
    if (parsed.kind !== "session") throw new Error("expected session");

    expect(nativeSignupContinuationRoute(parsed)).toBe(
      "/minor-consent?next=%2Fquestionnaire",
    );
  });

  it("supports a one-time auth-code return while rejecting mixed or malformed session data", () => {
    expect(parseNativeSignupReturn(
      "https://rewireperform.com/auth?flow=signup&code=one-time-code",
    )).toMatchObject({ kind: "code", authCode: "one-time-code" });

    for (const fragment of [
      "access_token=access-secret&type=signup",
      "refresh_token=refresh-secret&type=signup",
      "access_token=access-secret&refresh_token=refresh-secret&type=recovery",
    ]) {
      expect(parseNativeSignupReturn(sessionUrl(
        "https://rewireperform.com",
        "flow=signup",
        fragment,
      ))).toEqual({ kind: "error", errorCode: "invalid_callback" });
    }
  });

  it("rejects manipulated team and redirect values and retains safe Supabase link errors", () => {
    expect(parseNativeSignupReturn(sessionUrl(
      "https://rewireperform.com",
      "flow=signup&intent=join&team=ABC%2F12",
    ))).toEqual({ kind: "error", errorCode: "invalid_callback" });

    expect(parseNativeSignupReturn(sessionUrl(
      "https://rewireperform.com",
      "flow=signup&redirect=https%3A%2F%2Fevil.example",
    ))).toMatchObject({ kind: "session", redirect: null });

    expect(parseNativeSignupReturn(sessionUrl(
      "https://rewireperform.com",
      `flow=signup&redirect=${encodeURIComponent("/\\evil.example")}`,
    ))).toMatchObject({ kind: "session", redirect: null });

    expect(parseNativeSignupReturn(
      "https://rewireperform.com/auth?flow=signup#error=access_denied&error_code=otp_expired",
    )).toEqual({ kind: "error", errorCode: "otp_expired" });
  });
});
