import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMinorAuthorization } from "@/hooks/useMinorAuthorization";
import AppLoadingShell from "@/components/AppLoadingShell";
import AccessStatusScreen from "@/components/access/AccessStatusScreen";

const MinorAuthorizationGate = ({ children }: { children: React.ReactNode }) => {
  const {
    role,
    loading: authLoading,
    roleVerified,
  } = useAuth();
  const { status, loading, phase, error, refresh } = useMinorAuthorization();
  const location = useLocation();

  const retryAccess = () => void refresh();
  const checking = loading
    || phase === "checking_role"
    || phase === "checking_authorization"
    || (phase === "idle" && !error);

  if (authLoading) return <AppLoadingShell subtitle="Prüfe deine Rolle..." />;

  if (!roleVerified || role === null) {
    if (checking) {
      return (
        <AccessStatusScreen
          checking
          title="Zugang wird geprüft"
          message="Wir stellen deine sichere Sitzung wieder her."
        />
      );
    }
    return (
      <AccessStatusScreen
        title="Rolle konnte nicht sicher geprüft werden"
        message="Deine Daten bleiben geschützt. Stelle die Verbindung wieder her und prüfe den Zugang erneut."
        onRetry={retryAccess}
      />
    );
  }

  if (role === "coach" || role === "admin") return <>{children}</>;
  if (checking) {
    return (
      <AccessStatusScreen
        checking
        title="Zugang wird geprüft"
        message="Wir prüfen deine Freigabe und öffnen anschließend deinen Bereich."
      />
    );
  }

  if (error || !status) {
    return (
      <AccessStatusScreen
        title="Zugang konnte nicht geprüft werden"
        message="Deine Daten bleiben geschützt. Stelle die Verbindung wieder her und prüfe den Zugang erneut."
        onRetry={retryAccess}
      />
    );
  }

  if (status.product_status !== "authorized") {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/minor-consent?next=${encodeURIComponent(next)}`} replace />;
  }

  return <>{children}</>;
};

export default MinorAuthorizationGate;
