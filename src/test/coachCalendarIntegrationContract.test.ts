import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("coach calendar integration contract", () => {
  it("keeps one calendar data source and removes the squeezed management embed", () => {
    const schedule = readSource("src/components/coach/TeamTrainingSchedule.tsx");
    const management = readSource("src/components/coach/TeamManagement.tsx");

    expect(schedule).toContain('.from("team_calendar_events")');
    expect(schedule).toContain('.upsert(rows, { onConflict: "team_id,date" })');
    expect(schedule).toContain("type EventType = TeamCalendarEventType");
    expect(schedule).toContain("buildTeamCalendarSeriesPlan");
    expect(schedule).toContain("Wettkämpfe werden niemals wiederholt oder überschrieben");
    expect(management).not.toContain("<TeamTrainingSchedule");
    expect(management).toContain("Teamkalender öffnen");
  });

  it("keeps five primary coach tabs and treats calendar as an internal full view", () => {
    const chrome = readSource("src/components/coach/CoachAppChrome.tsx");
    const coach = readSource("src/pages/Coach.tsx");

    expect(chrome).toContain('| "calendar"');
    expect(coach).toContain('variant="full"');
    expect(coach).toContain('tab !== "calendar" && <CoachBottomNavigation');
    expect(coach).toContain("calendarReturnTab");
    expect(chrome.match(/id: "(overview|mental|evidence|toolkit|manage)"/g)).toHaveLength(5);
    expect(chrome).not.toContain('id: "calendar"');
  });

  it("routes the prominent program action into the existing management start block", () => {
    const coach = readSource("src/pages/Coach.tsx");
    const management = readSource("src/components/coach/TeamManagement.tsx");

    expect(coach).toContain("onPrepareProgramStart={() => openProgramStart(selectedTeam.id)}");
    expect(coach).toContain("programStartFocus={programStartFocus}");
    expect(management).toContain("get_team_questionnaire_status");
    expect(management).toContain("Das Programm startet morgen für dein Team.");
    expect(management).toContain("program-start-${team.id}");
  });
});
