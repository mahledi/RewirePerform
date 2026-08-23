import { describe, expect, it } from "vitest";
import { parseAuthConfirmationUrl } from "@/lib/authConfirmationUrl";

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
});
