import { useMemo } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import AppLoadingShell from "@/components/AppLoadingShell";
import { useAuth } from "@/contexts/AuthContext";
import FirstRunExperiencePreview, { type FirstRunMode } from "@/pages/FirstRunExperiencePreview";
import { safeInternalRoute } from "@/lib/internalRoute";
import {
  completePostSignupOnboarding,
  pendingPostSignupIntent,
} from "@/lib/postSignupOnboarding";

const Welcome = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, role, loading, roleVerified } = useAuth();
  const isReplay = searchParams.get("replay") === "1";
  const isPostSignup = searchParams.get("flow") === "post-signup";
  const returnPath = useMemo(
    () => safeInternalRoute(searchParams.get("return")) ?? (isReplay ? "/settings" : "/auth"),
    [isReplay, searchParams],
  );
  const pendingIntent = user ? pendingPostSignupIntent(user.id) : null;

  const finish = (mode: FirstRunMode) => {
    if (isReplay) {
      navigate(returnPath, { replace: true });
      return;
    }
    if (user && isPostSignup) {
      completePostSignupOnboarding(user.id, mode === "team" ? "join" : "solo");
      navigate("/questionnaire", { replace: true });
    }
  };

  if (loading) {
    return <AppLoadingShell subtitle="Öffne deine Einführung..." />;
  }
  if (!user) return <Navigate to="/auth?mode=login" replace />;
  if (!roleVerified || role === null) {
    return <AppLoadingShell subtitle="Prüfe deinen Zugang..." />;
  }
  if (role === "coach") return <Navigate to="/coach" replace />;
  if (role === "admin") return <Navigate to="/admin" replace />;
  if (!isReplay && (!isPostSignup || !pendingIntent)) {
    return <Navigate to="/questionnaire" replace />;
  }

  return (
    <FirstRunExperiencePreview
      onComplete={finish}
      replay={isReplay}
      postSignup={isPostSignup}
      initialMode={pendingIntent === "join" ? "team" : "solo"}
      onClose={isReplay ? () => navigate(returnPath, { replace: true }) : undefined}
    />
  );
};

export default Welcome;
