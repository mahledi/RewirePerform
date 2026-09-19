export const ORGANIZATION_INVITE_ORIGIN = "https://rewireperform.com";
export const ORGANIZATION_INVITE_PATH = "/organization/invite";

export type OrganizationInviteParseResult =
  | { kind: "invite"; inviteType: "legacy_token"; token: string; route: string }
  | { kind: "invite"; inviteType: "coach_code"; coachCode: string; route: string }
  | { kind: "invalid" }
  | { kind: "ignore" };

export const normalizeOrganizationInviteToken = (rawToken: string) => {
  const token = rawToken.trim().toLowerCase();
  return /^[a-f0-9]{64}$/u.test(token) ? token : null;
};
export const organizationInviteRoute = (rawToken: string) => {
  const token = normalizeOrganizationInviteToken(rawToken);
  return token ? `${ORGANIZATION_INVITE_PATH}?token=${encodeURIComponent(token)}` : null;
};

export const normalizeCoachInviteCode = (rawCode: string) => {
  const code = rawCode.replace(/[\s-]/gu, "").toUpperCase();
  return /^[A-F0-9]{20}$/u.test(code) ? code : null;
};

export const formatCoachInviteCode = (rawCode: string) => {
  const code = normalizeCoachInviteCode(rawCode);
  return code ? code.match(/.{1,4}/gu)?.join("-") ?? code : null;
};

export const coachInviteRoute = (rawCode: string) => {
  const coachCode = normalizeCoachInviteCode(rawCode);
  return coachCode
    ? `${ORGANIZATION_INVITE_PATH}?coach=${encodeURIComponent(coachCode)}`
    : null;
};

export const buildCoachInviteUrl = (rawCode: string) => {
  const route = coachInviteRoute(rawCode);
  return route ? new URL(route, ORGANIZATION_INVITE_ORIGIN).toString() : null;
};

export const parseOrganizationInviteUrl = (rawUrl: string): OrganizationInviteParseResult => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { kind: "ignore" };
  }

  if (url.origin !== ORGANIZATION_INVITE_ORIGIN || url.pathname !== ORGANIZATION_INVITE_PATH) {
    return { kind: "ignore" };
  }

  const entries = [...url.searchParams.entries()];
  if (url.username || url.password || url.hash || entries.length !== 1) {
    return { kind: "invalid" };
  }

  if (entries[0][0] === "token") {
    const route = organizationInviteRoute(entries[0][1]);
    return route
      ? {
          kind: "invite",
          inviteType: "legacy_token",
          token: entries[0][1].toLowerCase(),
          route,
        }
      : { kind: "invalid" };
  }

  if (entries[0][0] === "coach") {
    const route = coachInviteRoute(entries[0][1]);
    const coachCode = normalizeCoachInviteCode(entries[0][1]);
    return route && coachCode
      ? { kind: "invite", inviteType: "coach_code", coachCode, route }
      : { kind: "invalid" };
  }

  return { kind: "invalid" };
};
