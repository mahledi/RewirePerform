import type { JarvisReadModel } from "@/lib/adminJarvis";

export const DEEP_ANALYSIS_STATUSES = [
  "ANGEFORDERT",
  "WARTET_AUF_MAC",
  "LAEUFT",
  "FERTIG",
  "BLOCKIERT",
  "FEHLGESCHLAGEN",
] as const;

export type DeepAnalysisStatus = typeof DEEP_ANALYSIS_STATUSES[number];
export type JarvisSourceState = "CURRENT" | "STALE" | "UNKNOWN" | "FAILED" | "OFFLINE" | "NOT_CONNECTED";

export type DeepAnalysisJob = {
  request_id: string;
  status: DeepAnalysisStatus;
  requested_at: string;
  updated_at: string;
  result: Record<string, unknown> | null;
  failure_code: string | null;
  reused: boolean;
};

type RpcClient = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message?: string } | null;
  }>;
};

const SHA256 = /^[a-f0-9]{64}$/u;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const EMAIL = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/u;
const DIRECT_IDENTIFIER = /\b(?:user|athlete|coach|team|program|subject)[_-]?id\b|\b[0-9a-f]{8}-[0-9a-f-]{27,36}\b/iu;
const RESULT_KEYS = new Set([
  "schema_version", "summary", "developments", "comparisons", "data_quality",
  "temporal_links", "review_areas", "founder_questions", "sources", "limitations",
]);
const FORBIDDEN_KEYS = new Set([
  "name", "email", "user_id", "athlete_id", "coach_id", "team_id",
  "program_id", "subject_reference", "journal", "reflection", "comment",
  "free_text", "raw_text", "raw_answer", "individual_score",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const assertPrivateSafe = (value: unknown): void => {
  if (Array.isArray(value)) {
    value.forEach(assertPrivateSafe);
    return;
  }
  if (typeof value === "string" && EMAIL.test(value)) {
    throw new Error("JARVIS_DEEP_ANALYSIS_PRIVATE_VALUE_BLOCKED");
  }
  if (!isRecord(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase()) || key.toLowerCase().endsWith("_id")) {
      throw new Error("JARVIS_DEEP_ANALYSIS_PRIVATE_FIELD_BLOCKED");
    }
    assertPrivateSafe(nested);
  }
};

const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

const sha256 = async (value: string): Promise<string> => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const parseJob = (value: unknown): DeepAnalysisJob => {
  if (!isRecord(value) || typeof value.request_id !== "string" || !UUID.test(value.request_id)) {
    throw new Error("JARVIS_DEEP_ANALYSIS_RESPONSE_INVALID");
  }
  if (!DEEP_ANALYSIS_STATUSES.includes(value.status as DeepAnalysisStatus)) {
    throw new Error("JARVIS_DEEP_ANALYSIS_RESPONSE_INVALID");
  }
  if (
    typeof value.requested_at !== "string"
    || typeof value.updated_at !== "string"
    || (value.result !== null && !isRecord(value.result))
    || (value.failure_code !== null && typeof value.failure_code !== "string")
    || typeof value.reused !== "boolean"
  ) {
    throw new Error("JARVIS_DEEP_ANALYSIS_RESPONSE_INVALID");
  }
  const result = value.result;
  if (result !== null) {
    if (!isRecord(result)) throw new Error("JARVIS_DEEP_ANALYSIS_RESPONSE_INVALID");
    if (
      Object.keys(result).some((key) => !RESULT_KEYS.has(key))
      || result.schema_version !== "jarvis-deep-analysis-result-v1"
      || typeof result.summary !== "string"
      || [...RESULT_KEYS].filter((key) => !["schema_version", "summary"].includes(key)).some((key) => (
        !Array.isArray(result[key])
        || result[key].some((item: unknown) => typeof item !== "string")
      ))
    ) {
      throw new Error("JARVIS_DEEP_ANALYSIS_RESPONSE_INVALID");
    }
    assertPrivateSafe(result);
  }
  return value as DeepAnalysisJob;
};

export const requestDeepAnalysis = async (
  client: RpcClient,
  question: string,
  data: JarvisReadModel,
  sourceStates: Array<{ label: string; state: JarvisSourceState }>,
): Promise<DeepAnalysisJob> => {
  const normalizedQuestion = question.trim().replace(/\s+/gu, " ");
  if (
    normalizedQuestion.length < 3 || normalizedQuestion.length > 500
    || EMAIL.test(normalizedQuestion) || DIRECT_IDENTIFIER.test(normalizedQuestion)
  ) {
    throw new Error("JARVIS_DEEP_ANALYSIS_QUESTION_INVALID");
  }
  assertPrivateSafe(data);
  if (
    sourceStates.length < 1 || sourceStates.length > 32
    || new Set(sourceStates.map((source) => source.label)).size !== sourceStates.length
    || sourceStates.some((source) => source.label.length < 1 || source.label.length > 80)
  ) {
    throw new Error("JARVIS_DEEP_ANALYSIS_SOURCE_STATE_INVALID");
  }
  const snapshotSha256 = await sha256(canonical(data));
  if (!SHA256.test(snapshotSha256)) throw new Error("JARVIS_DEEP_ANALYSIS_SNAPSHOT_INVALID");
  const sourceState = Object.fromEntries(sourceStates.map((source) => [source.label, source.state]));
  const { data: response, error } = await client.rpc("request_jarvis_deep_analysis", {
    _question: normalizedQuestion,
    _snapshot_sha256: snapshotSha256,
    _source_states: sourceState,
  });
  if (error) throw new Error("JARVIS_DEEP_ANALYSIS_REQUEST_FAILED");
  return parseJob(response);
};

export const readDeepAnalysis = async (
  client: RpcClient,
  requestId: string,
): Promise<DeepAnalysisJob> => {
  if (!UUID.test(requestId)) throw new Error("JARVIS_DEEP_ANALYSIS_REQUEST_ID_INVALID");
  const { data, error } = await client.rpc("get_jarvis_deep_analysis", { _request_id: requestId });
  if (error) throw new Error("JARVIS_DEEP_ANALYSIS_READ_FAILED");
  return parseJob(data);
};
