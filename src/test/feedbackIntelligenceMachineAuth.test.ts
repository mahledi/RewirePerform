import { describe, expect, it } from "vitest";
import { authenticateFeedbackIntelligenceAuthorization } from
  "../../supabase/functions/_shared/feedbackIntelligenceMachineAuthCore";

const currentKey = "a".repeat(64);
const previousKey = "b".repeat(64);

const authenticate = (
  authorization: string,
  overrides: { currentKey?: string; previousKey?: string } = {},
) => authenticateFeedbackIntelligenceAuthorization({
  authorization,
  currentKey: overrides.currentKey ?? currentKey,
  previousKey: overrides.previousKey ?? "",
});

describe("Feedback Intelligence machine authentication", () => {
  it("accepts only the separate current 64-hex bearer key", async () => {
    await expect(authenticate(`Bearer ${currentKey}`)).resolves.toBeNull();
    await expect(authenticate(`Bearer ${"c".repeat(64)}`)).resolves.toBe("unauthorized");
    await expect(authenticate("")).resolves.toBe("unauthorized");
    await expect(authenticate(`Bearer ${"a".repeat(63)}`)).resolves.toBe("unauthorized");
    await expect(authenticate(`bearer ${currentKey}`)).resolves.toBe("unauthorized");
  });

  it("allows an explicit previous key only during a configured rotation window", async () => {
    await expect(authenticate(`Bearer ${previousKey}`)).resolves.toBe("unauthorized");
    await expect(authenticate(`Bearer ${previousKey}`, { previousKey })).resolves.toBeNull();
  });

  it("fails closed for missing or malformed configured secrets", async () => {
    await expect(authenticate(`Bearer ${currentKey}`, { currentKey: "" }))
      .resolves.toBe("service_not_configured");
    await expect(authenticate(`Bearer ${currentKey}`, { currentKey: "too-short" }))
      .resolves.toBe("service_not_configured");
    await expect(authenticate(`Bearer ${currentKey}`, { previousKey: "too-short" }))
      .resolves.toBe("service_not_configured");
  });
});
