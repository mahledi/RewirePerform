import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("team calendar settings stability", () => {
  it("uses the dashboard-known team mode immediately and links back to the real plan", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/settings/TrainingAndNotifications.tsx"),
      "utf8",
    );

    expect(source).toContain("getCachedProgramModeInfo(user?.id)");
    expect(source).toContain('initialProgramMode?.mode === "team"');
    expect(source).toContain('navigate("/dashboard#dashboard-plan")');
    expect(source).toContain("Zum Teamkalender");
  });
});
