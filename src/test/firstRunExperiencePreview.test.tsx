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
  it("keeps the internal route gated while the approved experience is reused by productive onboarding", () => {
    const preview = readFileSync(
      resolve(process.cwd(), "src/pages/FirstRunExperiencePreview.tsx"),
      "utf8",
    );
    const coachPreview = readFileSync(
      resolve(process.cwd(), "src/pages/CoachFirstRunExperience.tsx"),
      "utf8",
    );
    const app = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
    const welcome = readFileSync(resolve(process.cwd(), "src/pages/Welcome.tsx"), "utf8");

    expect(preview).toContain("useReducedMotion");
    expect(preview).toContain("overflow-clip");
    expect(preview).toContain("cameraViewportRef.current.scrollTop = 0");
    expect(preview).toContain("h-[100dvh]");
    expect(preview).toContain("pb-[max(18px,env(safe-area-inset-bottom))]");
    expect(preview).toContain("md:pb-[max(10px,env(safe-area-inset-bottom))]");
    expect(preview).toContain('data-testid="first-run-stage"');
    expect(preview).toContain("flex min-h-0");
    expect(preview).toContain('data-testid="first-run-footer"');
    expect(preview).toContain("relative z-30");
    expect(preview).not.toContain("<footer className=\"absolute");
    expect(preview).toContain("duration: 0.01");
    expect(preview).toContain("[@media(max-height:800px)]:min-h-[350px]");
    expect(preview).toContain("[@media(max-height:700px)]:h-[350px]");
    expect(preview).toContain("[@media(max-height:500px)]:!h-[210px]");
    expect(preview).toContain("md:h-full md:min-h-0 md:max-h-[700px]");
    expect(preview).not.toContain("md:h-[min(68dvh,700px)]");
    expect(coachPreview).toContain("pb-[max(18px,env(safe-area-inset-bottom))]");
    expect(coachPreview).toContain("md:pb-[max(10px,env(safe-area-inset-bottom))]");
    expect(coachPreview).toContain("md:h-full md:min-h-0 md:max-h-[700px]");
    expect(coachPreview).not.toContain("md:h-[min(68dvh,700px)]");
    expect(preview).not.toContain('id: "pulse"');
    expect(preview).not.toContain('id: "reflection"');
    expect(preview).not.toContain("onClick={() => goTo(index)}");
    expect(app).toContain("FirstRunExperiencePreview = evidencePreviewEnabled");
    expect(app).toContain('path="/internal/first-run-preview"');
    expect(welcome).toContain("import FirstRunExperiencePreview");
    expect(welcome).toContain("onComplete={finish}");
    expect(welcome).toContain("completePostSignupOnboarding");
    expect(welcome).toContain('navigate("/questionnaire"');
  });

  it("moves through the real-system story without account or network actions", () => {
    render(<FirstRunExperiencePreview />);

    expect(screen.getByRole("heading", { name: "Du siehst sofort, was ansteht." })).toBeInTheDocument();
    expect(screen.getByText("Hallo Noah.")).toBeInTheDocument();
    expect(screen.getAllByText("Nimm das vollständige Bild wieder auf").length).toBeGreaterThan(0);
    expect(screen.getByText("10 Tages-Puls-Fragen · eine Mission")).toBeInTheDocument();
    expect(screen.getAllByText("Pre-Training").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tagesjournal").length).toBeGreaterThan(0);
    expect(screen.getByText("Wochenplan")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Zuerst verstehst du den Fokus des Tages." })).toBeInTheDocument();
    expect(screen.getAllByText("Nimm das vollständige Bild wieder auf").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Eine klare Mission bringt ihn in deinen Alltag." })).toBeInTheDocument();
    expect(screen.getByText("Drei Teile ins Bild holen")).toBeInTheDocument();
    expect(screen.getByText("Benenne das reale Problem.")).toBeInTheDocument();
    expect(screen.getByText("Wähle aus dem ganzen Bild deine nächste Handlung.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Ein kurzer Check festigt, was du heute brauchst." })).toBeInTheDocument();
    expect(screen.getByText("Was ist heute ausdrücklich nicht das Ziel?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Vor dem Training siehst du denselben Fokus wieder." })).toBeInTheDocument();
    expect(screen.getByText("Bereit für die nächste Einheit")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Am Abend reflektierst du den echten Tag." })).toBeInTheDocument();
    expect(screen.getByText("Welches Problem hat deinen Blick eng gemacht?")).toBeInTheDocument();
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
    expect(screen.queryByLabelText("Schritt 10 von 10")).not.toBeInTheDocument();
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

  it("uses a truthful questionnaire handoff after registration", () => {
    const onComplete = vi.fn();
    render(
      <FirstRunExperiencePreview
        onComplete={onComplete}
        postSignup
        initialMode="team"
      />,
    );

    for (let index = 0; index < 9; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    }

    expect(screen.queryByRole("group", { name: "Programmweg auswählen" })).not.toBeInTheDocument();
    expect(screen.queryByText("Schon registriert? Anmelden")).not.toBeInTheDocument();
    expect(screen.getByText("Dein nächster Schritt")).toBeInTheDocument();
    expect(screen.getAllByText("Fragebogen starten").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Fragebogen starten" }));
    expect(onComplete).toHaveBeenCalledWith("team");
  }, 15_000);
