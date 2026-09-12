import { describe, expect, it } from "vitest";
import { authenticateMahleOsAuthorization } from "../../supabase/functions/_shared/mahleOsMachineAuthCore";

const currentKey = "a".repeat(64);
const previousKey = "b".repeat(64);

const authenticate = (
  authorization: string,
  overrides: { currentKey?: string; previousKey?: string } = {},
) => authenticateMahleOsAuthorization({
  authorization,
  currentKey: overrides.currentKey ?? currentKey,
  previousKey: overrides.previousKey ?? "",
});

describe("MahleOS machine authentication", () => {
  it("accepts the current 256-bit key", async () => {
    await expect(authenticate(`Bearer ${currentKey}`)).resolves.toBeNull();
  });

  it("accepts the previous key only during an explicit rotation window", async () => {
    await expect(
      authenticate(`Bearer ${previousKey}`, { previousKey }),
    ).resolves.toBeNull();
  });

  it("rejects wrong, missing and malformed credentials", async () => {
    await expect(authenticate(`Bearer ${"c".repeat(64)}`)).resolves.toBe("unauthorized");
    await expect(authenticate("")).resolves.toBe("unauthorized");
    await expect(authenticate(`Bearer ${"a".repeat(63)}`)).resolves.toBe("unauthorized");
    await expect(authenticate(`Basic ${currentKey}`)).resolves.toBe("unauthorized");
  });

  it("fails closed when either configured rotation key is malformed", async () => {
    await expect(
      authenticate(`Bearer ${currentKey}`, { currentKey: "too-short" }),
    ).resolves.toBe("service_not_configured");
    await expect(
      authenticate(`Bearer ${currentKey}`, { previousKey: "too-short" }),
    ).resolves.toBe("service_not_configured");
  });
});
