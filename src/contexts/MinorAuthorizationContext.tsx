import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { MinorAuthorizationContext } from "@/contexts/minorAuthorizationContextValue";
import {
  getMinorAuthorizationStatus,
  type MinorAuthorizationStatus,
} from "@/lib/minorAuthorization";

export const MinorAuthorizationProvider = ({ children }: { children: ReactNode }) => {
  const { user, role, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<MinorAuthorizationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user || role !== "athlete") {
      setStatus(null);
      setError(null);
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await getMinorAuthorizationStatus();
      setStatus(next);
      return next;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "service_unavailable");
      return null;
    } finally {
      setLoading(false);
    }
  }, [role, user]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  const value = useMemo(() => ({ status, loading, error, refresh, setStatus }), [error, loading, refresh, status]);
  return <MinorAuthorizationContext.Provider value={value}>{children}</MinorAuthorizationContext.Provider>;
};
