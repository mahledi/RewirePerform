import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildTeamInviteUrl,
  parseTeamInviteUrl,
  teamInviteAuthRoute,
} from "@/lib/teamInvite";
import {
  buildAthleteTeamInvitation,
  buildCoachInvitationShare,
} from "@/lib/invitationShare";

describe("team invite links", () => {
  it("builds one canonical HTTPS link and one internal join route", () => {
    expect(buildTeamInviteUrl(" abc123 ")).toBe("https://rewireperform.com/join?team=ABC123");
    expect(teamInviteAuthRoute("ABC123")).toBe("/auth?mode=signup&intent=join&team=ABC123");
    expect(teamInviteAuthRoute("BAD/12")).toBe("/auth?mode=signup&intent=join&invite_error=invalid");
  });

  it("accepts only the exact production origin, path and one six-character code", () => {
    expect(parseTeamInviteUrl("https://rewireperform.com/join?team=abc123")).toEqual({
      kind: "invite",
      teamCode: "ABC123",
    });

    for (const url of [
      "http://rewireperform.com/join?team=ABC123",
      "https://www.rewireperform.com/join?team=ABC123",
      "https://rewireperform.com/auth?team=ABC123",
    ]) {
      expect(parseTeamInviteUrl(url)).toEqual({ kind: "ignore" });
    }

    for (const url of [
      "https://rewireperform.com/join",
      "https://rewireperform.com/join?team=ABC12",
      "https://rewireperform.com/join?team=ABC%2F12",
      "https://rewireperform.com/join?team=ABC123&team=DEF456",
      "https://rewireperform.com/join?team=ABC123&redirect=https%3A%2F%2Fevil.example",
      "https://user:password@rewireperform.com/join?team=ABC123",
      "https://rewireperform.com/join?team=ABC123#access_token=secret",
    ]) {
      expect(parseTeamInviteUrl(url)).toEqual({ kind: "invalid" });
    }
  });

  it("does not build a shareable URL from malformed input", () => {
    expect(buildTeamInviteUrl("ABC/12")).toBeNull();
  });

  it("keeps coach sharing on the canonical app-and-web link", () => {
    const teamManagement = readFileSync("src/components/coach/TeamManagement.tsx", "utf8");
    expect(teamManagement).toContain("buildAthleteTeamInvitation(team.name, team.access_code)");
    expect(teamManagement).not.toContain("/auth?intent=join&code=${team.access_code}");
  });

  it("builds a professional athlete share payload without hiding the canonical link", () => {
    expect(buildAthleteTeamInvitation("SV Beispiel U19", "abc123")).toEqual({
      title: "SV Beispiel U19 lädt dich zu RewirePerform ein",
      text: "Tritt SV Beispiel U19 in RewirePerform bei. Dein Teamcode: ABC123",
      url: "https://rewireperform.com/join?team=ABC123",
      message: [
        "SV Beispiel U19 lädt dich zu RewirePerform ein",
        "",
        "Öffne deine Team-Einladung:",
        "https://rewireperform.com/join?team=ABC123",
        "",
        "Teamcode: ABC123",
        "Der Link öffnet die App oder führt dich sicher zur Registrierung.",
      ].join("\n"),
    });
    expect(buildAthleteTeamInvitation("SV Beispiel", "BAD/12")).toBeNull();
  });

  it("builds the Co-Coach share payload from the same canonical app-and-web code link", () => {
    const code = "A1B2C3D4E5F60718293A";
    const invitation = buildCoachInvitationShare("SV Beispiel U19", code);
    expect(invitation).toMatchObject({
      title: "SV Beispiel U19 lädt dich als Co-Coach zu RewirePerform ein",
      url: `https://rewireperform.com/organization/invite?coach=${code}`,
    });
    expect(invitation?.message).toContain("Coach-Code: A1B2-C3D4-E5F6-0718-293A");
    expect(invitation?.message).toContain(`https://rewireperform.com/organization/invite?coach=${code}`);
    expect(buildCoachInvitationShare("SV Beispiel", "BAD-CODE")).toBeNull();
  });
});
