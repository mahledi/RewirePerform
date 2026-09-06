import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import QuestionCard from "@/components/questionnaire/QuestionCard";
import { questions } from "@/data/questionnaireData";
import {
  CUSTOM_ANSWER_MAX_LENGTH,
  CUSTOM_ANSWER_OPTION_ID,
  applyPrivateCustomAnswer,
  countCanonicalQuestionnaireAnswers,
  customAnswerKey,
  normalizeCustomAnswer,
  supportsPrivateCustomAnswer,
} from "@/lib/questionnaireCustomAnswers";

describe("private questionnaire answer additions", () => {
  it("enables the private addition only for semantic choice questions", () => {
    expect(supportsPrivateCustomAnswer(questions.find((q) => q.id === "mot-01")!)).toBe(true);
    expect(supportsPrivateCustomAnswer(questions.find((q) => q.id === "focus-02")!)).toBe(true);
    expect(supportsPrivateCustomAnswer(questions.find((q) => q.id === "mot-02")!)).toBe(false);
    expect(supportsPrivateCustomAnswer(questions.find((q) => q.id === "mot-04")!)).toBe(false);
    expect(supportsPrivateCustomAnswer(questions.find((q) => q.id === "sport-03")!)).toBe(false);
  });

  it("renders a voluntary private field without replacing the scored selection", () => {
    const question = questions.find((candidate) => candidate.id === "mot-01")!;
    const onAnswer = vi.fn();
    const onCustomAnswer = vi.fn();
    render(
      <QuestionCard
        question={question}
        answer="process"
        onAnswer={onAnswer}
        customAnswer=""
        onCustomAnswer={onCustomAnswer}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Eigene Antwort ergänzen" }));
    expect(screen.getByText("Du kannst damit auch ohne Auswahl antworten. Privat: Dein Coach sieht diesen Text nicht.")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Eigene Antwort" }), {
      target: { value: "Meine Mannschaft und mein eigener Fortschritt" },
    });
    expect(onCustomAnswer).toHaveBeenCalledWith("Meine Mannschaft und mein eigener Fortschritt");
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("stores private additions under a non-question key and excludes them from progress counts", () => {
    const key = customAnswerKey("mot-01");
    expect(key).not.toBe("mot-01");
    expect(countCanonicalQuestionnaireAnswers(
      { "mot-01": "process", [key]: "Team" },
      new Set(["mot-01"]),
    )).toBe(1);
    expect(normalizeCustomAnswer("x".repeat(400))).toHaveLength(CUSTOM_ANSWER_MAX_LENGTH);
  });

  it("accepts free text as the whole answer without inventing a scored option", () => {
    const added = applyPrivateCustomAnswer({}, "mot-01", "Gemeinsam besser werden");
    expect(added).toEqual({
      "mot-01": CUSTOM_ANSWER_OPTION_ID,
      [customAnswerKey("mot-01")]: "Gemeinsam besser werden",
    });

    const cleared = applyPrivateCustomAnswer(added, "mot-01", "   ");
    expect(cleared).toEqual({});

    const selected = applyPrivateCustomAnswer({ "mot-01": "process" }, "mot-01", "Team");
    expect(selected["mot-01"]).toBe("process");
  });
});
