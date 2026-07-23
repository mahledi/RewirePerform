const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const SAFE_TOKEN_PATTERN = /^[A-Za-z0-9_.:/-]{1,96}$/;
const RFC3339_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/u;
const ALLOWED_REQUEST_KEYS = new Set(["cursor", "limit"]);
const ALLOWED_RESULT_KEYS = new Set([
  "ok",
  "schema_version",
  "request_id",
  "generated_at",
  "items",
  "has_more",
  "next_cursor_created_at",
  "next_cursor_id",
  "privacy",
]);
const ALLOWED_ITEM_KEYS = new Set([
  "feedback_reference",
  "category",
  "status",
  "created_at",
  "message",
  "technical_context",
]);
const ALLOWED_CONTEXT_KEYS = new Set([
  "schema_version",
  "runtime",
  "platform",
  "route",
  "online",
  "app_version",
]);
const ALLOWED_PRIVACY_KEYS = new Set([
  "structured_user_identifiers_exported",
  "recognized_direct_identifiers_redacted",
  "free_text_may_contain_personal_data",
  "admin_notes_exported",
  "attachments_exported",
  "model_safe_without_redaction",
]);
const CATEGORIES = new Set(["bug", "suggestion", "general", "other"]);
const STATUSES = new Set(["open", "reviewed", "resolved", "unknown"]);
const RUNTIMES = new Set(["native", "standalone", "browser", "unknown"]);
const PLATFORMS = new Set(["ios", "android", "web", "unknown"]);

type RecordValue = Record<string, unknown>;

export type FeedbackReadCursor = {
  createdAt: string;
  id: string;
};

export type FeedbackReadRequest = {
  cursor: FeedbackReadCursor | null;
  limit: number;
};

export type FeedbackTechnicalContext = {
  schema_version: "feedback-technical-context-v1";
  runtime: "native" | "standalone" | "browser" | "unknown";
  platform: "ios" | "android" | "web" | "unknown";
  route: string | null;
  online: boolean | null;
  app_version: string;
};

export type FeedbackReadItem = {
  feedback_reference: string;
  category: "bug" | "suggestion" | "general" | "other";
  status: "open" | "reviewed" | "resolved" | "unknown";
  created_at: string;
  message: string;
  technical_context: FeedbackTechnicalContext;
};

export type FeedbackReadProjection = {
  ok: true;
  schema_version: "mahleos-feedback-read-v1.1";
  request_id: string;
  generated_at: string;
  items: FeedbackReadItem[];
  has_more: boolean;
  next_cursor: string | null;
  privacy: {
    structured_user_identifiers_exported: false;
    recognized_direct_identifiers_redacted: true;
    free_text_may_contain_personal_data: true;
    admin_notes_exported: false;
    attachments_exported: false;
    model_safe_without_redaction: false;
  };
};

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOnlyKeys = (value: RecordValue, allowed: Set<string>) =>
  Object.keys(value).every((key) => allowed.has(key));

const isIsoTimestamp = (value: unknown): value is string => {
  if (
    typeof value !== "string"
    || value.length > 40
    || !RFC3339_TIMESTAMP_PATTERN.test(value)
  ) return false;
  const timestamp = new Date(value);
  return !Number.isNaN(timestamp.getTime());
};

const base64UrlEncode = (value: string) =>
  btoa(value).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");

const base64UrlDecode = (value: string) => {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padding = "=".repeat((4 - normalized.length % 4) % 4);
  return atob(`${normalized}${padding}`);
};

export const encodeFeedbackCursor = ({ createdAt, id }: FeedbackReadCursor) =>
  base64UrlEncode(JSON.stringify({ v: 1, created_at: createdAt, id }));

export const decodeFeedbackCursor = (cursor: string): FeedbackReadCursor | null => {
  if (!/^[A-Za-z0-9_-]{1,256}$/u.test(cursor)) return null;

  try {
    const decoded = JSON.parse(base64UrlDecode(cursor)) as unknown;
    if (
      !isRecord(decoded)
      || !hasOnlyKeys(decoded, new Set(["v", "created_at", "id"]))
      || decoded.v !== 1
      || !isIsoTimestamp(decoded.created_at)
      || typeof decoded.id !== "string"
      || !UUID_PATTERN.test(decoded.id)
    ) {
      return null;
    }
    return { createdAt: decoded.created_at, id: decoded.id };
  } catch {
    return null;
  }
};

export const parseFeedbackReadRequest = (value: unknown): FeedbackReadRequest | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ALLOWED_REQUEST_KEYS)) return null;

  const limit = value.limit ?? 25;
  const cursorValue = value.cursor ?? null;
  if (!Number.isInteger(limit) || Number(limit) < 1 || Number(limit) > 25) return null;
  if (cursorValue !== null && typeof cursorValue !== "string") return null;

  const cursor = typeof cursorValue === "string" ? decodeFeedbackCursor(cursorValue) : null;
  if (cursorValue !== null && !cursor) return null;
  return { cursor, limit: Number(limit) };
};

const projectTechnicalContext = (value: unknown): FeedbackTechnicalContext | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ALLOWED_CONTEXT_KEYS)) return null;
  if (
    value.schema_version !== "feedback-technical-context-v1"
    || typeof value.runtime !== "string"
    || !RUNTIMES.has(value.runtime)
    || typeof value.platform !== "string"
    || !PLATFORMS.has(value.platform)
    || (value.route !== null
      && (typeof value.route !== "string"
        || !value.route.startsWith("/")
        || value.route.length > 160
        || /[?#]/u.test(value.route)))
    || (value.online !== null && typeof value.online !== "boolean")
    || typeof value.app_version !== "string"
    || !SAFE_TOKEN_PATTERN.test(value.app_version)
  ) {
    return null;
  }

  return value as FeedbackTechnicalContext;
};

const projectItem = (value: unknown): FeedbackReadItem | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ALLOWED_ITEM_KEYS)) return null;
  const technicalContext = projectTechnicalContext(value.technical_context);
  if (
    typeof value.feedback_reference !== "string"
    || !HASH_PATTERN.test(value.feedback_reference)
    || typeof value.category !== "string"
    || !CATEGORIES.has(value.category)
    || typeof value.status !== "string"
    || !STATUSES.has(value.status)
    || !isIsoTimestamp(value.created_at)
    || typeof value.message !== "string"
    || value.message.length < 1
    || value.message.length > 2000
    || !technicalContext
  ) {
    return null;
  }

  return {
    feedback_reference: value.feedback_reference,
    category: value.category as FeedbackReadItem["category"],
    status: value.status as FeedbackReadItem["status"],
    created_at: value.created_at,
    message: value.message,
    technical_context: technicalContext,
  };
};

export const projectFeedbackReadResult = (value: unknown): FeedbackReadProjection | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ALLOWED_RESULT_KEYS)) return null;
  if (
    value.ok !== true
    || value.schema_version !== "mahleos-feedback-read-v1.1"
    || typeof value.request_id !== "string"
    || !UUID_PATTERN.test(value.request_id)
    || !isIsoTimestamp(value.generated_at)
    || !Array.isArray(value.items)
    || value.items.length > 25
    || typeof value.has_more !== "boolean"
    || (value.has_more && value.items.length === 0)
    || (value.next_cursor_created_at !== null && !isIsoTimestamp(value.next_cursor_created_at))
    || (value.next_cursor_id !== null
      && (typeof value.next_cursor_id !== "string" || !UUID_PATTERN.test(value.next_cursor_id)))
    || (value.has_more
      ? value.next_cursor_created_at === null || value.next_cursor_id === null
      : value.next_cursor_created_at !== null || value.next_cursor_id !== null)
    || !isRecord(value.privacy)
    || !hasOnlyKeys(value.privacy, ALLOWED_PRIVACY_KEYS)
    || value.privacy.structured_user_identifiers_exported !== false
    || value.privacy.recognized_direct_identifiers_redacted !== true
    || value.privacy.free_text_may_contain_personal_data !== true
    || value.privacy.admin_notes_exported !== false
    || value.privacy.attachments_exported !== false
    || value.privacy.model_safe_without_redaction !== false
  ) {
    return null;
  }

  const items = value.items.map(projectItem);
  if (items.some((item) => item === null)) return null;

  const nextCursor = value.has_more
    ? encodeFeedbackCursor({
      createdAt: value.next_cursor_created_at as string,
      id: value.next_cursor_id as string,
    })
    : null;

  return {
    ok: true,
    schema_version: "mahleos-feedback-read-v1.1",
    request_id: value.request_id,
    generated_at: value.generated_at,
    items: items as FeedbackReadItem[],
    has_more: value.has_more,
    next_cursor: nextCursor,
    privacy: {
      structured_user_identifiers_exported: false,
      recognized_direct_identifiers_redacted: true,
      free_text_may_contain_personal_data: true,
      admin_notes_exported: false,
      attachments_exported: false,
      model_safe_without_redaction: false,
    },
  };
};
