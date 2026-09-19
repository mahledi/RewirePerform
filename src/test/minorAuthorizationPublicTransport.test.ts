import { beforeEach, describe, expect, it, vi } from "vitest";
import { inspectGuardianDecision } from "@/lib/minorAuthorization";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: mocks.invoke },
  },
}));

describe("minor guardian public transport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_SUPABASE_URL", "https://project-ref.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-test-key");
  });

  it("ignores persisted auth state for public guardian links", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ state: "pending", policy_key: "minor-policy" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));

    await expect(inspectGuardianDecision("secure-decision-token")).resolves.toMatchObject({
      state: "pending",
    });

    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://project-ref.supabase.co/functions/v1/minor-guardian-public",
      {
        method: "POST",
        headers: {
          apikey: "publishable-test-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "inspect", token: "secure-decision-token" }),
        credentials: "omit",
        cache: "no-store",
        referrerPolicy: "no-referrer",
      },
    );
  });
});
