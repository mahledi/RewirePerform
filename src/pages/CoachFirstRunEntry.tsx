import { Capacitor } from "@capacitor/core";
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CoachFirstRunExperience from "@/pages/CoachFirstRunExperience";
import { parseOrganizationInviteUrl } from "@/lib/organizationInvite";

const CoachFirstRunEntry = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitation = useMemo(() => {
    const redirect = searchParams.get("redirect");
    if (!redirect) return null;
    try {
      const parsed = new URL(redirect, "https://rewireperform.com");
      const invitation = parseOrganizationInviteUrl(parsed.toString());
      return invitation.kind === "invite"
        ? { route: invitation.route, kind: invitation.inviteType === "coach_code" ? "coach_code" as const : "personal" as const }
        : null;
    } catch {
      return null;
    }
  }, [searchParams]);
  const requestedMode = searchParams.get("auth_mode") === "login" ? "login" : "signup";

  const invitationAuthRoute = (mode: "signup" | "login") => {
    if (!invitation) return `/auth?mode=${mode}&intro=coach`;
    const params = new URLSearchParams({
      mode,
      intent: "organization",
      redirect: invitation.route,
      intro: "coach",
    });
    return `/auth?${params.toString()}`;
  };

  return (
    <CoachFirstRunExperience
      fitCameraToViewport={!Capacitor.isNativePlatform()}
      invitation={Boolean(invitation)}
      invitationKind={invitation?.kind}
      onComplete={() => {
        if (invitation) navigate(invitationAuthRoute(requestedMode));
        else navigate("/team-access?scope=single_team");
      }}
      onLogin={() => navigate(invitationAuthRoute("login"))}
      onClose={() => navigate("/start")}
    />
  );
};

export default CoachFirstRunEntry;
