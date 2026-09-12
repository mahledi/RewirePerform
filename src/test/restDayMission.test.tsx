import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RestDayMission from "@/components/daily/RestDayMission";
import { getProgramDayDraft } from "@/content/programV11";

vi.mock("@/lib/nativeNotifications", () => ({
  cancelRestVisualizationReminder: vi.fn().mockResolvedValue(undefined),
  isNativeNotificationsAvailable: vi.fn(() => true),
  scheduleRestVisualizationReminder: vi.fn().mockResolvedValue(undefined),
}));

const draft = getProgramDayDraft(1);

const renderCompletedMission = ({
  saving = false,
  saveError = null,
  onRetrySave = vi.fn(),
}: {
  saving?: boolean;
  saveError?: string | null;
  onRetrySave?: () => void;
} = {}) => {
  if (!draft) throw new Error("Program day draft missing");

  return render(
    <RestDayMission
      draft={draft}
      userId="00000000-0000-4000-8000-000000000001"
      athleteName="Noah"
      date="2026-08-08"
      planMode="now"
      reminderTime="18:00"
      reminderScheduled={false}
      completed
      saving={saving}
      saveError={saveError}
      onPlanModeChange={vi.fn()}
      onReminderTimeChange={vi.fn()}
      onReminderScheduledChange={vi.fn()}
      onComplete={vi.fn()}
      onRetrySave={onRetrySave}
      onCloseForLater={vi.fn()}
    />,
  );
};

const renderPlannedMission = () => {
  if (!draft) throw new Error("Program day draft missing");

  return render(
    <RestDayMission
      draft={draft}
      userId="00000000-0000-4000-8000-000000000001"
      athleteName="Noah"
      date="2026-08-08"
      planMode={null}
      reminderTime="18:00"
      reminderScheduled={false}
      completed={false}
      saving={false}
      saveError={null}
      onPlanModeChange={vi.fn()}
      onReminderTimeChange={vi.fn()}
      onReminderScheduledChange={vi.fn()}
      onComplete={vi.fn()}
      onRetrySave={vi.fn()}
      onCloseForLater={vi.fn()}
    />,
  );
};

const renderActiveMission = (
  onPlanModeChange = vi.fn(),
  onComplete = vi.fn(),
) => {
  if (!draft) throw new Error("Program day draft missing");

  render(
    <RestDayMission
      draft={draft}
      userId="00000000-0000-4000-8000-000000000001"
      athleteName="Noah"
      date="2026-08-08"
      planMode="now"
      reminderTime="18:00"
      reminderScheduled={false}
      completed={false}
      saving={false}
      saveError={null}
      onPlanModeChange={onPlanModeChange}
      onReminderTimeChange={vi.fn()}
      onReminderScheduledChange={vi.fn()}
      onComplete={onComplete}
      onRetrySave={vi.fn()}
      onCloseForLater={vi.fn()}
    />,
  );

  return { onPlanModeChange, onComplete };
};

describe("RestDayMission completion", () => {
  it("introduces the daily focus and sentence before offering the optional explanation", () => {
    renderPlannedMission();

    const title = screen.getByRole("heading", { name: draft?.title });
    const purpose = screen.getByText(draft?.purpose ?? "missing");
    const cue = screen.getByText(draft?.cue ?? "missing");
    const explanationButton = screen.getByRole("button", { name: "Genauer verstehen" });

    expect(title.compareDocumentPosition(purpose) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(purpose.compareDocumentPosition(cue) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(cue.compareDocumentPosition(explanationButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Das visualisierst du")).toBeInTheDocument();
    expect(screen.getByText(/Du gehst eine passende Sportsituation durch/)).toBeInTheDocument();
    expect(explanationButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(draft?.detailedExplanation ?? "missing")).not.toBeInTheDocument();

    fireEvent.click(explanationButton);
    expect(explanationButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(draft?.detailedExplanation ?? "missing")).toBeInTheDocument();
  });

  it("shows only the quiet save status after the visualization", () => {
    renderCompletedMission({ saving: true });

    expect(screen.getByText("Visualisierung abgeschlossen")).toBeInTheDocument();
    expect(screen.getByText("Abschluss wird gespeichert …")).toBeInTheDocument();
    expect(screen.queryByText(/Verständnis/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Journal/i)).not.toBeInTheDocument();
  });

  it("lets an athlete leave an active visualization to plan it for later", async () => {
    const { onPlanModeChange, onComplete } = renderActiveMission();

    fireEvent.click(
      screen.getByRole("button", { name: "Visualisierung starten" }),
    );
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Visualisierung starten" }),
      ).not.toBeInTheDocument();
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Für später planen" }),
    );

    expect(onPlanModeChange).toHaveBeenCalledWith("later");
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("offers one explicit retry when the atomic save failed", () => {
    const onRetrySave = vi.fn();
    renderCompletedMission({
      saveError: "Dein Check-in ist lokal gesichert.",
      onRetrySave,
    });

    fireEvent.click(screen.getByRole("button", { name: "Erneut speichern" }));
    expect(onRetrySave).toHaveBeenCalledTimes(1);
  });

  it("lets an already completed visualization finish through the same save path", () => {
    const onRetrySave = vi.fn();
    renderCompletedMission({ onRetrySave });

    fireEvent.click(screen.getByRole("button", { name: "Zurück zum Dashboard" }));
    expect(onRetrySave).toHaveBeenCalledTimes(1);
  });
});
