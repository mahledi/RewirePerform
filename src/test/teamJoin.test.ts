import { beforeEach, describe, expect, it, vi } from "vitest";
import { joinTeamByCode } from "@/lib/teamJoin";

const rpc = vi.hoisted(() => vi.fn());
const monitoring = vi.hoisted(() => ({
  captureAppError: vi.fn(),
  trackAppEvent: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc },
}));
vi.mock("@/lib/monitoring", () => monitoring);

describe("team join client", () => {
  beforeEach(() => {
    rpc.mockReset();
    monitoring.captureAppError.mockReset();
    monitoring.trackAppEvent.mockReset();
  });

  it("rejects malformed codes without contacting Supabase", async () => {
    expect(await joinTeamByCode("BAD/12")).toEqual({
      success: false,
      message: "Bitte gib einen gültigen 6-stelligen Teamcode ein.",
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(monitoring.trackAppEvent).not.toHaveBeenCalled();
  });

  it("returns a safe authorization message when the server blocks membership", async () => {
    rpc.mockResolvedValue({
      data: { success: false, error: "minor_product_authorization_required" },
      error: null,
    });

    expect(await joinTeamByCode("abc123")).toEqual({
      success: false,
      message: "Deine Produktfreigabe konnte nicht sicher bestätigt werden. Bitte prüfe sie erneut.",
    });
    expect(rpc).toHaveBeenCalledWith("join_team_by_code", { _code: "ABC123" });
    expect(monitoring.trackAppEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "team_join_attempt",
      status: "failed",
      errorCode: "minor_product_authorization_required",
    }));
  });

  it("returns a recoverable result when the native network request throws", async () => {
    rpc.mockRejectedValue(new TypeError("Load failed"));

    expect(await joinTeamByCode("abc123")).toEqual({
      success: false,
      message: "Der Teambeitritt konnte gerade nicht abgeschlossen werden. Bitte versuche es erneut.",
    });
    expect(monitoring.captureAppError).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "team_join_attempt",
    }));
  });

  it("accepts only an explicit successful athlete join response", async () => {
    rpc.mockResolvedValue({ data: { success: true, role: "athlete" }, error: null });

    expect(await joinTeamByCode("abc123")).toEqual({ success: true });
    expect(monitoring.trackAppEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "team_join_success",
      status: "success",
    }));
  });
});
