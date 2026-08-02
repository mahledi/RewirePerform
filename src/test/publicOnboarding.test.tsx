import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Welcome from "@/pages/Welcome";
import {
  beginPostSignupOnboarding,
  clearPostSignupOnboarding,
  pendingPostSignupIntent,
} from "@/lib/postSignupOnboarding";

const auth = vi.hoisted(() => ({
  user: { id: "athlete-1" } as { id: string } | null,
  role: "athlete" as "athlete" | "coach" | "admin" | null,
  loading: false,
  roleVerified: true,
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
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

const renderWelcome = (path: string) => render(
  <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes>
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/questionnaire" element={<div>Fragebogen geöffnet</div>} />
      <Route path="/settings" element={<div>Einstellungen geöffnet</div>} />
      <Route path="/coach" element={<div>Coach-Bereich geöffnet</div>} />
      <Route path="/admin" element={<div>Admin-Bereich geöffnet</div>} />
      <Route path="/auth" element={<div>Anmeldung geöffnet</div>} />
    </Routes>
  </MemoryRouter>,
);

const advanceToFinalScene = () => {
  for (let index = 0; index < 9; index += 1) {
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
  }
};

describe("post-signup onboarding", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    clearPostSignupOnboarding("athlete-1");
    clearPostSignupOnboarding("athlete-2");
    auth.user = { id: "athlete-1" };
    auth.role = "athlete";
    auth.loading = false;
    auth.roleVerified = true;
  });

  it("runs all ten scenes only for the newly registered athlete, then opens the questionnaire", () => {
    beginPostSignupOnboarding("athlete-1", "solo");
    renderWelcome("/welcome?flow=post-signup&intent=solo");

    expect(screen.getByRole("heading", { name: "Du siehst sofort, was ansteht." })).toBeInTheDocument();
    advanceToFinalScene();
    expect(screen.queryByRole("group", { name: "Programmweg auswählen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Solo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Team" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Anmelden" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fragebogen starten" }));

    expect(screen.getByText("Fragebogen geöffnet")).toBeInTheDocument();
    expect(pendingPostSignupIntent("athlete-1")).toBeNull();
  });

  it("does not let a direct or replayed callback reopen a completed introduction", () => {
    beginPostSignupOnboarding("athlete-1", "join");
    renderWelcome("/welcome?flow=post-signup&intent=join");
    advanceToFinalScene();
    fireEvent.click(screen.getByRole("button", { name: "Fragebogen starten" }));

    beginPostSignupOnboarding("athlete-1", "join");
    expect(pendingPostSignupIntent("athlete-1")).toBeNull();
  });

  it("sends an athlete without a genuine pending signup directly to the questionnaire", () => {
    renderWelcome("/welcome?flow=post-signup&intent=solo");
    expect(screen.getByText("Fragebogen geöffnet")).toBeInTheDocument();
  });

  it("never presents the athlete introduction to a coach", () => {
    auth.role = "coach";
    beginPostSignupOnboarding("athlete-1", "solo");
    renderWelcome("/welcome?flow=post-signup&intent=solo");
    expect(screen.getByText("Coach-Bereich geöffnet")).toBeInTheDocument();
  });

  it("keeps the Settings replay separate from signup state", () => {
    renderWelcome("/welcome?replay=1&return=%2Fsettings");
    advanceToFinalScene();
    fireEvent.click(screen.getByRole("button", { name: "Zurück zu den Einstellungen" }));
    expect(screen.getByText("Einstellungen geöffnet")).toBeInTheDocument();
    expect(pendingPostSignupIntent("athlete-1")).toBeNull();
  });

  it.each(["%2F%5Cevil.example", "%2F%2Fevil.example", "%2F%252fevil.example"])(
    "falls back to Settings for an unsafe replay return path: %s",
    (returnPath) => {
      renderWelcome(`/welcome?replay=1&return=${returnPath}`);
      fireEvent.click(screen.getByRole("button", { name: "Einführung schließen" }));
      expect(screen.getByText("Einstellungen geöffnet")).toBeInTheDocument();
    },
  );
});
