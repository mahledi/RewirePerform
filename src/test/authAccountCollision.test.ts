import { describe, expect, it } from "vitest";
import {
  EXISTING_ACCOUNT_NOTICE,
  isObscuredExistingAccountSignUp,
} from "@/lib/authAccountCollision";

describe("auth account collision privacy contract", () => {
  it("recognizes Supabase's fake identity-less signup result", () => {
    expect(isObscuredExistingAccountSignUp({ identities: [] }, null)).toBe(true);
    expect(isObscuredExistingAccountSignUp({ identities: [{ id: "identity-1" }] }, null)).toBe(false);
    expect(isObscuredExistingAccountSignUp({}, null)).toBe(false);
  });

  it("recognizes supported explicit duplicate-account errors", () => {
    expect(isObscuredExistingAccountSignUp(null, { code: "email_exists" })).toBe(true);
    expect(isObscuredExistingAccountSignUp(null, { message: "User already registered" })).toBe(true);
    expect(isObscuredExistingAccountSignUp(null, { message: "Password should be stronger" })).toBe(false);
  });

  it("keeps the public response deliberately neutral", () => {
    expect(EXISTING_ACCOUNT_NOTICE).toBe("Für diese E-Mail besteht möglicherweise bereits ein Konto.");
    expect(EXISTING_ACCOUNT_NOTICE).not.toMatch(/ist registriert|existiert sicher|Athlet|Coach/iu);
  });
});
