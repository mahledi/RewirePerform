import { Capacitor } from "@capacitor/core";
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CoachFirstRunExperience from "@/pages/CoachFirstRunExperience";
import { parseOrganizationInviteUrl } from "@/lib/organizationInvite";

const CoachFirstRunEntry = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationRoute = useMemo(() => {
    const redirect = searchParams.get("redirect");
    if (!redirect) return null;
    try {
      const parsed = new URL(redirect, "https://rewireperform.com");
      const invitation = parseOrganizationInviteUrl(parsed.toString());
      return invitation.kind === "invite" ? invitation.route : null;
    } catch {
      return null;
    }
  }, [searchParams]);
  const requestedMode = searchParams.get("auth_mode") === "login" ? "login" : "signup";

  const invitationAuthRoute = (mode: "signup" | "login") => {
    if (!invitationRoute) return `/auth?mode=${mode}&intro=coach`;
    const params = new URLSearchParams({
      mode,
      intent: "organization",
      redirect: invitationRoute,
      intro: "coach",
    });
    return `/auth?${params.toString()}`;
  };

  return (
    <CoachFirstRunExperience
      fitCameraToViewport={!Capacitor.isNativePlatform()}
      invitation={Boolean(invitationRoute)}
      onComplete={() => {
        if (invitationRoute) navigate(invitationAuthRoute(requestedMode));
        else navigate("/team-access?scope=single_team");
      }}
      onLogin={() => navigate(invitationAuthRoute("login"))}
      onClose={() => navigate("/start")}
    />
  );
};

export default CoachFirstRunEntry;
