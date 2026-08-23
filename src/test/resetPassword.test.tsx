import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResetPassword from "@/pages/ResetPassword";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      updateUser: mocks.updateUser,
    },
  },
}));

const renderPage = () => render(
  <MemoryRouter
    initialEntries={[`${window.location.pathname}${window.location.search}${window.location.hash}`]}
  >
    <Routes>
      <Route path="/auth/reset-password" element={<ResetPassword />} />
      <Route path="/auth" element={<div>Anmeldung geöffnet</div>} />
    </Routes>
  </MemoryRouter>,
);

describe("password recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/auth/reset-password?verified=1");
    mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mocks.unsubscribe } } });
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });
    mocks.updateUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  it("sets a new password after a valid recovery session", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Neues Passwort festlegen." })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Neues Passwort"), { target: { value: "new-secure-password" } });
    fireEvent.change(screen.getByLabelText("Passwort wiederholen"), { target: { value: "new-secure-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Passwort speichern" }));

    expect(await screen.findByRole("heading", { name: "Passwort geändert." })).toBeInTheDocument();
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: "new-secure-password" });
  });

  it("accepts the recovery session after Supabase has consumed the URL fragment", async () => {
    window.history.replaceState({}, "", "/auth/reset-password");
    renderPage();

    expect(await screen.findByRole("heading", { name: "Neues Passwort festlegen." })).toBeInTheDocument();
  });

  it("rejects mismatching passwords before calling Supabase", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "Neues Passwort festlegen." });
    fireEvent.change(screen.getByLabelText("Neues Passwort"), { target: { value: "new-secure-password" } });
    fireEvent.change(screen.getByLabelText("Passwort wiederholen"), { target: { value: "different-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Passwort speichern" }));

    expect(screen.getByRole("alert")).toHaveTextContent("stimmen nicht überein");
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("shows a safe recovery path for expired links", async () => {
    window.history.replaceState(
      {},
      "",
      "/auth/reset-password#error=access_denied&error_code=otp_expired&error_description=expired",
    );
    renderPage();

    expect(screen.getByRole("heading", { name: "Der Link ist nicht mehr gültig." })).toBeInTheDocument();
    expect(screen.getByText(/abgelaufen oder wurde bereits verwendet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Neuen Link anfordern" })).toHaveAttribute("href", "/auth?mode=forgot");
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it("does not accept a recovery route without a session", async () => {
    vi.useFakeTimers();
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    renderPage();

    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByRole("heading", { name: "Der Link ist nicht mehr gültig." })).toBeInTheDocument();
    expect(mocks.updateUser).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
