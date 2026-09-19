import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import TeamInvite from "@/pages/TeamInvite";

const renderInvite = (entry: string) => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path="/join" element={<TeamInvite />} />
    </Routes>
  </MemoryRouter>,
);

describe("team invite web fallback", () => {
  it("presents a branded web handoff to the real team registration", () => {
    renderInvite("/join?team=abc123");
    expect(screen.getByRole("heading", { name: "Dein Team wartet auf dich." })).toBeInTheDocument();
    expect(screen.getByText("ABC123")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Teambeitritt starten/ })).toHaveAttribute(
      "href",
      "/auth?mode=signup&intent=join&team=ABC123",
    );
    expect(screen.getByRole("link", { name: "RewirePerform im App Store" })).toHaveAttribute(
      "href",
      "https://apps.apple.com/de/app/rewireperform/id6795463263",
    );
  });

  it("fails closed without carrying a malformed code into auth", () => {
    renderInvite("/join?team=ABC%2F12");
    expect(screen.getByRole("alert")).toHaveTextContent("Bitte öffne den vollständigen Link erneut");
    expect(screen.getByRole("link", { name: /Zur Registrierung/ })).toHaveAttribute(
      "href",
      "/auth?mode=signup&intent=join&invite_error=invalid",
    );
    expect(screen.queryByText("ABC/12")).not.toBeInTheDocument();
  });
});
