import { describe, expect, it, vi } from "vitest";
import {
  buildDailyTrackingRpcArgs,
  createDailyTrackingSaver,
  type DailyTrackingInput,
} from "@/lib/dailyTracking";

const input: DailyTrackingInput = {
  assignmentId: "assignment-1",
  userId: "user-1",
  date: "2026-07-10",
  eventType: "training",
  dayNumber: 3,
  variantUsed: "training",
  programInstanceId: "instance-1",
  completedTaskTitles: ["Reset"],
  reflection: null,
  moodBefore: 7,
  energyLevel: 6,
  focusRating: 8,
  stress: 4,
  recovery: 7,
  sleepQuality: 7,
  physicalReadiness: 8,
  motivation: 8,
  pressure: 5,
  teamConnection: 8,
};

describe("daily tracking orchestration", () => {
  it("refreshes the snapshot only after the atomic save succeeds", async () => {
    const saveAtomic = vi.fn().mockResolvedValue({ data: { checkin_id: "checkin-1" }, error: null });
    const refreshSnapshot = vi.fn().mockResolvedValue({ days_completed: 3 });
    const save = createDailyTrackingSaver({ saveAtomic, refreshSnapshot });

    await expect(save(input)).resolves.toMatchObject({ snapshotUpdated: true });
    expect(saveAtomic).toHaveBeenCalledOnce();
    expect(refreshSnapshot).toHaveBeenCalledWith("user-1");
  });

  it("never writes a snapshot when the atomic tracking save fails", async () => {
    const error = new Error("network unavailable");
    const saveAtomic = vi.fn().mockResolvedValue({ data: null, error });
    const refreshSnapshot = vi.fn();
    const save = createDailyTrackingSaver({ saveAtomic, refreshSnapshot });

    await expect(save(input)).rejects.toThrow("network unavailable");
    expect(refreshSnapshot).not.toHaveBeenCalled();
  });

  it("can be retried with the same identity without changing the client payload", async () => {
    const saveAtomic = vi.fn().mockResolvedValue({ data: { checkin_id: "same-id" }, error: null });
    const save = createDailyTrackingSaver({ saveAtomic, refreshSnapshot: vi.fn().mockResolvedValue({}) });

    await save(input);
    await save(input);

    expect(saveAtomic).toHaveBeenNthCalledWith(1, input);
    expect(saveAtomic).toHaveBeenNthCalledWith(2, input);
  });

  it("maps evidence into the atomic v3 RPC without leaking reflection text", () => {
    const args = buildDailyTrackingRpcArgs({
      ...input,
      reflection: null,
      evidence: {
        protocolVersion: "56d-transfer-v1-2026-07",
        domainId: "attention_return",
        response: "not_observed",
        responseDurationMs: 8123,
      },
    });

    expect(args).toMatchObject({
      _assignment_id: "assignment-1",
      _program_instance_id: "instance-1",
      _evidence_protocol_version: "56d-transfer-v1-2026-07",
      _evidence_domain_id: "attention_return",
      _evidence_response: "not_observed",
      _evidence_response_duration_ms: 8123,
      _reflection: null,
    });
  });

  it("keeps ordinary and minor-safe daily saves free of evidence fields", () => {
    expect(buildDailyTrackingRpcArgs(input)).toMatchObject({
      _evidence_protocol_version: null,
      _evidence_domain_id: null,
      _evidence_response: null,
      _evidence_response_duration_ms: null,
    });
  });
});
