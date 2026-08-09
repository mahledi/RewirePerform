import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProgramDayDraft } from "@/content/programV11";
import RestDayVisualizationFlow from "@/prototypes/golden-days/RestDayVisualizationFlow";

const audio = vi.hoisted(() => ({
  play: vi.fn(async () => true),
  prime: vi.fn(async () => true),
  startSession: vi.fn(async () => true),
  stopSession: vi.fn(),
}));

vi.mock("@/lib/visualizationChime", () => ({
  playVisualizationChime: audio.play,
  primeVisualizationAudio: audio.prime,
  startVisualizationAudioSession: audio.startSession,
  stopVisualizationAudioSession: audio.stopSession,
  VISUALIZATION_CHIME_STYLES: ["deep", "warm", "clear"],
}));

describe("rest visualization sound UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("gives visible feedback for the test sound without a redundant on/off toggle", async () => {
    const draft = getProgramDayDraft(1);
    render(<RestDayVisualizationFlow draft={draft!} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Abschlusston testen" }));
    });

    expect(audio.play).toHaveBeenCalledWith("deep");
    expect(screen.getByRole("button", { name: "Testton gestartet" })).toBeInTheDocument();
    expect(screen.queryByText("Ton an")).not.toBeInTheDocument();
    expect(screen.queryByText("Ton aus")).not.toBeInTheDocument();
  });

  it("keeps the audio session alive until the real timer completion chime", async () => {
    vi.useFakeTimers();
    const draft = getProgramDayDraft(1);
    render(<RestDayVisualizationFlow draft={draft!} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Visualisierung starten" }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Atmung starten" }));
    });
    expect(audio.startSession).toHaveBeenCalledOnce();

    await act(async () => {
      vi.advanceTimersByTime(120_250);
      await Promise.resolve();
    });

    expect(audio.play).toHaveBeenCalledWith("deep");
    expect(audio.stopSession).toHaveBeenCalled();
    expect(screen.getByText("Der Abschnitt ist beendet. Öffne jetzt deine Augen.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Atmung")).not.toBeInTheDocument();
  });
});
