import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { sanitizeMonitoringMetadata, toMonitoringError } from "@/lib/monitoring";

describe("monitoring privacy boundary", () => {
  it("keeps only allow-listed technical metadata", () => {
    const sanitized = sanitizeMonitoringMetadata({
      stage: "atomic_tracking",
      day_number: 12,
      journal_text: "private reflection",
      source: "team-mental-state",
      unsafe_source: "contains private text",
    } as never);

    expect(sanitized).toEqual({
      stage: "atomic_tracking",
      day_number: 12,
      source: "team-mental-state",
    });
  });

  it("never forwards an original exception message or primitive properties", () => {
    const original = Object.assign(new Error("private athlete answer"), {
      code: "PGRST116",
      details: "sensitive detail",
    });

    const sanitized = toMonitoringError(original);

    expect(sanitized).not.toBe(original);
    expect(sanitized.name).toBe("Error");
    expect(sanitized.message).toBe("Application operation failed (PGRST116)");
    expect(sanitized.message).not.toContain("private athlete answer");
    expect(sanitized).not.toHaveProperty("cause");
    expect(sanitized.stack).not.toContain("private athlete answer");
    expect(sanitized.stack).not.toContain("sensitive detail");
  });

  it("neutralizes a custom Error name as well as its message", () => {
    const original = new Error("private mood value");
    original.name = "private name with spaces";

    const sanitized = toMonitoringError(original);

    expect(sanitized.name).toBe("ApplicationError");
    expect(sanitized.message).toBe("Application operation failed (application_error)");
    expect(sanitized.stack).not.toContain("private mood value");
    expect(sanitized.stack).not.toContain("private name with spaces");
  });

  it("drops non-token strings even for an allow-listed key", () => {
    expect(
      sanitizeMonitoringMetadata({
        source: "private text with spaces",
        event_type: "training",
      }),
    ).toEqual({ event_type: "training" });
  });
});
