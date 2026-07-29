import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getAthleteGreeting,
  getAthleteGreetingByHour,
  getFirstName,
} from "@/lib/athleteGreeting";

describe("athlete dashboard greeting", () => {
  it("is wired to the visible Dashboard heading and not duplicated in Daily Check-in", () => {
    const dashboard = readFileSync(
      resolve(process.cwd(), "src/pages/Dashboard.tsx"),
      "utf8",
    );
    const dailyCheckin = readFileSync(
      resolve(process.cwd(), "src/components/dashboard/DailyCheckin.tsx"),
      "utf8",
    );

    expect(dashboard).toContain("getAthleteGreeting(user?.user_metadata?.full_name)");
    expect(dashboard).not.toContain("const getGreeting =");
    expect(dailyCheckin).not.toContain("getAthleteGreeting");
    expect(dailyCheckin).not.toContain("daily-personal-greeting");
  });

  it.each([
    [0, "Guten Morgen"],
    [10, "Guten Morgen"],
    [11, "Hallo"],
    [17, "Hallo"],
    [18, "Guten Abend"],
    [23, "Guten Abend"],
  ])("maps local hour %i to %s", (hour, expected) => {
    expect(getAthleteGreetingByHour(hour)).toBe(expected);
  });

  it("uses only the real first name from existing account metadata", () => {
    expect(getFirstName("  Noah   Müller  ")).toBe("Noah");
    expect(getAthleteGreeting("Noah Müller", new Date(2026, 6, 29, 10, 59))).toBe(
      "Guten Morgen, Noah",
    );
    expect(getAthleteGreeting("Noah Müller", new Date(2026, 6, 29, 11, 0))).toBe(
      "Hallo, Noah",
    );
    expect(getAthleteGreeting("Noah Müller", new Date(2026, 6, 29, 18, 0))).toBe(
      "Guten Abend, Noah",
    );
  });

  it.each([
    [10, "Guten Morgen."],
    [11, "Hallo."],
    [16, "Hallo."],
    [18, "Guten Abend."],
  ])("uses an honest time-based fallback at hour %i", (hour, expected) => {
    expect(getAthleteGreeting(undefined, new Date(2026, 6, 29, hour, 0))).toBe(expected);
    expect(getAthleteGreeting("   ", new Date(2026, 6, 29, hour, 0))).toBe(expected);
  });

  it("fails safely for an invalid hour", () => {
    expect(getAthleteGreetingByHour(-1)).toBe("Hallo");
    expect(getAthleteGreetingByHour(24)).toBe("Hallo");
    expect(getAthleteGreetingByHour(Number.NaN)).toBe("Hallo");
  });
});
