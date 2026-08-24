import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Auth from "@/pages/Auth";
import {
  clearPostSignupOnboarding,
  pendingPostAuthorizationTeamCode,
  pendingPostSignupIntent,
} from "@/lib/postSignupOnboarding";

const mocks = vi.hoisted(() => ({
  authState: {
    user: null as { id: string; user_metadata?: Record<string, unknown> } | null,
    role: null as "admin" | "coach" | "athlete" | null,
    roleVerified: true,
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
  verifyRole: vi.fn(),
  platform: "web",
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: () => mocks.platform,
    isNativePlatform: () => mocks.platform !== "web",
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ ...mocks.authState, verifyRole: mocks.verifyRole }),
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

const renderAuth = (initialEntry = "/auth?mode=signup&intent=solo&intro=athlete") => render(
  <MemoryRouter
    initialEntries={[initialEntry]}
  >
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/questionnaire" element={<div>Fragebogen geöffnet</div>} />
      <Route path="/dashboard" element={<div>Dashboard geöffnet</div>} />
      <Route path="/coach" element={<div>Coach-Bereich geöffnet</div>} />
      <Route path="/admin" element={<div>Admin-Bereich geöffnet</div>} />
      <Route path="/organization/invite" element={<div>Organisationseinladung geöffnet</div>} />
      <Route path="/start" element={<div>Rollenauswahl geöffnet</div>} />
      <Route path="/start/athlete" element={<div>Athleten-Einführung geöffnet</div>} />
      <Route path="/start/coach" element={<div>Coach-Einführung geöffnet</div>} />
      <Route path="/auth/reset-password" element={<div>Passwortseite geöffnet</div>} />
    </Routes>
  </MemoryRouter>,
);

const WarmAuthNavigation = () => {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate("/auth?mode=signup&intent=join&team=ABC123&intro=athlete", { replace: true })}>
        Teamlink öffnen
      </button>
      <button type="button" onClick={() => navigate("/auth?mode=login", { replace: true })}>
        Normal anmelden
      </button>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/questionnaire" element={<div>Fragebogen geöffnet</div>} />
      </Routes>
    </>
  );
};

const renderWarmAuthNavigation = () => render(
  <MemoryRouter
    initialEntries={["/auth?mode=login"]}
  >
    <WarmAuthNavigation />
  </MemoryRouter>,
);

const submitSoloSignup = () => {
  fireEvent.change(screen.getByLabelText("Vollständiger Name"), { target: { value: "Test Person" } });
  fireEvent.change(screen.getByLabelText("E-Mail"), { target: { value: "test@example.com" } });
  fireEvent.change(screen.getByLabelText("Passwort"), { target: { value: "secure-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Konto erstellen" }));
};

const settleOtpTimers = () => act(async () => {
  await new Promise((resolve) => window.setTimeout(resolve, 60));
});

describe("auth email confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    clearPostSignupOnboarding("user-1");
    window.history.replaceState({}, "", "/");
    mocks.authState.user = null;
    mocks.authState.role = null;
    mocks.authState.roleVerified = true;
    mocks.authState.loading = false;
    mocks.platform = "web";
    mocks.resend.mockResolvedValue({ error: null });
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.verifyOtp.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mocks.verifyRole.mockResolvedValue({ ok: true, value: "athlete" });
    mocks.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          sport: "Fußball",
          sport_category: "teamsport",
          sport_format: "team",
          sport_level: "competitive",
          sport_taxonomy_version: "v1",
        },
        error: null,
      }),
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
    const redirectUrl = new URL(signUpCall.options.emailRedirectTo);
    expect(redirectUrl.pathname).toBe("/auth");
    expect(redirectUrl.searchParams.get("flow")).toBe("signup");
    expect(redirectUrl.searchParams.get("intro")).toBe("athlete");
    expect(redirectUrl.searchParams.has("redirect")).toBe(false);
    expect(signUpCall.options.data).toEqual({
      full_name: "Test Person",
      rewireperform_post_signup_onboarding_version: "1",
      rewireperform_post_signup_onboarding_intent: "solo",
    });
    expect(signUpCall.options.data).not.toHaveProperty("role");
  });

  it("sends Android auth emails to the verified HTTPS app-link callback while leaving the browser contract separate", async () => {
    mocks.platform = "android";
    mocks.signUp.mockResolvedValue({
      data: { user: { id: "user-1" }, session: null },
      error: null,
    });

    renderAuth();
    submitSoloSignup();
    await screen.findByRole("heading", { name: "Bestätige deine E-Mail." });

    expect(mocks.signUp.mock.calls[0]?.[0].options.emailRedirectTo)
      .toBe("https://rewireperform.com/auth?flow=signup&intro=athlete");
  });

  it("keeps an invited coach out of athlete onboarding and returns to the invitation after email confirmation", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: { id: "user-1" }, session: null },
      error: null,
    });
    const redirect = encodeURIComponent(`/organization/invite?token=${"a".repeat(64)}`);
    renderAuth(`/auth?mode=signup&intent=organization&redirect=${redirect}&intro=coach`);

    expect(screen.getByRole("heading", { name: "Dein Organisationszugang." })).toBeInTheDocument();
    expect(screen.queryByText(/athletin oder athlet/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Vollständiger Name"), { target: { value: "Coach Beispiel" } });
    fireEvent.change(screen.getByLabelText("E-Mail"), { target: { value: "coach@verein.de" } });
    fireEvent.change(screen.getByLabelText("Passwort"), { target: { value: "secure-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Konto erstellen" }));

    await screen.findByRole("heading", { name: "Bestätige deine E-Mail." });
    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({
        data: {
          full_name: "Coach Beispiel",
          rewireperform_account_purpose: "organization_invite",
        },
        emailRedirectTo: expect.stringContaining("intent=organization"),
      }),
    }));
    expect(pendingPostSignupIntent("user-1")).toBeNull();

    fireEvent.change(screen.getByLabelText("Sechsstelliger Sicherheitscode"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "E-Mail bestätigen" }));

    expect(await screen.findByText("Organisationseinladung geöffnet")).toBeInTheDocument();
    expect(pendingPostSignupIntent("user-1")).toBeNull();
  });

  it("gives a Co-Coach code signup the same confirmation, resend and exact return path", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: { id: "user-1" }, session: null },
      error: null,
    });
    const code = "A1B2C3D4E5F60718293A";
    const redirect = encodeURIComponent(`/organization/invite?coach=${code}`);
    renderAuth(`/auth?mode=signup&intent=organization&redirect=${redirect}&intro=coach`);

    fireEvent.change(screen.getByLabelText("Vollständiger Name"), { target: { value: "Co Coach" } });
    fireEvent.change(screen.getByLabelText("E-Mail"), { target: { value: "cocoach@verein.de" } });
    fireEvent.change(screen.getByLabelText("Passwort"), { target: { value: "secure-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Konto erstellen" }));

    await screen.findByRole("heading", { name: "Bestätige deine E-Mail." });
    const confirmationUrl = new URL(mocks.signUp.mock.calls[0]?.[0].options.emailRedirectTo);
    expect(confirmationUrl.searchParams.get("intent")).toBe("organization");
    expect(confirmationUrl.searchParams.get("intro")).toBe("coach");
    expect(confirmationUrl.searchParams.get("redirect")).toBe(`/organization/invite?coach=${code}`);

    fireEvent.click(screen.getByRole("button", { name: "E-Mail erneut senden" }));
    await waitFor(() => expect(mocks.resend).toHaveBeenCalledTimes(1));
    const resendUrl = new URL(mocks.resend.mock.calls[0]?.[0].options.emailRedirectTo);
    expect(resendUrl.searchParams.get("redirect")).toBe(`/organization/invite?coach=${code}`);

    fireEvent.change(screen.getByLabelText("Sechsstelliger Sicherheitscode"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "E-Mail bestätigen" }));

    expect(await screen.findByText("Organisationseinladung geöffnet")).toBeInTheDocument();
    expect(pendingPostSignupIntent("user-1")).toBeNull();
  });

  it("returns a signed-in invited coach to the invitation instead of the generic coach home", async () => {
    mocks.authState.user = { id: "user-1" };
    mocks.authState.role = "coach";
    const redirect = encodeURIComponent(`/organization/invite?token=${"b".repeat(64)}`);

    renderAuth(`/auth?mode=login&intent=organization&redirect=${redirect}`);

    expect(await screen.findByText("Organisationseinladung geöffnet")).toBeInTheDocument();
    expect(screen.queryByText("Coach-Bereich geöffnet")).not.toBeInTheDocument();
  });

  it("replaces the old public intent cards with the role-first entry", () => {
    renderAuth("/auth");

    expect(screen.getByText("Rollenauswahl geöffnet")).toBeInTheDocument();
  });

  it("opens a direct solo signup without a duplicate intent step", () => {
    renderAuth("/auth?mode=signup&intent=solo&intro=athlete");

    expect(screen.getByRole("heading", { name: "Du startest allein." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Konto erstellen" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Teamcode")).not.toBeInTheDocument();
  });

  it("sends a direct athlete signup through the athlete flight when no completion marker exists", () => {
    renderAuth("/auth?mode=signup&intent=solo");
    expect(screen.getByText("Athleten-Einführung geöffnet")).toBeInTheDocument();
  });

  it("sends a personal coach invitation through the coach flight before auth", () => {
    const redirect = encodeURIComponent(`/organization/invite?token=${"a".repeat(64)}`);
    renderAuth(`/auth?mode=signup&intent=organization&redirect=${redirect}`);
    expect(screen.getByText("Coach-Einführung geöffnet")).toBeInTheDocument();
  });

  it("shows the preserved Co-Coach code as already entered on registration", () => {
    const code = "A1B2C3D4E5F60718293A";
    const redirect = encodeURIComponent(`/organization/invite?coach=${code}`);
    renderAuth(`/auth?mode=signup&intent=organization&redirect=${redirect}&intro=coach`);

    expect(screen.getByRole("heading", { name: "Dein Coach-Zugang." })).toBeInTheDocument();
    expect(screen.getByText("Coach-Code · bereits eingetragen")).toBeInTheDocument();
    expect(screen.getByText("A1B2-C3D4-E5F6-0718-293A")).toBeInTheDocument();
  });

  it("opens a team invite signup and still requires a real team code", () => {
    renderAuth("/auth?mode=signup&intent=join&intro=athlete");

    expect(screen.getByRole("heading", { name: "Du trittst einem Team bei." })).toBeInTheDocument();
    expect(screen.getByLabelText("Teamcode")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Konto erstellen" })).toBeInTheDocument();
  });

  it("shows a safe recovery message for a malformed invite without prefilling its payload", () => {
    renderAuth("/auth?mode=signup&intent=join&invite_error=invalid&intro=athlete");

    expect(screen.getByRole("alert")).toHaveTextContent("Teamcode bitte erneut ein");
    expect(screen.getByLabelText("Teamcode")).toHaveValue("");
  });

  it("opens the shared login path used by registered athletes and coaches", () => {
    renderAuth("/auth?mode=login");

    expect(screen.getByRole("heading", { name: "Willkommen zurück." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anmelden" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Für Teams & Organisationen/ })).not.toBeInTheDocument();
  });

  it("lets users reveal and hide their password without submitting the form", () => {
    renderAuth("/auth?mode=login");

    const password = screen.getByLabelText("Passwort");
    expect(password).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Passwort anzeigen" }));
    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Passwort verbergen" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Passwort verbergen" }));
    expect(password).toHaveAttribute("type", "password");
  });

  it("rebases a warm team link and never carries it into a later normal login", async () => {
    renderWarmAuthNavigation();
    expect(screen.getByRole("heading", { name: "Willkommen zurück." })).toBeInTheDocument();
    expect(screen.queryByLabelText("Teamcode")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Teamlink öffnen" }));
    expect(await screen.findByRole("heading", { name: "Du trittst einem Team bei." })).toBeInTheDocument();
    expect(screen.getByLabelText("Teamcode")).toHaveValue("ABC123");

    fireEvent.click(screen.getByRole("button", { name: "Normal anmelden" }));
    expect(await screen.findByRole("heading", { name: "Willkommen zurück." })).toBeInTheDocument();
    expect(screen.queryByLabelText("Teamcode")).not.toBeInTheDocument();
    expect(screen.getByText("Melde dich an, um dein Programm fortzusetzen.")).toBeInTheDocument();
  });

  it("opens a warm team confirmation for an already signed-in athlete", async () => {
    mocks.authState.user = { id: "user-1" };
    mocks.authState.role = "athlete";
    mocks.authState.loading = true;
    const view = renderWarmAuthNavigation();

    fireEvent.click(screen.getByRole("button", { name: "Teamlink öffnen" }));
    mocks.authState.loading = false;
    view.rerender(
      <MemoryRouter
        initialEntries={["/auth?mode=login"]}
      >
        <WarmAuthNavigation />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Team beitreten?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Team beitreten" }));
    expect(pendingPostAuthorizationTeamCode("user-1")).toBe("ABC123");
  });

  it("resends confirmation into the fixed signup continuation instead of an arbitrary pre-auth redirect", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: { id: "user-1" }, session: null },
      error: null,
    });

    renderAuth();
    submitSoloSignup();
    fireEvent.click(await screen.findByRole("button", { name: "E-Mail erneut senden" }));

    await waitFor(() => {
      expect(mocks.resend).toHaveBeenCalledTimes(1);
    });
    const resendUrl = new URL(mocks.resend.mock.calls[0]?.[0].options.emailRedirectTo);
    expect(resendUrl.searchParams.get("flow")).toBe("signup");
    expect(resendUrl.searchParams.has("redirect")).toBe(false);
  });

  it("removes a backslash-normalized external redirect from confirmation links", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: { id: "user-1" }, session: null },
      error: null,
    });

    renderAuth(`/auth?mode=signup&intent=solo&intro=athlete&redirect=${encodeURIComponent("/\\evil.example")}`);
    submitSoloSignup();

    expect(await screen.findByRole("heading", { name: "Bestätige deine E-Mail." })).toBeInTheDocument();
    const redirectUrl = new URL(mocks.signUp.mock.calls[0]?.[0].options.emailRedirectTo);
    expect(redirectUrl.origin).toBe(window.location.origin);
    expect(redirectUrl.searchParams.has("redirect")).toBe(false);
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
    expect(pendingPostSignupIntent("user-1")).toBeNull();
    await settleOtpTimers();
  });

  it("requests a password reset without revealing whether an account exists", async () => {
    renderAuth("/auth?mode=forgot");
    fireEvent.change(screen.getByLabelText("E-Mail"), { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset-E-Mail senden" }));

    expect(await screen.findByRole("heading", { name: "Prüfe deine E-Mails." })).toBeInTheDocument();
    expect(screen.getByText(/Falls ein Konto/)).toBeInTheDocument();
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      "test@example.com",
      { redirectTo: "http://localhost:3000/auth/reset-password?flow=recovery" },
    );
  });

  it("returns Android password recovery to the verified HTTPS reset route", async () => {
    mocks.platform = "android";
    renderAuth("/auth?mode=forgot");
    fireEvent.change(screen.getByLabelText("E-Mail"), { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset-E-Mail senden" }));

    await screen.findByRole("heading", { name: "Prüfe deine E-Mails." });
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      "test@example.com",
      { redirectTo: "https://rewireperform.com/auth/reset-password?flow=recovery" },
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
    expect(await screen.findByText("Passwortseite geöffnet")).toBeInTheDocument();
    await settleOtpTimers();
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
    expect(pendingPostSignupIntent("user-1")).toBeNull();
  });

  it("requires an explicit confirmation before an existing athlete joins from a team link", async () => {
    mocks.authState.user = { id: "user-1" };
    mocks.authState.role = "athlete";

    renderAuth("/auth?intent=join&code=abc123");

    expect(await screen.findByRole("heading", { name: "Team beitreten?" })).toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Team beitreten" }));

    expect(await screen.findByText("Fragebogen geöffnet")).toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(pendingPostAuthorizationTeamCode("user-1")).toBe("ABC123");
    expect(pendingPostSignupIntent("user-1")).toBeNull();
  });

  it("never replays onboarding metadata for a returning athlete opening a normal team invite", async () => {
    mocks.authState.user = {
      id: "user-1",
      user_metadata: {
        rewireperform_post_signup_onboarding_version: "1",
        rewireperform_post_signup_onboarding_intent: "join",
      },
    };
    mocks.authState.role = "athlete";

    renderAuth("/auth?intent=join&code=abc123");

    fireEvent.click(await screen.findByRole("button", { name: "Team beitreten" }));
    expect(await screen.findByText("Fragebogen geöffnet")).toBeInTheDocument();
    expect(pendingPostSignupIntent("user-1")).toBeNull();
    expect(pendingPostAuthorizationTeamCode("user-1")).toBe("ABC123");
  });

  it("restores a genuine cross-device team signup from namespaced signup metadata", async () => {
    mocks.authState.user = {
      id: "user-1",
      user_metadata: {
        rewireperform_post_signup_onboarding_version: "1",
        rewireperform_post_signup_onboarding_intent: "join",
      },
    };
    mocks.authState.role = "athlete";

    renderAuth("/auth?flow=signup&intent=join&team=ABC123");

    expect(await screen.findByRole("heading", { name: "Team beitreten?" })).toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Team beitreten" }));
    expect(await screen.findByText("Fragebogen geöffnet")).toBeInTheDocument();
    expect(pendingPostSignupIntent("user-1")).toBe("join");
    expect(pendingPostAuthorizationTeamCode("user-1")).toBe("ABC123");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("never treats a raw signup query or Supabase PKCE auth code as proof of a new signup", async () => {
    mocks.authState.user = { id: "user-1" };
    mocks.authState.role = "athlete";

    renderAuth("/auth?flow=signup&code=one-time-auth-code");

    expect(await screen.findByText("Dashboard geöffnet")).toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(pendingPostSignupIntent("user-1")).toBeNull();
    expect(pendingPostAuthorizationTeamCode("user-1")).toBeNull();
  });

  it("restores a genuine cross-device solo signup without trusting the URL alone", async () => {
    mocks.authState.user = {
      id: "user-1",
      user_metadata: {
        rewireperform_post_signup_onboarding_version: "1",
        rewireperform_post_signup_onboarding_intent: "solo",
      },
    };
    mocks.authState.role = "athlete";

    renderAuth("/auth?flow=signup&code=one-time-auth-code");

    expect(await screen.findByText("Fragebogen geöffnet")).toBeInTheDocument();
    expect(pendingPostSignupIntent("user-1")).toBe("solo");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("fails closed with a visible retry when a signed-in role cannot be verified", async () => {
    mocks.authState.user = { id: "user-1" };
    mocks.authState.role = null;
    mocks.authState.roleVerified = false;

    renderAuth("/auth?intent=join&code=ABC123");

    expect(await screen.findByRole("heading", { name: "Rolle konnte nicht sicher geprüft werden" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Erneut prüfen" }));
    await waitFor(() => expect(mocks.verifyRole).toHaveBeenCalledTimes(1));
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("keeps an expired signup link visible for a signed-in athlete without opening the tour", async () => {
    mocks.authState.user = { id: "user-1" };
    mocks.authState.role = "athlete";
    window.history.replaceState({}, "", "/auth?flow=signup&error_code=otp_expired");

    renderAuth("/auth?flow=signup&error_code=otp_expired");

    expect(await screen.findByRole("heading", { name: "Der Link ist nicht mehr gültig." })).toBeInTheDocument();
    expect(pendingPostSignupIntent("user-1")).toBeNull();
  });

  it.each(["coach", "admin"] as const)(
    "never treats a signed-in %s as an athlete signup continuation",
    async (role) => {
      mocks.authState.user = { id: "user-1" };
      mocks.authState.role = role;

      renderAuth("/auth?flow=signup");

      expect(await screen.findByText(role === "coach" ? "Coach-Bereich geöffnet" : "Admin-Bereich geöffnet")).toBeInTheDocument();
      expect(pendingPostSignupIntent("user-1")).toBeNull();
    },
  );

  it("queues an immediate team signup without joining before minor authorization", async () => {
    mocks.signUp.mockImplementation(async () => {
      mocks.authState.user = { id: "user-1" };
      mocks.authState.role = "athlete";
      return { data: { user: { id: "user-1" }, session: { access_token: "token" } }, error: null };
    });

    renderAuth("/auth?mode=signup&intent=join&team=ABC123&intro=athlete");
    fireEvent.change(screen.getByLabelText("Vollständiger Name"), { target: { value: "Test Person" } });
    fireEvent.change(screen.getByLabelText("E-Mail"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Passwort"), { target: { value: "secure-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Konto erstellen" }));

    expect(await screen.findByText("Fragebogen geöffnet")).toBeInTheDocument();
    expect(pendingPostSignupIntent("user-1")).toBeNull();
    expect(pendingPostAuthorizationTeamCode("user-1")).toBe("ABC123");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("queues an existing-account team login without joining inside Auth", async () => {
    mocks.signInWithPassword.mockImplementation(async () => {
      mocks.authState.user = { id: "user-1" };
      mocks.authState.role = "athlete";
      return { data: { user: { id: "user-1" } }, error: null };
    });
    renderAuth("/auth?mode=login&intent=join&team=ABC123&intro=athlete");
    fireEvent.change(screen.getByLabelText("E-Mail"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Passwort"), { target: { value: "secure-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Anmelden" }));

    expect(await screen.findByText("Fragebogen geöffnet")).toBeInTheDocument();
    expect(pendingPostSignupIntent("user-1")).toBeNull();
    expect(pendingPostAuthorizationTeamCode("user-1")).toBe("ABC123");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("queues an OTP-confirmed team signup without joining before minor authorization", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: { id: "user-1" }, session: null }, error: null });
    mocks.verifyOtp.mockImplementation(async () => {
      mocks.authState.user = { id: "user-1" };
      mocks.authState.role = "athlete";
      return { data: { user: { id: "user-1" } }, error: null };
    });
    renderAuth("/auth?mode=signup&intent=join&team=ABC123&intro=athlete");
    fireEvent.change(screen.getByLabelText("Vollständiger Name"), { target: { value: "Test Person" } });
    fireEvent.change(screen.getByLabelText("E-Mail"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Passwort"), { target: { value: "secure-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Konto erstellen" }));
    fireEvent.change(await screen.findByLabelText("Sechsstelliger Sicherheitscode"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "E-Mail bestätigen" }));

    expect(await screen.findByText("Fragebogen geöffnet")).toBeInTheDocument();
    expect(pendingPostSignupIntent("user-1")).toBeNull();
    expect(pendingPostAuthorizationTeamCode("user-1")).toBe("ABC123");
    expect(mocks.rpc).not.toHaveBeenCalled();
    await settleOtpTimers();
  });
});
