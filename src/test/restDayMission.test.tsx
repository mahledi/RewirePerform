import { fireEvent, render, screen } from "@testing-library/react";
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

describe("RestDayMission completion", () => {
  it("shows only the quiet save status after the visualization", () => {
    renderCompletedMission({ saving: true });

    expect(screen.getByText("Visualisierung abgeschlossen")).toBeInTheDocument();
    expect(screen.getByText("Abschluss wird gespeichert …")).toBeInTheDocument();
    expect(screen.queryByText(/Verständnis/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Journal/i)).not.toBeInTheDocument();
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
