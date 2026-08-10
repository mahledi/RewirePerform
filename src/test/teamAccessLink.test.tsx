import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeamAccessLink, {
  buildPublicTeamAccessUrl,
  buildTeamAccessPath,
} from "@/components/access/TeamAccessLink";

const mocks = vi.hoisted(() => ({
  isNativePlatform: vi.fn(() => false),
  open: vi.fn(() => Promise.resolve()),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: mocks.isNativePlatform },
}));

vi.mock("@capacitor/browser", () => ({
  Browser: { open: mocks.open },
}));

describe("team access link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isNativePlatform.mockReturnValue(false);
  });

  it("keeps web visitors in the canonical internal route", () => {
    expect(buildTeamAccessPath()).toBe("/team-access");
    expect(buildTeamAccessPath("single_team")).toBe("/team-access?scope=single_team");

    render(<MemoryRouter><TeamAccessLink scope="single_team">Team starten</TeamAccessLink></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Team starten" })).toHaveAttribute(
      "href",
      "/team-access?scope=single_team",
    );
  });

  it("opens the central HTTPS form in the native Safari surface", () => {
    mocks.isNativePlatform.mockReturnValue(true);
    render(<MemoryRouter><TeamAccessLink scope="organization">Organisation starten</TeamAccessLink></MemoryRouter>);

    fireEvent.click(screen.getByRole("link", { name: "Organisation starten" }));

    expect(mocks.open).toHaveBeenCalledWith({
      url: "https://rewireperform.com/team-access?scope=organization&source=ios",
      presentationStyle: "fullscreen",
      toolbarColor: "#0D0E12",
    });
    expect(buildPublicTeamAccessUrl("single_team")).toBe(
      "https://rewireperform.com/team-access?scope=single_team&source=ios",
    );
  });
});
