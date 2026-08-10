import { buildTeamInviteUrl, normalizeTeamInviteCode } from "@/lib/teamInvite";

export type SharePayload = {
  title: string;
  text: string;
  url: string;
  message: string;
};

export const buildAthleteTeamInvitation = (
  teamName: string,
  rawCode: string,
): SharePayload | null => {
  const code = normalizeTeamInviteCode(rawCode);
  const url = buildTeamInviteUrl(rawCode);
  if (!code || !url) return null;

  const normalizedTeamName = teamName.trim() || "deinem Team";
  const title = `${normalizedTeamName} lädt dich zu RewirePerform ein`;
  const text = `Tritt ${normalizedTeamName} in RewirePerform bei. Dein Teamcode: ${code}`;
  const message = [
    title,
    "",
    "Öffne deine Team-Einladung:",
    url,
    "",
    `Teamcode: ${code}`,
    "Der Link öffnet die App oder führt dich sicher zur Registrierung.",
  ].join("\n");

  return { title, text, url, message };
};

export const buildCoachInvitationShare = (url: string): SharePayload => {
  const title = "Deine persönliche RewirePerform Coach-Einladung";
  const text = "Öffne die Einladung mit deiner bestätigten beruflichen E-Mail-Adresse.";
  const message = `${title}\n\n${text}\n${url}`;
  return { title, text, url, message };
};
