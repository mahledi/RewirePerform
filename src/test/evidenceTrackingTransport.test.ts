import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCoachEvidenceReviewContext } from "@/lib/evidenceTracking";
import { isTransientRemoteLoadError } from "@/lib/recoverableRemoteLoad";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc },
}));

const rpcFailure = (status: number, statusText: string, code: string) => ({
  data: null,
  error: {
    code,
    details: "",
    hint: "",
    message: statusText,
  },
  status,
  statusText,
});

describe("evidence tracking RPC transport errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the real PostgREST result status so a 5xx context load is transient", async () => {
    const result = rpcFailure(503, "Service Unavailable", "PGRST002");
    mocks.rpc.mockResolvedValue(result);

    const error = await getCoachEvidenceReviewContext("team-1").catch((failure) => failure);

    expect(error).toMatchObject({
      name: "PostgrestError",
      status: 503,
      statusText: "Service Unavailable",
      code: "PGRST002",
      cause: result.error,
    });
    expect(isTransientRemoteLoadError(error)).toBe(true);
  });

  it("keeps a real PostgREST 4xx context failure non-transient", async () => {
    const result = rpcFailure(403, "Forbidden", "42501");
    mocks.rpc.mockResolvedValue(result);

    const error = await getCoachEvidenceReviewContext("team-1").catch((failure) => failure);

    expect(error).toMatchObject({ status: 403, statusText: "Forbidden", code: "42501" });
    expect(isTransientRemoteLoadError(error)).toBe(false);
  });

  it("recognizes postgrest-js status 0 as a network failure instead of an HTTP status", async () => {
    const result = rpcFailure(0, "", "");
    result.error.message = "TypeError: Failed to fetch";
    mocks.rpc.mockResolvedValue(result);

    const error = await getCoachEvidenceReviewContext("team-1").catch((failure) => failure);

    expect(error).toMatchObject({ status: 0, statusText: "", code: "" });
    expect(isTransientRemoteLoadError(error)).toBe(true);
  });
});
