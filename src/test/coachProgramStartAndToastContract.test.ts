import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("coach program-start and transient-notice contracts", () => {
  it("locks a confirmed program start in both the coach surface and database boundary", () => {
    const management = readSource("src/components/coach/TeamManagement.tsx");
    const migration = readSource("supabase/migrations/20260830100000_lock_activated_team_program_start_v1_3.sql");

    expect(management).toContain("!team.program_activated_at && (");
    expect(management).toContain("Programmstart verbindlich festgelegt");
    expect(management).toContain("Tageszuordnung und Messungen eindeutig bleiben");
    expect(migration).toContain("OLD.program_activated_at IS NOT NULL");
    expect(migration).toContain("NEW.program_start_date IS DISTINCT FROM OLD.program_start_date");
    expect(migration).toContain("BEFORE UPDATE OF program_start_date ON public.teams");
    expect(migration).toContain("program_start_locked");
    expect(migration).toContain("REVOKE ALL ON FUNCTION");
  });

  it("uses one short, dismissible toast system away from coach navigation", () => {
    const app = readSource("src/App.tsx");
    const sonner = readSource("src/components/ui/sonner.tsx");

    expect(app).not.toContain('import { Toaster } from "@/components/ui/toaster"');
    expect(app).toContain("<Sonner />");
    expect(sonner).toContain('position="top-center"');
    expect(sonner).toContain("duration={3200}");
    expect(sonner).toContain("visibleToasts={1}");
    expect(sonner).toContain("closeButton");
  });
});
