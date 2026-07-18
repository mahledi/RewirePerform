import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMinorAuthorization } from "@/hooks/useMinorAuthorization";
import AppLoadingShell from "@/components/AppLoadingShell";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

const MinorAuthorizationGate = ({ children }: { children: React.ReactNode }) => {
  const { role, loading: authLoading, roleVerified } = useAuth();
  const { status, loading, error, refresh } = useMinorAuthorization();
  const location = useLocation();

  if (authLoading) return <AppLoadingShell subtitle="Prüfe deine Rolle..." />;

  if (!roleVerified || role === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
        <section className="w-full max-w-md text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-5 font-heading text-2xl font-semibold">Rolle konnte nicht sicher geprüft werden</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Geschützte Programmdaten bleiben gesperrt, bis deine Rolle serverseitig bestätigt ist.
          </p>
          <Button type="button" className="mt-6" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
            Neu laden
          </Button>
        </section>
      </main>
    );
  }

  if (role === "coach" || role === "admin") return <>{children}</>;
  if (loading || (!status && !error)) return <AppLoadingShell subtitle="Prüfe deinen sicheren Zugang..." />;

  if (error || !status) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
        <section className="w-full max-w-md text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-5 font-heading text-2xl font-semibold">Zugang konnte nicht geprüft werden</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Deine Daten bleiben geschützt. Bitte stelle die Verbindung wieder her und versuche es erneut.
          </p>
          <Button type="button" className="mt-6" onClick={() => void refresh()}>
            <RefreshCw className="h-4 w-4" />
            Erneut prüfen
          </Button>
        </section>
      </main>
    );
  }

  if (status.product_status !== "authorized") {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/minor-consent?next=${encodeURIComponent(next)}`} replace />;
  }

  return <>{children}</>;
};

export default MinorAuthorizationGate;
