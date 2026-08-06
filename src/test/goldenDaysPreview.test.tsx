import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import GoldenDaysPreview from "@/pages/GoldenDaysPreview";
import ProgramContentPreview from "@/pages/ProgramContentPreview";
import { GOLDEN_DAY_DRAFTS } from "@/prototypes/golden-days/goldenDayDrafts";
import { PROGRAM_DAY_DRAFTS } from "@/prototypes/golden-days/programDayDrafts";

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
  const motionCache = new Map<string | symbol, ReturnType<typeof createMotion>>();

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: new Proxy({}, {
      get: (_target, property) => {
        const cached = motionCache.get(property);
        if (cached) return cached;
        const component = createMotion(String(property));
        motionCache.set(property, component);
        return component;
      },
    }),
    useReducedMotion: () => false,
  };
});

const athleteText = (value: unknown): string => JSON.stringify(value);
const words = (value: string): number => value.trim().split(/\s+/u).filter(Boolean).length;

describe("Golden Days V1.1 content contract", () => {
  it("contains the ten approved, unique Golden Days", () => {
    expect(GOLDEN_DAY_DRAFTS.map((draft) => draft.day)).toEqual([1, 2, 4, 6, 8, 10, 15, 28, 33, 51]);
    expect(new Set(GOLDEN_DAY_DRAFTS.map((draft) => draft.day)).size).toBe(10);
  });

  it("keeps one compact mission, one stable cue, and bounded reflection per day", () => {
    for (const draft of GOLDEN_DAY_DRAFTS) {
      expect(draft.cue.trim().length).toBeGreaterThan(0);
      expect(draft.mission.steps.length).toBeGreaterThanOrEqual(2);
      expect(draft.mission.steps.length).toBeLessThanOrEqual(3);
      expect(draft.journal.questions.filter(Boolean).length).toBeGreaterThanOrEqual(2);
      expect(draft.journal.questions.filter(Boolean).length).toBeLessThanOrEqual(3);
      expect(draft.journal.gratitudeMinWords).toBeGreaterThanOrEqual(6);
      expect(draft.comprehension.options).toHaveLength(3);
      expect(draft.comprehension.options.some((option) => option.id === draft.comprehension.correctOptionId)).toBe(true);
    }
  });

  it("uses short Science Bites and no blocked editorial jargon", () => {
    const blocked = [
      "Prozesspunkt",
      "funktional flach",
      "Lernraum",
      "Grundweite",
      "Ego-Zusatz",
      "Selbstprojekt",
      "automatische Enge",
      "neuroplast",
    ];

    for (const draft of GOLDEN_DAY_DRAFTS) {
      const bite = [draft.scienceBite.title, ...draft.scienceBite.paragraphs].join(" ");
      expect(words(bite)).toBeGreaterThanOrEqual(35);
      expect(words(bite)).toBeLessThanOrEqual(80);
      for (const phrase of blocked) {
        expect(athleteText(draft).toLocaleLowerCase("de")).not.toContain(phrase.toLocaleLowerCase("de"));
      }
    }
  });

  it("never invents a pre-training step on an approved rest-day draft", () => {
    const restDays = GOLDEN_DAY_DRAFTS.filter((draft) => draft.context === "rest");
    expect(restDays.map((draft) => draft.day)).toEqual([2, 15]);
    expect(restDays.every((draft) => draft.preTraining === null)).toBe(true);
  });

  it("keeps special truth boundaries explicit", () => {
    const day4 = GOLDEN_DAY_DRAFTS.find((draft) => draft.day === 4);
    const day6 = GOLDEN_DAY_DRAFTS.find((draft) => draft.day === 6);
    const day28 = GOLDEN_DAY_DRAFTS.find((draft) => draft.day === 28);
    const day51 = GOLDEN_DAY_DRAFTS.find((draft) => draft.day === 51);

    expect(day4?.contextChange?.after).toBe("rest");
    expect(day6?.missedReviews?.length).toBeLessThanOrEqual(3);
    expect(day28?.integrationTools).toHaveLength(7);
    expect(day28?.measurementBoundary?.body).toContain("weder deinen Wert noch beweist");
    expect(day28?.measurementBoundary?.privacy).toContain("Journaltexte");
    expect(day51?.cue).toBe("Passiert. Lernen. Weiter.");
    expect(day51?.mission.steps).toHaveLength(3);
  });
});

describe("Golden Days V1.1 internal preview", () => {
  it("is behind the existing internal evidence gate", () => {
    const app = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
    expect(app).toContain("GoldenDaysPreview = evidencePreviewEnabled");
    expect(app).toContain('path="/internal/golden-days-preview"');
  });

  it("moves through a Golden Day without account, persistence, or network state", () => {
    render(<GoldenDaysPreview />);

    expect(screen.getByTestId("golden-day-progress")).not.toHaveClass("border-b");
    expect(screen.getByRole("heading", { name: "Zurück zur nächsten Aktion" })).toBeInTheDocument();
    expect(screen.getByText("Nächste Aktion.")).toBeInTheDocument();
    expect(screen.queryByText(/W1/u)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Deine Aufmerksamkeit kann nicht überall gleichzeitig sein." })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Drift merken und zurückkommen" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    fireEvent.click(screen.getByRole("radio", { name: /Das Abschweifen merken und die nächste Aktion finden/ }));
    expect(screen.getByText(/Erst merken, dann zur nächsten konkreten Aktion/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Erst erinnern. Dann deinen Satz sehen." })).toBeInTheDocument();
    expect(screen.queryByText("Denk an den Rückweg, nicht an perfekten Fokus.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Weiter" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Eigene Erinnerung"), { target: { value: "Ich merke es und kehre zurück." } });
    fireEvent.click(screen.getByRole("button", { name: /Erinnerung prüfen/ }));
    expect(screen.getByText("Nächste Aktion.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Weiter" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Wo kam ich heute zurück?" })).toBeInTheDocument();
    expect(screen.getByText("Journal · 1 von 4")).toBeInTheDocument();
  });

  it("removes pre-training from rest days and exposes the approved special cases", () => {
    render(<GoldenDaysPreview />);

    fireEvent.click(screen.getByRole("button", { name: "Tag 2" }));
    expect(screen.getAllByText("Ruhetag").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Vor der Einheit" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tag 4" }));
    fireEvent.click(screen.getByRole("button", { name: "Sonderfall" }));
    expect(screen.getByText("Planänderung nach dem Check-in")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Auf Ruhetag ändern" }));
    expect(screen.getByText(/Statt einer erfundenen Trainingsanwendung/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tag 28" }));
    fireEvent.click(screen.getByRole("button", { name: "Sonderfall" }));
    expect(screen.getByText("Werkzeugbild · erkennen, nicht siebenmal bearbeiten")).toBeInTheDocument();
    expect(screen.getByText("Dein Zwischenstand ist ein Messpunkt, kein Urteil.")).toBeInTheDocument();
    expect(screen.queryByText(/^W[1-7]$/u)).not.toBeInTheDocument();
  });
});

describe("complete 56-day V1.1 internal preview", () => {
  it("is isolated behind the same internal evidence gate", () => {
    const app = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
    expect(app).toContain("ProgramContentPreview = evidencePreviewEnabled");
    expect(app).toContain('path="/internal/program-content-preview"');
  });

  it("exposes all 56 authored days in the redaction lab", () => {
    render(<ProgramContentPreview />);

    expect(PROGRAM_DAY_DRAFTS).toHaveLength(56);
    expect(screen.getByRole("button", { name: "Tag 56" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tag 56" }));
    expect(screen.getByRole("heading", { name: "Erkenne, wähle und nutze dein passendes Werkzeug" })).toBeInTheDocument();
    expect(screen.getByText("Erkennen. Wählen. Anwenden.")).toBeInTheDocument();
  });

  it("keeps one day anchor while the real context changes its execution", () => {
    render(<ProgramContentPreview />);

    fireEvent.click(screen.getByRole("button", { name: "Tag 2" }));
    expect(screen.getAllByText("Ruhetag").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Vor der Einheit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mission" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zeit wählen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mentale Einheit" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Zeit wählen" }));
    expect(screen.getByRole("heading", { name: "Wann passt deine mentale Einheit?" })).toBeInTheDocument();
    expect(screen.getByText(/Dein heutiger Satz und dein Lernziel bleiben gleich/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Jetzt starten/ }));
    expect(screen.getByRole("button", { name: /^Jetzt starten/ })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Überblick" }));
    fireEvent.click(screen.getByRole("button", { name: "Training" }));
    expect(screen.getByRole("button", { name: "Vor der Einheit" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Was braucht die Aufgabe?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Vor der Einheit" }));
    expect(screen.getByText("Pre-Training")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Überblick" }));
    fireEvent.click(screen.getByRole("button", { name: "Wettkampf" }));
    fireEvent.click(screen.getByRole("button", { name: "Vor der Einheit" }));
    expect(screen.getByText("Pre-Wettkampf")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Überblick" }));
    fireEvent.click(screen.getByRole("button", { name: "Ruhetag" }));
    expect(screen.queryByRole("button", { name: "Vor der Einheit" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Was braucht die Aufgabe?" })).toBeInTheDocument();
  });

  it("guides a rest-day session through every phase before the journal", () => {
    render(<ProgramContentPreview />);

    fireEvent.click(screen.getByRole("button", { name: "Tag 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Mentale Einheit" }));
    expect(screen.getByRole("heading", { name: "Deine Einheit ist bereit." })).toBeInTheDocument();
    expect(screen.getByText("Du musst kein perfektes Bild sehen.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Einheit abschließen" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /Verstanden/ }));
    fireEvent.click(screen.getByRole("button", { name: /Geführt starten/ }));
    expect(screen.getByText("Schritt 1 von 7")).toBeInTheDocument();

    for (let phase = 1; phase < 7; phase += 1) {
      fireEvent.click(screen.getByRole("button", { name: /^Weiter$/ }));
      expect(screen.getByText(`Schritt ${phase + 1} von 7`)).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("button", { name: "Abschließen" }));
    expect(screen.getByTestId("rest-visualization-flow")).toHaveAttribute("data-step", "complete");
    expect(screen.getByText("Mentale Einheit abgeschlossen")).toBeInTheDocument();
    expect(screen.getByText("Was braucht die Aufgabe?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Weiter" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Was brauchte die Aufgabe?" })).toBeInTheDocument();
    expect(screen.getByText("Journal · 1 von 3")).toBeInTheDocument();
  });
});
