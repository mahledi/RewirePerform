import { useEffect, useRef, useState, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { RefreshCw, Users } from "lucide-react";
import AppLoadingShell from "@/components/AppLoadingShell";
import { AuthStatusLayout, StatusAction } from "@/components/auth/AuthStatusLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  clearPostAuthorizationTeamJoin,
  pendingPostAuthorizationTeamCode,
  pendingPostSignupIntent,
  postSignupWelcomeRoute,
} from "@/lib/postSignupOnboarding";
import { joinTeamByCode } from "@/lib/teamJoin";

const PostSignupOnboardingGate = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const { user, role, roleVerified, loading } = useAuth();
  const [joinAttempt, setJoinAttempt] = useState(0);
  const [joinPhase, setJoinPhase] = useState<"idle" | "joining" | "error">("idle");
  const [joinErrorMessage, setJoinErrorMessage] = useState("");
  const attemptedJoinRef = useRef<string | null>(null);
  const userId = user?.id ?? null;
  const teamCode = userId ? pendingPostAuthorizationTeamCode(userId) : null;

  useEffect(() => {
    if (loading || !userId || !roleVerified || role !== "athlete" || !teamCode) return;
    const attemptKey = `${teamCode}:${joinAttempt}`;
    if (attemptedJoinRef.current === attemptKey) return;
    attemptedJoinRef.current = attemptKey;
    let cancelled = false;
    setJoinErrorMessage("");
    setJoinPhase("joining");

    void joinTeamByCode(teamCode).then((result) => {
      if (cancelled) return;
      if (!result.success) {
        setJoinErrorMessage(result.message);
        setJoinPhase("error");
        return;
      }
      clearPostAuthorizationTeamJoin(userId);
      const pendingIntent = pendingPostSignupIntent(userId);
      navigate(pendingIntent ? postSignupWelcomeRoute(pendingIntent) : "/dashboard", { replace: true });
    });

    return () => {
      cancelled = true;
    };
  }, [joinAttempt, loading, navigate, role, roleVerified, teamCode, userId]);

  if (loading) return <AppLoadingShell subtitle="Öffne deinen Start..." />;
  if (!user) return <>{children}</>;
  if (!roleVerified || role === null) {
    return <AppLoadingShell subtitle="Prüfe deinen Zugang..." />;
  }
  if (role === "coach") return <Navigate to="/coach" replace />;
  if (role === "admin") return <Navigate to="/admin" replace />;

  if (teamCode) {
    if (joinPhase === "error") {
      const skipTeamJoin = () => {
        clearPostAuthorizationTeamJoin(user.id);
        const pendingIntent = pendingPostSignupIntent(user.id);
        navigate(pendingIntent ? postSignupWelcomeRoute(pendingIntent) : "/dashboard", { replace: true });
      };
      return (
        <AuthStatusLayout
          icon={<Users className="h-7 w-7" aria-hidden="true" />}
          title="Teambeitritt noch offen."
          description={joinErrorMessage || "Deine Freigabe ist abgeschlossen. Der Teamcode konnte gerade nicht zugeordnet werden."}
          tone="error"
        >
          <StatusAction variant="primary" onClick={() => setJoinAttempt((attempt) => attempt + 1)}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Erneut versuchen
          </StatusAction>
          <StatusAction variant="link" onClick={skipTeamJoin} className="mt-3">
            Ohne Team fortfahren
          </StatusAction>
        </AuthStatusLayout>
      );
    }
    return <AppLoadingShell subtitle="Schließe deinen Teambeitritt sicher ab..." />;
  }

  const pendingIntent = pendingPostSignupIntent(user.id);
  if (pendingIntent) {
    return <Navigate to={postSignupWelcomeRoute(pendingIntent)} replace />;
  }

  return <>{children}</>;
};

export default PostSignupOnboardingGate;
