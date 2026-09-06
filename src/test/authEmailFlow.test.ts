import { describe, expect, it } from "vitest";
import {
  authEmailRedirectUrl,
  authErrorMessage,
  MIN_ACCOUNT_PASSWORD_LENGTH,
  parseAuthLinkError,
  passwordResetRedirectUrl,
  publicAuthOrigin,
} from "@/lib/authEmailFlow";

describe("auth email flow helpers", () => {
  it("parses expired Supabase links without exposing provider text", () => {
    expect(parseAuthLinkError("", "#error=access_denied&error_code=otp_expired&error_description=internal")).toEqual({
      code: "otp_expired",
      message: "Dieser Sicherheitslink ist abgelaufen oder wurde bereits verwendet.",
    });
  });

  it("rejects unrelated query parameters as auth errors", () => {
    expect(parseAuthLinkError("?redirect=%2Fdashboard", "")).toBeNull();
  });

  it("maps sensitive provider errors to clear German copy", () => {
    expect(authErrorMessage({ code: "invalid_credentials" }, "fallback")).toBe("E-Mail oder Passwort ist nicht korrekt.");
    expect(authErrorMessage({ status: 429 }, "fallback")).toContain("warte kurz");
    expect(authErrorMessage({ code: "weak_password" }, "fallback")).toContain(String(MIN_ACCOUNT_PASSWORD_LENGTH));
  });

  it("builds the exact reset callback path", () => {
    expect(passwordResetRedirectUrl("https://rewireperform.com")).toBe("https://rewireperform.com/auth/reset-password?flow=recovery");
  });

  it("uses the registered Android app callback after Supabase confirmation redirects", () => {
    expect(authEmailRedirectUrl("https://rewireperform.com", "android").toString())
      .toBe("com.rewireperform.app://auth");
    expect(passwordResetRedirectUrl("https://rewireperform.com", "android"))
      .toBe("com.rewireperform.app://auth/reset-password?flow=recovery");

    for (const platform of ["ios", "web"]) {
      expect(authEmailRedirectUrl("https://rewireperform.com", platform).toString())
        .toBe("https://rewireperform.com/auth");
      expect(passwordResetRedirectUrl("https://rewireperform.com", platform))
        .toBe("https://rewireperform.com/auth/reset-password?flow=recovery");
    }
  });

  it("keeps browser origins but never emits an internal Capacitor URL into email", () => {
    expect(publicAuthOrigin({ origin: "https://staging.rewireperform.com", protocol: "https:" }))
      .toBe("https://staging.rewireperform.com");
    expect(publicAuthOrigin({ origin: "capacitor://rewireperform.com", protocol: "capacitor:" }))
      .toBe("https://rewireperform.com");
  });
});
