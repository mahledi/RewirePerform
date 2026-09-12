import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FirstRunRoleEntry from "@/pages/FirstRunRoleEntry";

const authState = vi.hoisted(() => ({
  user: null as { id: string } | null,
  role: null as "athlete" | "coach" | "admin" | null,
  roleVerified: true,
  loading: false,
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => authState }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false } }));

const renderEntry = () => render(
  <MemoryRouter initialEntries={["/start"]}>
    <Routes>
      <Route path="/" element={<div>Website geöffnet</div>} />
      <Route path="/start" element={<FirstRunRoleEntry />} />
      <Route path="/start/athlete" element={<div>Athletenflug geöffnet</div>} />
      <Route path="/start/coach" element={<div>Coach-Flug geöffnet</div>} />
      <Route path="/auth" element={<div>Anmeldung geöffnet</div>} />
      <Route path="/dashboard" element={<div>Athletenbereich geöffnet</div>} />
      <Route path="/coach" element={<div>Coach-Bereich geöffnet</div>} />
      <Route path="/admin" element={<div>Admin-Bereich geöffnet</div>} />
    </Routes>
  </MemoryRouter>,
);

describe("role-first entry", () => {
  beforeEach(() => {
    authState.user = null;
    authState.role = null;
    authState.roleVerified = true;
    authState.loading = false;
  });

  it("offers exactly the athlete and coach introductions before authentication", () => {
    renderEntry();

    expect(screen.getByRole("heading", { name: "Wie nutzt du RewirePerform?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ich bin Athlet/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ich bin Coach/ })).toBeInTheDocument();
    expect(screen.getByText(/Auswahl öffnet nur die passende Einführung/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Ich bin Coach/ }));
    expect(screen.getByText("Coach-Flug geöffnet")).toBeInTheDocument();
  });

  it("returns web visitors to the public website without changing their role or auth state", () => {
    renderEntry();

    fireEvent.click(screen.getByRole("button", { name: "Zurück zur Website" }));
    expect(screen.getByText("Website geöffnet")).toBeInTheDocument();
  });

  it("keeps returning users on their server-verified role route", async () => {
    authState.user = { id: "coach-1" };
    authState.role = "coach";
    renderEntry();

    expect(await screen.findByText("Coach-Bereich geöffnet")).toBeInTheDocument();
  });
});
