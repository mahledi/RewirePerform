import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Settings from "@/pages/Settings";

const mocks = vi.hoisted(() => ({
  isNativePlatform: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: mocks.isNativePlatform,
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "athlete-1", email: "athlete@example.com" },
  }),
}));

vi.mock("@/components/settings/TrainingAndNotifications", () => ({
  TrainingAndNotifications: () => <div>Trainings- und Benachrichtigungseinstellungen</div>,
}));

describe("settings native surface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isNativePlatform.mockReturnValue(false);
  });

  const renderSettings = () => render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
  );

  it("keeps the browser installation guide on the web", () => {
    renderSettings();

    expect(screen.getByRole("heading", { name: "Als App installieren" })).toBeInTheDocument();
    expect(screen.getByText("Android (Chrome)")).toBeInTheDocument();
    expect(screen.getByText(/Installieren und Verknüpfung erstellen/)).toBeInTheDocument();
    expect(screen.getByText('"App installieren"')).toBeInTheDocument();
    expect(screen.getByText(/Zum Startbildschirm hinzufügen/)).toBeInTheDocument();
  });

  it("does not show browser installation instructions inside the native app", () => {
    mocks.isNativePlatform.mockReturnValue(true);
    renderSettings();

    expect(screen.queryByRole("heading", { name: "Als App installieren" })).not.toBeInTheDocument();
    expect(screen.queryByText("Android (Chrome)")).not.toBeInTheDocument();
  });
});
