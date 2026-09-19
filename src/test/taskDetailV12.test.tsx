import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TaskDetail from "@/components/daily/TaskDetail";
import type { DailyTask } from "@/content/matrixDayTypes";

const task: DailyTask = {
  id: "v12-language-test",
  title: "Zurück zur nächsten Aktion",
  why: "Du trainierst heute den Rückweg zu deiner Aufgabe.",
  detailedExplanation:
    "Dein Kopf wird immer wieder abschweifen. Entscheidend ist, dass du es bemerkst und deine Aufmerksamkeit wieder zur nächsten Handlung bringst.",
  concreteAction: "1. Merk kurz: Mein Kopf ist weg.\n2. Frag: Was ist meine nächste Aktion?\n3. Richte Blick und Handlung darauf.",
  systemFunction: "Seed",
  whenToUse: "Sobald du merkst, dass dein Kopf nicht mehr bei der aktuellen Aktion ist.",
  microReframe: "Was ist jetzt meine nächste Aktion?",
  selfTalk: "Nächste Aktion.",
  icon: "target",
};

describe("V1.2 daily mission", () => {
  it("shows the one mission directly and keeps the longer explanation optional", () => {
    render(<TaskDetail task={task} isCompleted={false} onComplete={vi.fn()} />);

    expect(screen.getByTestId("daily-mission")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Zurück zur nächsten Aktion" })).toBeInTheDocument();
    expect(screen.getByText("Nächste Aktion.")).toBeInTheDocument();
    expect(screen.queryByText(/Dein Kopf wird immer wieder abschweifen/)).not.toBeInTheDocument();

    const detailsButton = screen.getByRole("button", { name: "Genauer verstehen" });
    expect(detailsButton).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(detailsButton);
    expect(detailsButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/Dein Kopf wird immer wieder abschweifen/)).toBeInTheDocument();
  });

  it("finishes through one explicit accessible action", () => {
    const onComplete = vi.fn();
    render(<TaskDetail task={task} isCompleted={false} onComplete={onComplete} />);

    fireEvent.click(screen.getByRole("button", { name: "Verstanden" }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
