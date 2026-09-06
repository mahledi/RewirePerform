import { useEffect, useRef } from "react";

type PostgrestResultLike = {
  error: unknown;
  status?: unknown;
  statusText?: unknown;
};

class PostgrestResultError extends Error {
  readonly cause: unknown;
  readonly status?: number;
  readonly statusText?: string;
  readonly code?: string;
  readonly details?: string;
  readonly hint?: string;

  constructor({ error, status, statusText }: PostgrestResultLike) {
    const source = error && typeof error === "object"
      ? error as { code?: unknown; details?: unknown; hint?: unknown; message?: unknown; name?: unknown }
      : null;
    super(typeof source?.message === "string" ? source.message : "Supabase request failed");
    this.name = typeof source?.name === "string" ? source.name : "PostgrestError";
    this.cause = error;
    if (typeof status === "number") this.status = status;
    if (typeof statusText === "string") this.statusText = statusText;
    if (typeof source?.code === "string") this.code = source.code;
    if (typeof source?.details === "string") this.details = source.details;
    if (typeof source?.hint === "string") this.hint = source.hint;
  }
}

export const createPostgrestResultError = (result: PostgrestResultLike): Error =>
  new PostgrestResultError(result);

const normalizeHttpStatus = (value: unknown): number | null =>
  typeof value === "number" && value >= 100 && value <= 599 ? value : null;

const getHttpStatus = (error: unknown): number | null => {
  if (!error || typeof error !== "object") return null;

  const candidate = error as {
    context?: unknown;
    status?: unknown;
    statusCode?: unknown;
  };
  const directStatus = normalizeHttpStatus(candidate.status);
  if (directStatus !== null) return directStatus;
  const statusCode = normalizeHttpStatus(candidate.statusCode);
  if (statusCode !== null) return statusCode;
  if (typeof Response !== "undefined" && candidate.context instanceof Response) {
    return normalizeHttpStatus(candidate.context.status);
  }
  return null;
};

export const isTransientRemoteLoadError = (error: unknown): boolean => {
  const status = getHttpStatus(error);
  if (status !== null) return status >= 500 && status <= 599;
  if (!error || typeof error !== "object") return false;

  const candidate = error as { code?: unknown; message?: unknown; name?: unknown };
  const name = typeof candidate.name === "string" ? candidate.name : "";
  if (name === "AbortError") return false;

  const code = typeof candidate.code === "string" ? candidate.code : "";
  if (/^PGRST00[0-3]$/.test(code)) return true;

  const message = typeof candidate.message === "string" ? candidate.message : "";
  return /failed to fetch|load failed|network request failed|networkerror|connection.*(?:failed|lost)|fetch.*failed/i.test(message);
};

export const loadWithSingleTransientRetry = async <T,>(
  load: () => Promise<T>,
  { shouldRetry = () => true }: { shouldRetry?: () => boolean } = {},
): Promise<T> => {
  try {
    return await load();
  } catch (error) {
    if (!isTransientRemoteLoadError(error) || !shouldRetry()) throw error;
    return load();
  }
};

export const useRefreshWhenFailed = ({
  active,
  failed,
  refresh,
}: {
  active: boolean;
  failed: boolean;
  refresh: () => void;
}) => {
  const activeRef = useRef(active);
  const failedRef = useRef(failed);
  const refreshRef = useRef(refresh);
  const previousActiveRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
    failedRef.current = failed;
    refreshRef.current = refresh;
  }, [active, failed, refresh]);

  useEffect(() => {
    const wasActive = previousActiveRef.current;
    previousActiveRef.current = active;
    if (active && !wasActive && failed) refresh();
  }, [active, failed, refresh]);

  useEffect(() => {
    const refreshAfterFailure = () => {
      if (!activeRef.current || !failedRef.current) return;
      refreshRef.current();
    };

    window.addEventListener("focus", refreshAfterFailure);
    window.addEventListener("online", refreshAfterFailure);
    return () => {
      window.removeEventListener("focus", refreshAfterFailure);
      window.removeEventListener("online", refreshAfterFailure);
    };
  }, []);
};
