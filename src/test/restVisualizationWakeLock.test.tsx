import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getProgramDayDraft } from "@/content/programV11";
import RestDayVisualizationFlow from "@/prototypes/golden-days/RestDayVisualizationFlow";

describe("rest visualization wake-lock lifecycle", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the screen awake only while a timed eyes-closed phase is running", async () => {
    const releases = [vi.fn(async () => undefined), vi.fn(async () => undefined)];
    let lockIndex = 0;
    const request = vi.fn(async () => ({
      released: false,
      release: releases[lockIndex++],
    }));
    vi.stubGlobal("navigator", { wakeLock: { request } });
    const draft = getProgramDayDraft(1);
    expect(draft).not.toBeNull();

    const view = render(<RestDayVisualizationFlow draft={draft!} />);
    fireEvent.click(screen.getByRole("button", { name: "Visualisierung starten" }));
    fireEvent.click(await screen.findByRole("button", { name: "Atmung starten" }));

    await waitFor(() => expect(request).toHaveBeenCalledWith("screen"));
    fireEvent.click(screen.getByRole("button", { name: "Timer pausieren" }));
    await waitFor(() => expect(releases[0]).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole("button", { name: "Atmung starten" }));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    view.unmount();
    await waitFor(() => expect(releases[1]).toHaveBeenCalledOnce());
  });
});
