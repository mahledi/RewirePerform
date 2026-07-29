import { useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import FirstRunExperiencePreview, { type FirstRunMode } from "@/pages/FirstRunExperiencePreview";
import { safeInternalRoute } from "@/lib/internalRoute";
import { completePublicOnboarding } from "@/lib/publicOnboarding";

const Welcome = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isReplay = searchParams.get("replay") === "1";
  const returnPath = useMemo(
    () => safeInternalRoute(searchParams.get("return")) ?? (isReplay ? "/settings" : "/auth"),
    [isReplay, searchParams],
  );

  const finish = (mode: FirstRunMode) => {
    completePublicOnboarding();
    if (isReplay) {
      navigate(returnPath, { replace: true });
      return;
    }
    const authPath = mode === "team"
      ? "/auth?mode=signup&intent=join"
      : "/auth?mode=signup&intent=solo";
    navigate(authPath, { replace: true, state: { from: location.pathname } });
  };

  const login = () => {
    completePublicOnboarding();
    navigate("/auth?mode=login", { replace: true, state: { from: location.pathname } });
  };

  return (
    <FirstRunExperiencePreview
      onComplete={finish}
      onLogin={login}
      replay={isReplay}
      onClose={isReplay ? () => navigate(returnPath, { replace: true }) : undefined}
    />
  );
};

export default Welcome;
