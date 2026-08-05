import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FeedbackQuestionnairePreview } from "@/components/feedback-intelligence/FeedbackQuestionnairePreview";

const openFirstQuestion = async () => {
  fireEvent.click(screen.getByRole("button", { name: /Feedback starten/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Verstanden/ }));
  await screen.findByText("Frage 1");
};

describe("feedback intelligence synthetic preview", () => {
  it("keeps the structured answer when optional text consent is declined", async () => {
    render(<FeedbackQuestionnairePreview day={10} />);
    await openFirstQuestion();

    const structuredAnswer = screen.getByRole("radio", { name: "Sehr verständlich" });
    fireEvent.click(structuredAnswer);
    expect(structuredAnswer).toHaveAttribute("aria-checked", "true");

    fireEvent.click(screen.getByRole("button", { name: "+ Kurz etwas dazu sagen" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/einschließlich KI/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ohne Freitext fortfahren" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Optionaler Feedbacktext" })).not.toBeInTheDocument();
    expect(screen.getByText(/Deine Auswahl bleibt trotzdem gespeichert/)).toBeInTheDocument();
    expect(structuredAnswer).toHaveAttribute("aria-checked", "true");

    fireEvent.click(screen.getByRole("button", { name: /Weiter/ }));
    expect(await screen.findByRole("heading", {
      name: "Wenn eine Aufgabe erscheint: Wie klar ist dir, was du konkret tun sollst?",
    })).toBeInTheDocument();
  });

  it("opens a text field only after explicit consent", async () => {
    render(<FeedbackQuestionnairePreview day={24} />);
    await openFirstQuestion();

    expect(screen.queryByRole("textbox", { name: "Optionaler Feedbacktext" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "+ Kurz etwas dazu sagen" }));
    fireEvent.click(screen.getByRole("button", { name: "Zustimmen und schreiben" }));

    const textField = screen.getByRole("textbox", { name: "Optionaler Feedbacktext" });
    fireEvent.change(textField, { target: { value: "Die Aufgabe war heute zu abstrakt." } });
    expect(textField).toHaveValue("Die Aufgabe war heute zu abstrakt.");
  });

  it("does not reveal the day 55 content context before free recall", async () => {
    render(<FeedbackQuestionnairePreview day={55} />);
    await openFirstQuestion();

    expect(screen.getByRole("heading", {
      name: "Ohne noch einmal in der App nachzusehen: Wie viel aus RewirePerform kannst du gerade frei abrufen?",
    })).toBeInTheDocument();
    expect(screen.queryByText("Volle Qualität ohne Selbstbeweis")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Überspringen" }));
    await waitFor(() => {
      expect(screen.getByText("Volle Qualität ohne Selbstbeweis")).toBeInTheDocument();
      expect(screen.getByRole("heading", {
        name: "Wie oft gab es Inhalte, die du beim Lesen verstanden hast, später aber nicht mehr abrufen konntest?",
      })).toBeInTheDocument();
    });
  });

  it("hides every optional text affordance while the live text gate is closed", async () => {
    render(<FeedbackQuestionnairePreview day={10} mode="live" textEnabled={false} />);
    await openFirstQuestion();

    expect(screen.queryByRole("button", { name: "+ Kurz etwas dazu sagen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("submits the full live snapshot before showing completion", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <FeedbackQuestionnairePreview
        day={24}
        mode="live"
        initialScreen="closing"
        initialAnswers={{ d24_content_clarity: ["1"] }}
        initialPassedQuestionIds={["d24_content_clarity"]}
        initialConsentState="declined"
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Feedback abschließen/ }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      answers: { d24_content_clarity: ["1"] },
      textConsentState: "declined",
      resumeScreen: "closing",
    })));
    expect(await screen.findByText("Danke für deinen Zwischenstand.")).toBeInTheDocument();
  });

  it("autosaves a changed live answer without waiting for final submit", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <FeedbackQuestionnairePreview
        day={10}
        mode="live"
        initialScreen="questions"
        initialQuestionId="d10_content_clarity"
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Sehr verständlich" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      answers: { d10_content_clarity: ["1"] },
      resumeScreen: "questions",
      resumeQuestionId: "d10_content_clarity",
    })), { timeout: 1_500 });
  });
});
