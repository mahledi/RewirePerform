import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { Link } from "react-router-dom";

type TeamAccessScope = "single_team" | "organization";
type NativeTeamAccessPlatform = "ios" | "android";

type TeamAccessLinkProps = {
  children: React.ReactNode;
  className?: string;
  scope?: TeamAccessScope;
  "aria-label"?: string;
};

const PUBLIC_TEAM_ACCESS_URL = "https://rewireperform.com/team-access";

export const buildTeamAccessPath = (scope?: TeamAccessScope) => {
  const query = scope ? `?scope=${encodeURIComponent(scope)}` : "";
  return `/team-access${query}`;
};

export const buildPublicTeamAccessUrl = (
  scope?: TeamAccessScope,
  platform?: NativeTeamAccessPlatform,
) => {
  const url = new URL(PUBLIC_TEAM_ACCESS_URL);
  if (scope) url.searchParams.set("scope", scope);
  if (platform) url.searchParams.set("source", platform);
  return url.toString();
};

const TeamAccessLink = ({ children, className, scope, "aria-label": ariaLabel }: TeamAccessLinkProps) => {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!Capacitor.isNativePlatform()) return;

    event.preventDefault();
    const platform = Capacitor.getPlatform();
    const nativeSource = platform === "ios" || platform === "android"
      ? platform
      : undefined;
    const url = buildPublicTeamAccessUrl(scope, nativeSource);
    void Browser.open({
      url,
      presentationStyle: "fullscreen",
      toolbarColor: "#0D0E12",
    }).catch(() => {
      window.location.assign(url);
    });
  };

  return (
    <Link
      to={buildTeamAccessPath(scope)}
      onClick={handleClick}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
};

export default TeamAccessLink;
