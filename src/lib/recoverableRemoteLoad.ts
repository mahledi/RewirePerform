import { useEffect, useRef } from "react";

const getHttpStatus = (error: unknown): number | null => {
  if (!error || typeof error !== "object") return null;

  const candidate = error as {
    context?: unknown;
    status?: unknown;
    statusCode?: unknown;
  };
  if (typeof candidate.status === "number") return candidate.status;
  if (typeof candidate.statusCode === "number") return candidate.statusCode;
  if (candidate.context instanceof Response) return candidate.context.status;
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

export const loadWithSingleTransientRetry = async <T,>(load: () => Promise<T>): Promise<T> => {
  try {
    return await load();
  } catch (error) {
    if (!isTransientRemoteLoadError(error)) throw error;
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
