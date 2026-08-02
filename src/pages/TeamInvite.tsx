import { Navigate, useLocation } from "react-router-dom";
import {
  parseTeamInviteUrl,
  TEAM_INVITE_ORIGIN,
  teamInviteAuthRoute,
} from "@/lib/teamInvite";

const TeamInvite = () => {
  const location = useLocation();
  const result = parseTeamInviteUrl(
    new URL(`${location.pathname}${location.search}`, TEAM_INVITE_ORIGIN).toString(),
  );

  if (result.kind === "invite") {
    return <Navigate to={teamInviteAuthRoute(result.teamCode)} replace />;
  }

  return <Navigate to="/auth?mode=signup&intent=join&invite_error=invalid" replace />;
};

export default TeamInvite;
