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
    expect(preview).toContain("duration: 0.01");
    expect(preview).not.toContain("onClick={() => goTo(index)}");
    expect(app).toContain("FirstRunExperiencePreview = evidencePreviewEnabled");
    expect(app).toContain('path="/internal/first-run-preview"');
  });

  it("moves through the real-system story without account or network actions", () => {
    render(<FirstRunExperiencePreview />);

    expect(screen.getByRole("heading", { name: "Du siehst sofort, was ansteht." })).toBeInTheDocument();
    expect(screen.getByText("Hallo Noah")).toBeInTheDocument();
    expect(screen.getByText("10 Tages-Puls-Fragen · 3 Aufgaben")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Kurz einchecken. Klar in den Tag." })).toBeInTheDocument();
    expect(screen.getByText("Wie kommst du heute an?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Dein Anker kommt im richtigen Moment zurück." })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Drei Fragen. Privat festgehalten." })).toBeInTheDocument();
    expect(screen.getByText("Coaches sehen keine Journaltexte.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Du siehst deine Wiederholungen, nicht eine Bewertung." })).toBeInTheDocument();
    expect(screen.getByText("Nicht als Urteil. Als sichtbare Spur deiner Wiederholungen.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Der gleiche klare Ablauf – passend zu deinem Alltag." })).toBeInTheDocument();
    expect(screen.getByText("Journaltexte und freie Antworten sind für Coaches nicht sichtbar.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Dein Weg beginnt mit dem ersten Tag." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Solo" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Registrierung starten")).toBeInTheDocument();
  });

  it("keeps the preview replayable and makes the Solo/Team choice explicit", () => {
    render(<FirstRunExperiencePreview />);

    for (let index = 0; index < 6; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Team" }));

    expect(screen.getByRole("button", { name: "Team" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Solo" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: /Vorschau erneut ansehen/ }));
    expect(screen.getByRole("heading", { name: "Du siehst sofort, was ansteht." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zurück" })).toBeDisabled();
  });
});
