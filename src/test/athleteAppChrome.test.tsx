import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import {
  AthleteBottomNavigation,
  AthleteScreenHeader,
} from "@/components/app/AthleteAppChrome";

const CurrentLocation = () => {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.hash}`}</output>;
};

describe("athlete app navigation", () => {
  it("uses real routes for today, progress and settings", () => {
    vi.useFakeTimers();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AthleteBottomNavigation active="today" />
        <CurrentLocation />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Entwicklung" }));
    expect(screen.getByRole("button", { name: "Entwicklung" })).toHaveAttribute("aria-current", "page");
    act(() => vi.advanceTimersByTime(150));
    expect(screen.getByTestId("location")).toHaveTextContent("/progress");

    fireEvent.click(screen.getByRole("button", { name: "Plan" }));
    act(() => vi.advanceTimersByTime(150));
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard#dashboard-plan");

    fireEvent.click(screen.getByRole("button", { name: "Mehr" }));
    act(() => vi.advanceTimersByTime(150));
    expect(screen.getByTestId("location")).toHaveTextContent("/settings");

    fireEvent.click(screen.getByRole("button", { name: "Heute" }));
    act(() => vi.advanceTimersByTime(150));
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
    vi.useRealTimers();
  });

  it("keeps the dashboard plan interaction in the real dashboard", () => {
    const onPlan = vi.fn();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AthleteBottomNavigation active="today" onPlan={onPlan} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Plan" }));
    expect(onPlan).toHaveBeenCalledTimes(1);
  });

  it("cancels a pending route change when a newer tab tap wins", () => {
    vi.useFakeTimers();
    const onPlan = vi.fn();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AthleteBottomNavigation active="today" onPlan={onPlan} />
        <CurrentLocation />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Entwicklung" }));
    fireEvent.click(screen.getByRole("button", { name: "Heute" }));
    act(() => vi.advanceTimersByTime(150));
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
    expect(screen.getByRole("button", { name: "Heute" })).toHaveAttribute("aria-current", "page");

    fireEvent.click(screen.getByRole("button", { name: "Entwicklung" }));
    fireEvent.click(screen.getByRole("button", { name: "Plan" }));
    act(() => vi.advanceTimersByTime(150));
    expect(onPlan).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
    expect(screen.getByRole("button", { name: "Plan" })).toHaveAttribute("aria-current", "page");
    vi.useRealTimers();
  });

  it("exposes a named back control on full-screen flows", () => {
    const onBack = vi.fn();
    render(
      <MemoryRouter>
        <Routes>
          <Route
            path="*"
            element={(
              <AthleteScreenHeader
                title="Tagesjournal"
                eyebrow="Tag 18"
                onBack={onBack}
                backLabel="Zurück zum Dashboard"
              />
            )}
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Zurück zum Dashboard" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Tagesjournal")).toBeInTheDocument();
  });
});
