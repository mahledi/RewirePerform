import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AthleteTransferPulse from "@/components/evidence/AthleteTransferPulse";
import CoachWeeklyReview from "@/components/evidence/CoachWeeklyReview";
import { getTransferPulseForDay } from "@/lib/performanceEvidence";

describe("performance evidence UI", () => {
  it("offers one concise athlete response and a non-scored not-observed choice", () => {
    const pulse = getTransferPulseForDay(18, "training");
    const onValueChange = vi.fn();
    expect(pulse).not.toBeNull();

    render(
      <AthleteTransferPulse
        pulse={pulse!}
        value={null}
        onValueChange={onValueChange}
      />,
    );

    expect(screen.getByRole("heading", { name: "Trotz Unsicherheit handeln" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);

    fireEvent.click(screen.getByRole("radio", { name: "Meistens" }));
    fireEvent.click(screen.getByRole("radio", { name: "Nicht passiert" }));

    expect(onValueChange).toHaveBeenNthCalledWith(1, 3);
    expect(onValueChange).toHaveBeenNthCalledWith(2, "not_observed");
  });

  it("defaults every coach domain to not observed and submits a neutral weekly review", async () => {
    const onSubmit = vi.fn();
    render(<CoachWeeklyReview weekNumber={3} onSubmit={onSubmit} />);

    expect(screen.getByRole("heading", { name: "Teambeobachtung" })).toBeInTheDocument();
    expect(screen.getAllByRole("combobox")).toHaveLength(5);
    expect(screen.getByText("Keine passende Beobachtung")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Beobachtung speichern" }));
    });

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        weekNumber: 3,
        context: "training",
        durationMs: expect.any(Number),
        values: {
          attention_return: "not_observed",
          error_recovery: "not_observed",
          pressure_regulation: "not_observed",
          process_execution: "not_observed",
          action_under_uncertainty: "not_observed",
        },
      });
    });
  });

  it("restores an existing individual coach review without exposing free text", async () => {
    const onSubmit = vi.fn();
    render(
      <CoachWeeklyReview
        weekNumber={5}
        title="Spieler A · Beobachtung"
        description="Nur selbst beobachtete Situationen."
        initialContext="competition"
        initialValues={{ attention_return: 3 }}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByRole("heading", { name: "Spieler A · Beobachtung" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Wettkampf" })).toHaveAttribute("data-state", "on");
    expect(screen.getByRole("combobox", { name: "Aufmerksamkeit zurückholen bewerten" }))
      .toHaveTextContent("Meistens sichtbar");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("keeps a failed coach save retryable and visible", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("offline"));
    render(<CoachWeeklyReview weekNumber={2} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Beobachtung speichern" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Die Beobachtung wurde nicht gespeichert. Bitte versuche es erneut.",
    );
    expect(screen.getByRole("button", { name: "Beobachtung speichern" })).toBeEnabled();
  });
});
