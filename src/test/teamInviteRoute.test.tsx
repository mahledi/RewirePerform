import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import TeamInvite from "@/pages/TeamInvite";

const LocationProbe = () => {
  const location = useLocation();
  return <output>{`${location.pathname}${location.search}`}</output>;
};

const renderInvite = (entry: string) => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path="/join" element={<TeamInvite />} />
      <Route path="/auth" element={<LocationProbe />} />
    </Routes>
  </MemoryRouter>,
);

describe("team invite web fallback", () => {
  it("opens the real team registration with the canonical code", () => {
    renderInvite("/join?team=abc123");
    expect(screen.getByText("/auth?mode=signup&intent=join&team=ABC123")).toBeInTheDocument();
  });

  it("fails closed without carrying a malformed code into auth", () => {
    renderInvite("/join?team=ABC%2F12");
    expect(screen.getByText("/auth?mode=signup&intent=join&invite_error=invalid")).toBeInTheDocument();
  });
});
