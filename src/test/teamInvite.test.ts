import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildTeamInviteUrl,
  parseTeamInviteUrl,
  teamInviteAuthRoute,
} from "@/lib/teamInvite";

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
    expect(teamManagement).toContain("buildTeamInviteUrl(team.access_code)");
    expect(teamManagement).not.toContain("/auth?intent=join&code=${team.access_code}");
  });
});
