import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AthleteFirstRunEntry from "@/pages/AthleteFirstRunEntry";
import CoachFirstRunEntry from "@/pages/CoachFirstRunEntry";

vi.mock("@/pages/FirstRunExperiencePreview", async () => {
  const React = await import("react");
  return {
    default: ({
      initialMode,
      onComplete,
      onLogin,
    }: {
      initialMode: "solo" | "team";
      onComplete: (mode: "solo" | "team") => void;
      onLogin: () => void;
    }) => React.createElement(
      "div",
      null,
      React.createElement("span", null, `Athlet: ${initialMode}`),
      React.createElement("button", { type: "button", onClick: () => onComplete(initialMode) }, "Athletenflug abschließen"),
      React.createElement("button", { type: "button", onClick: onLogin }, "Athlet anmelden"),
    ),
  };
});

vi.mock("@/pages/CoachFirstRunExperience", async () => {
  const React = await import("react");
  return {
    default: ({
      invitation,
      onComplete,
      onLogin,
    }: {
      invitation: boolean;
      onComplete: () => void;
      onLogin: () => void;
    }) => React.createElement(
      "div",
      null,
      React.createElement("span", null, invitation ? "Persönliche Einladung" : "Coach-Anfrage"),
      React.createElement("button", { type: "button", onClick: onComplete }, "Coachflug abschließen"),
      React.createElement("button", { type: "button", onClick: onLogin }, "Coach anmelden"),
    ),
  };
});

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
};

const renderRoute = (entry: string, kind: "athlete" | "coach") => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path={kind === "athlete" ? "/start/athlete" : "/start/coach"} element={kind === "athlete" ? <AthleteFirstRunEntry /> : <CoachFirstRunEntry />} />
      <Route path="*" element={<LocationProbe />} />
    </Routes>
  </MemoryRouter>,
);

describe("role-first introduction routing", () => {
  it("preserves athlete team intent and code through the flight without changing role truth", () => {
    renderRoute("/start/athlete?intent=join&team=AB12CD&auth_mode=login", "athlete");

    expect(screen.getByText("Athlet: team")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Athletenflug abschließen" }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/auth?mode=login&intent=join&intro=athlete&team=AB12CD",
    );
  });

  it("continues only a strict personal coach invitation into the existing organization auth path", () => {
    const token = "a".repeat(64);
    const redirect = encodeURIComponent(`/organization/invite?token=${token}`);
    renderRoute(`/start/coach?redirect=${redirect}`, "coach");

    expect(screen.getByText("Persönliche Einladung")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Coachflug abschließen" }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      `/auth?mode=signup&intent=organization&redirect=%2Forganization%2Finvite%3Ftoken%3D${token}&intro=coach`,
    );
  });

  it("fails closed to the existing access request when no valid coach invitation exists", () => {
    renderRoute("/start/coach?redirect=https://example.com/organization/invite?token=bad", "coach");

    expect(screen.getByText("Coach-Anfrage")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Coachflug abschließen" }));

    expect(screen.getByTestId("location")).toHaveTextContent("/team-access?scope=single_team");
  });

  it("rejects broadened coach invitation redirects with extra query parameters", () => {
    const token = "a".repeat(64);
    const redirect = encodeURIComponent(`/organization/invite?token=${token}&next=/coach`);
    renderRoute(`/start/coach?redirect=${redirect}`, "coach");

    expect(screen.getByText("Coach-Anfrage")).toBeInTheDocument();
  });
});
