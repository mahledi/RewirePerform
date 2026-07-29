import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PublicOnboardingGate from "@/components/onboarding/PublicOnboardingGate";
import {
  PUBLIC_ONBOARDING_STORAGE_KEY,
  PUBLIC_ONBOARDING_VERSION,
} from "@/lib/publicOnboarding";

const mocks = vi.hoisted(() => ({
  auth: {
    user: null as { id: string } | null,
    loading: false,
  },
  native: true,
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => mocks.native,
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mocks.auth,
}));

const renderGate = () => render(
  <MemoryRouter
    initialEntries={["/auth"]}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
  >
    <Routes>
      <Route
        path="/auth"
        element={(
          <PublicOnboardingGate>
            <div>Realer Auth-Flow</div>
          </PublicOnboardingGate>
        )}
      />
      <Route path="/welcome" element={<div>Produktive Einführung</div>} />
    </Routes>
  </MemoryRouter>,
);

describe("public onboarding gate", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    mocks.auth.user = null;
    mocks.auth.loading = false;
    mocks.native = true;
  });

  it("opens the productive first-run experience for a new native user", () => {
    renderGate();

    expect(screen.getByText("Produktive Einführung")).toBeInTheDocument();
    expect(screen.queryByText("Realer Auth-Flow")).not.toBeInTheDocument();
  });

  it("opens the existing auth flow for a returning native user", () => {
    window.localStorage.setItem(PUBLIC_ONBOARDING_STORAGE_KEY, PUBLIC_ONBOARDING_VERSION);

    renderGate();

    expect(screen.getByText("Realer Auth-Flow")).toBeInTheDocument();
  });

  it("never blocks an existing authenticated native session", () => {
    mocks.auth.user = { id: "user-1" };

    renderGate();

    expect(screen.getByText("Realer Auth-Flow")).toBeInTheDocument();
  });

  it("preserves the existing web behavior without forcing the native introduction", () => {
    mocks.native = false;

    renderGate();

    expect(screen.getByText("Realer Auth-Flow")).toBeInTheDocument();
  });
});
