import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Welcome from "@/pages/Welcome";
import {
  completePublicOnboarding,
  hasCompletedPublicOnboarding,
  PUBLIC_ONBOARDING_STORAGE_KEY,
  PUBLIC_ONBOARDING_VERSION,
} from "@/lib/publicOnboarding";

vi.mock("framer-motion", async () => {
  const React = await import("react");
  type MotionMockProps = React.HTMLAttributes<HTMLElement> & {
    initial?: unknown;
    animate?: unknown;
    exit?: unknown;
    transition?: unknown;
  };
  const createMotion = (tag: string) => React.forwardRef<HTMLElement, MotionMockProps>(
    ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }, ref) =>
      React.createElement(tag, { ...props, ref }, children),
  );

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: new Proxy({}, { get: (_target, property) => createMotion(String(property)) }),
    useReducedMotion: () => false,
  };
});

const AuthDestination = () => {
  const location = useLocation();
  return <div>Anmeldung geöffnet: {location.search}</div>;
};

const renderWelcome = (path = "/welcome") => render(
  <MemoryRouter
    initialEntries={[path]}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
  >
    <Routes>
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/auth" element={<AuthDestination />} />
      <Route path="/settings" element={<div>Einstellungen geöffnet</div>} />
    </Routes>
  </MemoryRouter>,
);

const advanceToFinalScene = () => {
  for (let index = 0; index < 9; index += 1) {
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
  }
};

describe("public onboarding", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("stores only a device-level version marker", () => {
    completePublicOnboarding();

    expect(hasCompletedPublicOnboarding()).toBe(true);
    expect(window.localStorage.getItem(PUBLIC_ONBOARDING_STORAGE_KEY)).toBe(PUBLIC_ONBOARDING_VERSION);
    expect(Object.keys(window.localStorage)).toEqual([PUBLIC_ONBOARDING_STORAGE_KEY]);
  });

  it("uses a session-only marker when persistent device storage is unavailable", () => {
    const originalSetItem = Storage.prototype.setItem;
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (this === window.localStorage) throw new DOMException("Storage unavailable");
      return originalSetItem.call(this, key, value);
    });

    completePublicOnboarding();

    expect(window.sessionStorage.getItem(PUBLIC_ONBOARDING_STORAGE_KEY)).toBe(PUBLIC_ONBOARDING_VERSION);
    expect(hasCompletedPublicOnboarding()).toBe(true);
    setItem.mockRestore();
  });

  it("presents all ten approved scenes before opening the real solo registration", () => {
    renderWelcome();

    expect(screen.getByRole("heading", { name: "Du siehst sofort, was ansteht." })).toBeInTheDocument();
    advanceToFinalScene();
    expect(screen.getByRole("heading", { name: "Dein Weg beginnt mit dem ersten Tag." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Registrierung starten" }));

    expect(screen.getByText("Anmeldung geöffnet: ?mode=signup&intent=solo")).toBeInTheDocument();
    expect(hasCompletedPublicOnboarding()).toBe(true);
  });

  it("opens the real team registration only after the team path is selected", () => {
    renderWelcome();

    advanceToFinalScene();
    fireEvent.click(screen.getByRole("button", { name: "Team" }));
    fireEvent.click(screen.getByRole("button", { name: "Registrierung starten" }));

    expect(screen.getByText("Anmeldung geöffnet: ?mode=signup&intent=join")).toBeInTheDocument();
    expect(hasCompletedPublicOnboarding()).toBe(true);
  });

  it("opens the existing login flow for registered athletes and coaches", () => {
    renderWelcome();

    fireEvent.click(screen.getByRole("button", { name: "Anmelden" }));

    expect(screen.getByText("Anmeldung geöffnet: ?mode=login")).toBeInTheDocument();
    expect(hasCompletedPublicOnboarding()).toBe(true);
  });

  it("returns a replay to settings without collecting account data", () => {
    renderWelcome("/welcome?replay=1&return=%2Fsettings");

    advanceToFinalScene();
    fireEvent.click(screen.getByRole("button", { name: "Zurück zu den Einstellungen" }));

    expect(screen.getByText("Einstellungen geöffnet")).toBeInTheDocument();
  });

  it("lets a returning user close a replay immediately", () => {
    renderWelcome("/welcome?replay=1&return=%2Fsettings");

    fireEvent.click(screen.getByRole("button", { name: "Einführung schließen" }));

    expect(screen.getByText("Einstellungen geöffnet")).toBeInTheDocument();
  });

  it.each([
    "%2F%5Cevil.example",
    "%2F%2Fevil.example",
    "%2F%252fevil.example",
  ])("falls back to settings for an unsafe replay return path: %s", (returnPath) => {
    renderWelcome(`/welcome?replay=1&return=${returnPath}`);

    fireEvent.click(screen.getByRole("button", { name: "Einführung schließen" }));

    expect(screen.getByText("Einstellungen geöffnet")).toBeInTheDocument();
  });
});
