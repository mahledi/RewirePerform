import { Capacitor } from "@capacitor/core";
import { useNavigate, useSearchParams } from "react-router-dom";
import FirstRunExperiencePreview, { type FirstRunMode } from "@/pages/FirstRunExperiencePreview";
import { normalizeTeamInviteCode } from "@/lib/teamInvite";

const AthleteFirstRunEntry = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const teamCode = normalizeTeamInviteCode(searchParams.get("team") ?? "");
  const initialMode: FirstRunMode = searchParams.get("intent") === "solo" && !teamCode ? "solo" : "team";
  const requestedMode = searchParams.get("auth_mode") === "login" ? "login" : "signup";

  const authRoute = (mode: "signup" | "login", intent: FirstRunMode) => {
    const params = new URLSearchParams({
      mode,
      intent: intent === "team" ? "join" : "solo",
      intro: "athlete",
    });
    if (intent === "team" && teamCode) params.set("team", teamCode);
    return `/auth?${params.toString()}`;
  };

  const finish = (mode: FirstRunMode) => navigate(authRoute(requestedMode, mode));

  return (
    <FirstRunExperiencePreview
      fitCameraToViewport={!Capacitor.isNativePlatform()}
      initialMode={initialMode}
      onComplete={finish}
      onLogin={() => navigate(authRoute("login", initialMode))}
      onClose={() => navigate("/start")}
    />
  );
};

export default AthleteFirstRunEntry;
