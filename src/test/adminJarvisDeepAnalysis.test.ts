import { describe, expect, it, vi } from "vitest";
import { readDeepAnalysis, requestDeepAnalysis } from "@/lib/adminJarvisDeepAnalysis";
import type { JarvisReadModel } from "@/lib/adminJarvis";

const data = (): JarvisReadModel => ({
  overview: { generated_at: "2026-09-05T10:00:00Z", active_users_7d: 12 },
  teams: [{ team_reference: "aggregate-team-a", athletes: 8 }],
  system: null,
  operations: null,
  presentation: null,
  study: null,
  solo: null,
  trends: null,
});

const job = {
  request_id: "11111111-1111-4111-8111-111111111111",
  status: "ANGEFORDERT",
  requested_at: "2026-09-05T10:00:00Z",
  updated_at: "2026-09-05T10:00:00Z",
  result: null,
  failure_code: null,
  reused: false,
};

describe("Jarvis deep analysis request boundary", () => {
  it("sends no aggregate payload and reuses the server contract", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: job, error: null });
    const result = await requestDeepAnalysis(
      { rpc },
      "Wie entwickelt sich die Aktivität?",
      data(),
      [{ label: "Aktivität", state: "CURRENT" }],
    );
    expect(result.status).toBe("ANGEFORDERT");
    expect(rpc).toHaveBeenCalledOnce();
    const [, args] = rpc.mock.calls[0];
    expect(args).toEqual(expect.objectContaining({
      _question: "Wie entwickelt sich die Aktivität?",
      _snapshot_sha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      _source_states: { "Aktivität": "CURRENT" },
    }));
    expect(JSON.stringify(args)).not.toContain("active_users_7d");
  });

  it("blocks private fields and email addresses before RPC", async () => {
    const rpc = vi.fn();
    await expect(requestDeepAnalysis(
      { rpc }, "Bitte analysieren", { ...data(), overview: { user_id: "private" } }, [],
    )).rejects.toThrow("PRIVATE_FIELD_BLOCKED");
    await expect(requestDeepAnalysis(
      { rpc }, "Analysiere person@example.com", data(), [],
    )).rejects.toThrow("QUESTION_INVALID");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("fails closed on malformed request status", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { ...job, status: "READY" }, error: null });
    await expect(readDeepAnalysis({ rpc }, job.request_id)).rejects.toThrow("RESPONSE_INVALID");
  });

  it("rejects private or malformed stored results", async () => {
    const privateResult = {
      schema_version: "jarvis-deep-analysis-result-v1",
      summary: "Kontakt person@example.com",
      developments: [], comparisons: [], data_quality: [], temporal_links: [],
      review_areas: [], founder_questions: [], sources: [], limitations: [],
    };
    const rpc = vi.fn().mockResolvedValue({
      data: { ...job, status: "FERTIG", result: privateResult }, error: null,
    });
    await expect(readDeepAnalysis({ rpc }, job.request_id)).rejects.toThrow("PRIVATE_VALUE_BLOCKED");
  });

  it("requires a bounded unique source-state set", async () => {
    const rpc = vi.fn();
    await expect(requestDeepAnalysis({ rpc }, "Bitte analysieren", data(), [])).rejects.toThrow("SOURCE_STATE_INVALID");
    expect(rpc).not.toHaveBeenCalled();
  });
});
