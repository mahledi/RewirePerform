export const TEAM_INVITE_ORIGIN = "https://rewireperform.com";
export const TEAM_INVITE_PATH = "/join";

export type TeamInviteParseResult =
  | { kind: "invite"; teamCode: string }
  | { kind: "invalid" }
  | { kind: "ignore" };

export const normalizeTeamInviteCode = (rawCode: string) => {
  const code = rawCode.trim().toUpperCase();
  return /^[A-Z0-9]{6}$/u.test(code) ? code : null;
};

export const buildTeamInviteUrl = (rawCode: string) => {
  const teamCode = normalizeTeamInviteCode(rawCode);
  if (!teamCode) return null;
  const url = new URL(TEAM_INVITE_PATH, TEAM_INVITE_ORIGIN);
  url.searchParams.set("team", teamCode);
  return url.toString();
};

export const teamInviteAuthRoute = (rawCode: string) => {
  const teamCode = normalizeTeamInviteCode(rawCode);
  if (!teamCode) return "/auth?mode=signup&intent=join&invite_error=invalid";
  const params = new URLSearchParams({
    mode: "signup",
    intent: "join",
    team: teamCode,
  });
  return `/auth?${params.toString()}`;
};

export const parseTeamInviteUrl = (rawUrl: string): TeamInviteParseResult => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { kind: "ignore" };
  }

  if (url.origin !== TEAM_INVITE_ORIGIN || url.pathname !== TEAM_INVITE_PATH) {
    return { kind: "ignore" };
  }

  const queryEntries = [...url.searchParams.entries()];
  if (
    url.username
    || url.password
    || url.hash
    || queryEntries.length !== 1
    || queryEntries[0][0] !== "team"
  ) {
    return { kind: "invalid" };
  }

  const teamCode = normalizeTeamInviteCode(queryEntries[0][1]);
  return teamCode ? { kind: "invite", teamCode } : { kind: "invalid" };
};
