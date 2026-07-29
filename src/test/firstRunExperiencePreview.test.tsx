import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import FirstRunExperiencePreview from "@/pages/FirstRunExperiencePreview";

vi.mock("framer-motion", async () => {
  const React = await import("react");
  type MotionMockProps = React.HTMLAttributes<HTMLElement> & {
    initial?: unknown;
    animate?: unknown;
    exit?: unknown;
    transition?: unknown;
  };
  const createMotion = (tag: string) => React.forwardRef<HTMLElement, MotionMockProps>(
    ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }, ref) =>
      React.createElement(tag, { ...props, ref }, children),
  );

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: new Proxy({}, { get: (_target, property) => createMotion(String(property)) }),
    useReducedMotion: () => false,
  };
});

describe("first run experience preview", () => {
  it("keeps the cinematic preview internal, scroll-stable and reduced-motion aware", () => {
    const preview = readFileSync(
      resolve(process.cwd(), "src/pages/FirstRunExperiencePreview.tsx"),
      "utf8",
    );
    const app = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");

    expect(preview).toContain("useReducedMotion");
    expect(preview).toContain("overflow-clip");
    expect(preview).toContain("cameraViewportRef.current.scrollTop = 0");
    expect(preview).toContain("h-[100dvh]");
    expect(preview).toContain("bottom-[max(18px,env(safe-area-inset-bottom))]");
    expect(preview).toContain("absolute inset-x-4");
    expect(preview).toContain("duration: 0.01");
    expect(preview).not.toContain('id: "pulse"');
    expect(preview).not.toContain('id: "reflection"');
    expect(preview).not.toContain("onClick={() => goTo(index)}");
    expect(app).toContain("FirstRunExperiencePreview = evidencePreviewEnabled");
    expect(app).toContain('path="/internal/first-run-preview"');
  });

  it("moves through the real-system story without account or network actions", () => {
    render(<FirstRunExperiencePreview />);

    expect(screen.getByRole("heading", { name: "Du siehst sofort, was ansteht." })).toBeInTheDocument();
    expect(screen.getByText("Hallo Noah.")).toBeInTheDocument();
    expect(screen.getAllByText("Dein Prozess ist dein Arbeitsfokus").length).toBeGreaterThan(0);
    expect(screen.getByText("10 Tages-Puls-Fragen · 3 Aufgaben")).toBeInTheDocument();
    expect(screen.getAllByText("Pre-Training").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tagesjournal").length).toBeGreaterThan(0);
    expect(screen.getByText("Wochenplan")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Zuerst verstehst du den Fokus des Tages." })).toBeInTheDocument();
    expect(screen.getByText("Ein System bleibt stabiler, wenn es weiß, wohin es zurückkehrt")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Drei konkrete Aufgaben bringen ihn in deinen Alltag." })).toBeInTheDocument();
    expect(screen.getAllByText("Lege deinen Prozessanker fest").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Kehre an den Arbeitsort zurück").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Arbeite von dort aus weiter").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Ein kurzer Check festigt, was du heute brauchst." })).toBeInTheDocument();
    expect(screen.getByText("Was heißt „Prozess als Heimat“?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Vor dem Training siehst du denselben Fokus wieder." })).toBeInTheDocument();
    expect(screen.getByText("Bereit für die nächste Einheit")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Am Abend reflektierst du den echten Tag." })).toBeInTheDocument();
    expect(screen.getByText("Was war heute mein klarer Prozessanker?")).toBeInTheDocument();
    expect(screen.getByText("Deine Journalantworten bleiben privat.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Du siehst deine Wiederholungen, nicht eine Bewertung." })).toBeInTheDocument();
    expect(screen.getByText("Nicht als Urteil. Als sichtbare Spur deiner Wiederholungen.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Viele Signale. Ein gemeinsamer Verlauf." })).toBeInTheDocument();
    expect(screen.getByText("Nicht ein Test. Ein Verlauf.")).toBeInTheDocument();
    expect(screen.getByText("Programmtage")).toBeInTheDocument();
    expect(screen.getByText("Bis zu 16")).toBeInTheDocument();
    expect(screen.getByText("Coach-Reviews im Team")).toBeInTheDocument();
    expect(screen.getByText("Du entscheidest. Keine Bewertung deiner Person.")).toBeInTheDocument();
    expect(screen.getByText(/individuelle Coach-Werte fließen nicht in diese Zusammenfassung ein/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Der gleiche klare Ablauf – passend zu deinem Alltag." })).toBeInTheDocument();
    expect(screen.getByText("Coach-Termine und deine mentale Praxis in einer gemeinsamen Linie.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Dein Weg beginnt mit dem ersten Tag." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Solo" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Registrierung starten")).toBeInTheDocument();
  }, 15_000);

  it("keeps the preview replayable and makes the Solo/Team choice explicit", () => {
    render(<FirstRunExperiencePreview />);

    for (let index = 0; index < 9; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Team" }));

    expect(screen.getByRole("button", { name: "Team" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Solo" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: /Vorschau erneut ansehen/ }));
    expect(screen.getByRole("heading", { name: "Du siehst sofort, was ansteht." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zurück" })).toBeDisabled();
  }, 15_000);
});
