import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CoachFirstRunExperience from "@/pages/CoachFirstRunExperience";

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

const next = () => fireEvent.click(screen.getByRole("button", { name: "Weiter" }));

describe("coach first-run experience", () => {
  it("flies through ten truthful coach surfaces and preserves the privacy boundary", () => {
    render(<CoachFirstRunExperience />);

    expect(screen.getByRole("heading", { name: "Dein Team. Klar an einem Ort." })).toBeInTheDocument();
    expect(screen.getByText("Guten Morgen, Coach.")).toBeInTheDocument();

    next();
    expect(screen.getByRole("heading", { name: "Du erkennst, was dein Team heute braucht." })).toBeInTheDocument();
    expect(screen.getByText(/mindestens fünf Athleten/)).toBeInTheDocument();

    next();
    expect(screen.getByRole("heading", { name: "Du siehst Aktivität – keine privaten Antworten." })).toBeInTheDocument();
    expect(screen.getByText(/Keine Journaltexte, Antworten oder individuellen Stimmungswerte/)).toBeInTheDocument();

    next();
    expect(screen.getByRole("heading", { name: "Du kennst denselben Fokus wie dein Team." })).toBeInTheDocument();

    next();
    expect(screen.getByRole("heading", { name: "Aus dem Tagesfokus wird dein Coaching-Anker." })).toBeInTheDocument();

    next();
    expect(screen.getByRole("heading", { name: "Kurze Reviews halten echte Entwicklung fest." })).toBeInTheDocument();

    next();
    expect(screen.getByRole("heading", { name: "Start, Mitte und Ende ergeben einen Verlauf." })).toBeInTheDocument();
    expect(screen.getByText(/Keine Talent-, Startelf- oder Karriereentscheidung/)).toBeInTheDocument();

    next();
    expect(screen.getByRole("heading", { name: "Du steuerst Einladungen und Programmstart." })).toBeInTheDocument();
    expect(screen.getByText(/Team-Link teilen · eigenes bestätigtes Konto/)).toBeInTheDocument();

    next();
    expect(screen.getByRole("heading", { name: "Überblick entsteht, ohne Vertrauen zu brechen." })).toBeInTheDocument();
    expect(screen.getByText("Journaltexte")).toBeInTheDocument();
    expect(screen.getByText("Individuelle psychologische Werte")).toBeInTheDocument();

    next();
    expect(screen.getByRole("heading", { name: "Begleite dein Team mit einem klaren System." })).toBeInTheDocument();
    expect(screen.getByText("Teamzugang anfragen")).toBeInTheDocument();
    expect(screen.queryByLabelText("Schritt 10 von 10")).not.toBeInTheDocument();
  });

  it("hands an invited coach only to the existing personal invitation path", () => {
    const onComplete = vi.fn();
    render(<CoachFirstRunExperience invitation onComplete={onComplete} />);
    for (let index = 0; index < 9; index += 1) next();

    expect(screen.getByText("Deine Einladung ist bereit.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Einladung fortsetzen" }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
