export const ORGANIZATION_INVITE_ORIGIN = "https://rewireperform.com";
export const ORGANIZATION_INVITE_PATH = "/organization/invite";

export type OrganizationInviteParseResult =
  | { kind: "invite"; token: string; route: string }
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
  if (
    url.username
    || url.password
    || url.hash
    || entries.length !== 1
    || entries[0][0] !== "token"
  ) {
    return { kind: "invalid" };
  }

  const route = organizationInviteRoute(entries[0][1]);
  return route
    ? { kind: "invite", token: entries[0][1].toLowerCase(), route }
    : { kind: "invalid" };
};
