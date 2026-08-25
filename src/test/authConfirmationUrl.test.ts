import { describe, expect, it } from "vitest";
import {
  hasSafeAndroidConfirmationTarget,
  parseAuthConfirmationUrl,
  shouldAutoOpenAndroidConfirmation,
} from "@/lib/authConfirmationUrl";

const supabaseOrigin = "https://bqsbxesmybthwtxmowfz.supabase.co";

describe("prefetch-safe auth confirmation", () => {
  it("preserves the complete Supabase recovery URL and its native redirect", () => {
    const providerUrl = `${supabaseOrigin}/auth/v1/verify?token=hash&type=recovery&redirect_to=com.rewireperform.app%3A%2F%2Fauth%2Freset-password%3Fflow%3Drecovery`;

    expect(parseAuthConfirmationUrl(`?confirmation_url=${providerUrl}`, supabaseOrigin)).toEqual({
      url: providerUrl,
      type: "recovery",
    });
  });

  it("accepts signup confirmation but rejects foreign and malformed targets", () => {
    const signupUrl = `${supabaseOrigin}/auth/v1/verify?token=hash&type=signup&redirect_to=https%3A%2F%2Frewireperform.com%2Fauth`;
    expect(parseAuthConfirmationUrl(`?confirmation_url=${signupUrl}`, supabaseOrigin)?.type).toBe("confirmation");
    expect(parseAuthConfirmationUrl("?confirmation_url=https://example.com/auth/v1/verify?token=hash&type=recovery", supabaseOrigin)).toBeNull();
    expect(parseAuthConfirmationUrl(`?confirmation_url=${supabaseOrigin}/auth/v1/verify?type=recovery`, supabaseOrigin)).toBeNull();
  });

  it("auto-opens only exact Android auth callbacks after validation", () => {
    const androidSignup = `${supabaseOrigin}/auth/v1/verify?token=hash&type=signup&redirect_to=com.rewireperform.app%3A%2F%2Fauth%3Fflow%3Dsignup%26intro%3Dathlete`;
    const androidRecovery = `${supabaseOrigin}/auth/v1/verify?token=hash&type=recovery&redirect_to=com.rewireperform.app%3A%2F%2Fauth%2Freset-password%3Fflow%3Drecovery`;
    const webSignup = `${supabaseOrigin}/auth/v1/verify?token=hash&type=signup&redirect_to=https%3A%2F%2Frewireperform.com%2Fauth`;
    const crossed = `${supabaseOrigin}/auth/v1/verify?token=hash&type=signup&redirect_to=com.rewireperform.app%3A%2F%2Fauth%2Freset-password%3Fflow%3Drecovery`;

    expect(hasSafeAndroidConfirmationTarget(
      parseAuthConfirmationUrl(`?confirmation_url=${androidSignup}`, supabaseOrigin)!,
    )).toBe(true);
    expect(hasSafeAndroidConfirmationTarget(
      parseAuthConfirmationUrl(`?confirmation_url=${androidRecovery}`, supabaseOrigin)!,
    )).toBe(true);
    expect(hasSafeAndroidConfirmationTarget(
      parseAuthConfirmationUrl(`?confirmation_url=${webSignup}`, supabaseOrigin)!,
    )).toBe(false);
    expect(hasSafeAndroidConfirmationTarget(
      parseAuthConfirmationUrl(`?confirmation_url=${crossed}`, supabaseOrigin)!,
    )).toBe(false);
  });

  it("continues an exact native confirmation from Android browsers but nowhere else", () => {
    const androidSignup = `${supabaseOrigin}/auth/v1/verify?token=hash&type=signup&redirect_to=com.rewireperform.app%3A%2F%2Fauth%3Fflow%3Dsignup%26intro%3Dathlete`;
    const webSignup = `${supabaseOrigin}/auth/v1/verify?token=hash&type=signup&redirect_to=https%3A%2F%2Frewireperform.com%2Fauth`;
    const confirmation = parseAuthConfirmationUrl(`?confirmation_url=${androidSignup}`, supabaseOrigin);
    const unsafeConfirmation = parseAuthConfirmationUrl(`?confirmation_url=${webSignup}`, supabaseOrigin);

    expect(shouldAutoOpenAndroidConfirmation(confirmation, "android", "native")).toBe(true);
    expect(shouldAutoOpenAndroidConfirmation(
      confirmation,
      "web",
      "Mozilla/5.0 (Linux; Android 10; Redmi Note 7) AppleWebKit/537.36 Chrome/151 Mobile",
    )).toBe(true);
    expect(shouldAutoOpenAndroidConfirmation(
      confirmation,
      "web",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    )).toBe(false);
    expect(shouldAutoOpenAndroidConfirmation(
      confirmation,
      "ios",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
    )).toBe(false);
    expect(shouldAutoOpenAndroidConfirmation(
      unsafeConfirmation,
      "web",
      "Mozilla/5.0 (Linux; Android 10; Redmi Note 7)",
    )).toBe(false);
  });
});
