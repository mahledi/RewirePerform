import { buildTeamInviteUrl, normalizeTeamInviteCode } from "@/lib/teamInvite";
import {
  buildCoachInviteUrl,
  formatCoachInviteCode,
  normalizeCoachInviteCode,
} from "@/lib/organizationInvite";

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

export const buildCoachInvitationShare = (
  teamName: string,
  rawCode: string,
): SharePayload | null => {
  const code = normalizeCoachInviteCode(rawCode);
  const formattedCode = formatCoachInviteCode(rawCode);
  const url = buildCoachInviteUrl(rawCode);
  if (!code || !formattedCode || !url) return null;

  const normalizedTeamName = teamName.trim() || "Dein Coach-Team";
  const title = `${normalizedTeamName} lädt dich als Co-Coach zu RewirePerform ein`;
  const text = `Verbinde dich als Co-Coach mit ${normalizedTeamName}. Dein Coach-Code: ${formattedCode}`;
  const message = [
    title,
    "",
    "Öffne deine Co-Coach-Einladung:",
    url,
    "",
    `Coach-Code: ${formattedCode}`,
    "Der Link öffnet die App oder führt dich sicher durch die Coach-Registrierung.",
  ].join("\n");

  return { title, text, url, message };
};
