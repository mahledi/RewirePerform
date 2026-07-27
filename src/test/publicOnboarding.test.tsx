import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import Welcome from "@/pages/Welcome";
import {
  completePublicOnboarding,
  hasCompletedPublicOnboarding,
  PUBLIC_ONBOARDING_STORAGE_KEY,
  PUBLIC_ONBOARDING_VERSION,
} from "@/lib/publicOnboarding";

const renderWelcome = (path = "/welcome") => render(
  <MemoryRouter
    initialEntries={[path]}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
  >
    <Routes>
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/auth" element={<div>Anmeldung geöffnet</div>} />
      <Route path="/settings" element={<div>Einstellungen geöffnet</div>} />
    </Routes>
  </MemoryRouter>,
);

describe("public onboarding", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores only a device-level version marker", () => {
    completePublicOnboarding();

    expect(hasCompletedPublicOnboarding()).toBe(true);
    expect(window.localStorage.getItem(PUBLIC_ONBOARDING_STORAGE_KEY)).toBe(PUBLIC_ONBOARDING_VERSION);
    expect(Object.keys(window.localStorage)).toEqual([PUBLIC_ONBOARDING_STORAGE_KEY]);
  });

  it("presents all three approved pages before opening registration", () => {
    renderWelcome();

    expect(screen.getByRole("heading", { name: /klarer Ablauf/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: /Training, Wettkampf und Ruhetag/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: /persönlichen Inhalte bleiben privat/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "RewirePerform starten" }));

    expect(screen.getByText("Anmeldung geöffnet")).toBeInTheDocument();
    expect(hasCompletedPublicOnboarding()).toBe(true);
  });

  it("returns a replay to settings without collecting account data", () => {
    renderWelcome("/welcome?replay=1&return=%2Fsettings");

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    fireEvent.click(screen.getByRole("button", { name: "Zurück zu den Einstellungen" }));

    expect(screen.getByText("Einstellungen geöffnet")).toBeInTheDocument();
  });

  it.each([
    "%2F%5Cevil.example",
    "%2F%2Fevil.example",
    "%2F%252fevil.example",
  ])("falls back to auth for an unsafe return path: %s", (returnPath) => {
    renderWelcome(`/welcome?return=${returnPath}`);

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    fireEvent.click(screen.getByRole("button", { name: "RewirePerform starten" }));

    expect(screen.getByText("Anmeldung geöffnet")).toBeInTheDocument();
  });
});
