import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ComprehensionCheck from "@/components/daily/ComprehensionCheck";
import type { ComprehensionQuestion } from "@/content/matrixDayTypes";

const question: ComprehensionQuestion = {
  id: "q1",
  stem: "Was ist die beste Antwort?",
  options: [
    { id: "a", text: "Richtig" },
    { id: "b", text: "Ablenkung 1" },
    { id: "c", text: "Ablenkung 2" },
    { id: "d", text: "Ablenkung 3" },
  ],
  correctOptionId: "a",
  explanation: "Antwort A bleibt korrekt, auch wenn sie nicht oben steht.",
};

describe("ComprehensionCheck", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("randomizes option order while keeping correctness tied to option ids", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const onComplete = vi.fn();

    render(<ComprehensionCheck questions={[question]} onComplete={onComplete} />);

    const options = screen.getAllByRole("button").filter((button) =>
      button.dataset.testid?.startsWith("comprehension-option-")
    );

    expect(options.map((button) => button.textContent)).toEqual([
      "Ablenkung 1",
      "Ablenkung 2",
      "Ablenkung 3",
      "Richtig",
    ]);

    fireEvent.click(screen.getByTestId("comprehension-option-a"));
    fireEvent.click(screen.getByTestId("comprehension-finish"));

    expect(onComplete).toHaveBeenCalledWith([
      { questionId: "q1", selectedOptionId: "a", isCorrect: true },
    ]);
  });
});
