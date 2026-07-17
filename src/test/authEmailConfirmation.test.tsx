import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Auth from "@/pages/Auth";

const mocks = vi.hoisted(() => ({
  authState: {
    user: null as { id: string } | null,
    role: null as "admin" | "coach" | "athlete" | null,
    loading: false,
  },
  from: vi.fn(),
  resend: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  rpc: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  verifyOtp: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mocks.authState,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      resend: mocks.resend,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
      signUp: mocks.signUp,
      verifyOtp: mocks.verifyOtp,
    },
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}));

const renderAuth = (initialEntry = "/auth?redirect=%2Fadmin%2Fqa") => render(
  <MemoryRouter
    initialEntries={[initialEntry]}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
  >
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/questionnaire" element={<div>Fragebogen geöffnet</div>} />
      <Route path="/dashboard" element={<div>Dashboard geöffnet</div>} />
      <Route path="/coach" element={<div>Coach-Bereich geöffnet</div>} />
      <Route path="/auth/reset-password" element={<div>Passwortseite geöffnet</div>} />
    </Routes>
  </MemoryRouter>,
);

const submitSoloSignup = () => {
  fireEvent.click(screen.getByRole("button", { name: /Allein starten/ }));
  fireEvent.change(screen.getByLabelText("Vollständiger Name"), { target: { value: "Test Person" } });
  fireEvent.change(screen.getByLabelText("E-Mail"), { target: { value: "test@example.com" } });
  fireEvent.change(screen.getByLabelText("Passwort"), { target: { value: "secure-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Konto erstellen" }));
};

describe("auth email confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authState.user = null;
    mocks.authState.role = null;
    mocks.authState.loading = false;
    mocks.resend.mockResolvedValue({ error: null });
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.verifyOtp.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mocks.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { sport: "Fußball" }, error: null }),
    });
  });

  it("shows a confirmation state instead of opening the questionnaire without a session", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: { id: "user-1" }, session: null },
      error: null,
    });

    renderAuth();
    submitSoloSignup();

    expect(await screen.findByRole("heading", { name: "Bestätige deine E-Mail." })).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.queryByText("Fragebogen geöffnet")).not.toBeInTheDocument();
    expect(mocks.toastSuccess).not.toHaveBeenCalled();

    const signUpCall = mocks.signUp.mock.calls[0]?.[0];
    expect(signUpCall.options.emailRedirectTo).toContain("/auth?redirect=%2Fadmin%2Fqa");
  });

  it("can resend the confirmation using the same safe redirect", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: { id: "user-1" }, session: null },
      error: null,
    });

    renderAuth();
    submitSoloSignup();
    fireEvent.click(await screen.findByRole("button", { name: "E-Mail erneut senden" }));

    await waitFor(() => {
      expect(mocks.resend).toHaveBeenCalledWith({
        type: "signup",
        email: "test@example.com",
        options: {
          emailRedirectTo: expect.stringContaining("/auth?redirect=%2Fadmin%2Fqa"),
        },
      });
    });
  });

  it("can confirm the signup with the six-digit fallback code", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: { id: "user-1" }, session: null },
      error: null,
    });

    renderAuth();
    submitSoloSignup();
    fireEvent.change(await screen.findByLabelText("Sechsstelliger Sicherheitscode"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "E-Mail bestätigen" }));

    expect(await screen.findByText("Fragebogen geöffnet")).toBeInTheDocument();
    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      email: "test@example.com",
      token: "123456",
      type: "email",
    });
  });

  it("requests a password reset without revealing whether an account exists", async () => {
    renderAuth("/auth?mode=forgot");
    fireEvent.change(screen.getByLabelText("E-Mail"), { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset-E-Mail senden" }));

    expect(await screen.findByRole("heading", { name: "Prüfe deine E-Mails." })).toBeInTheDocument();
    expect(screen.getByText(/Falls ein Konto/)).toBeInTheDocument();
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      "test@example.com",
      { redirectTo: "http://localhost:3000/auth/reset-password" },
    );
  });

  it("accepts the recovery code and opens the new-password route", async () => {
    renderAuth("/auth?mode=forgot");
    fireEvent.change(screen.getByLabelText("E-Mail"), { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset-E-Mail senden" }));
    fireEvent.change(await screen.findByLabelText("Sechsstelliger Sicherheitscode"), {
      target: { value: "654321" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Code prüfen" }));

    await waitFor(() => {
      expect(mocks.verifyOtp).toHaveBeenCalledWith({
        email: "test@example.com",
        token: "654321",
        type: "recovery",
      });
    });
    expect(screen.getByText("Passwortseite geöffnet")).toBeInTheDocument();
  });

  it("continues normally when Supabase returns an active session", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: { id: "user-1" }, session: { access_token: "token" } },
      error: null,
    });

    renderAuth();
    submitSoloSignup();

    expect(await screen.findByText("Fragebogen geöffnet")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Bestätige deine E-Mail." })).not.toBeInTheDocument();
  });

  it("completes a preserved team-code join after the confirmed session returns", async () => {
    mocks.authState.user = { id: "user-1" };
    mocks.authState.role = "athlete";
    mocks.rpc.mockResolvedValue({
      data: { success: true, role: "athlete" },
      error: null,
    });

    renderAuth("/auth?intent=join&code=abc123");

    expect(await screen.findByText("Fragebogen geöffnet")).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith("join_team_by_code", { _code: "ABC123" });
  });

  it("offers a retry when the confirmed team join cannot be completed immediately", async () => {
    mocks.authState.user = { id: "user-1" };
    mocks.authState.role = "athlete";
    mocks.rpc
      .mockResolvedValueOnce({ data: { success: false }, error: null })
      .mockResolvedValueOnce({ data: { success: true, role: "athlete" }, error: null });

    renderAuth("/auth?intent=join&code=ABC123");

    expect(await screen.findByRole("heading", { name: "Teambeitritt noch offen." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));

    expect(await screen.findByText("Fragebogen geöffnet")).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });
});
