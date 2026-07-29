import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getAthleteGreetingByHour,
  getDailyCheckinGreeting,
  getFirstName,
} from "@/lib/athleteGreeting";

describe("athlete Daily Check-in greeting", () => {
  it("is wired to the real signed-in account and stays neutral in preview mode", () => {
    const dailyCheckin = readFileSync(
      resolve(process.cwd(), "src/components/dashboard/DailyCheckin.tsx"),
      "utf8",
    );

    expect(dailyCheckin).toContain("getDailyCheckinGreeting(");
    expect(dailyCheckin).toContain("previewMode ? null : user?.user_metadata?.full_name");
    expect(dailyCheckin).toContain('data-testid="daily-personal-greeting"');
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
    expect(getDailyCheckinGreeting("Noah Müller", new Date(2026, 6, 29, 10, 59))).toBe(
      "Guten Morgen, Noah",
    );
    expect(getDailyCheckinGreeting("Noah Müller", new Date(2026, 6, 29, 11, 0))).toBe(
      "Hallo, Noah",
    );
    expect(getDailyCheckinGreeting("Noah Müller", new Date(2026, 6, 29, 18, 0))).toBe(
      "Guten Abend, Noah",
    );
  });

  it.each([undefined, null, "", "   "])(
    "uses an honest neutral fallback when no name is available",
    (fullName) => {
      expect(getDailyCheckinGreeting(fullName, new Date(2026, 6, 29, 20, 0))).toBe(
        "Willkommen zu deinem Daily Flow.",
      );
    },
  );

  it("fails safely for an invalid hour", () => {
    expect(getAthleteGreetingByHour(-1)).toBe("Hallo");
    expect(getAthleteGreetingByHour(24)).toBe("Hallo");
    expect(getAthleteGreetingByHour(Number.NaN)).toBe("Hallo");
  });
});
