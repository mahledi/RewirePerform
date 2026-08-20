import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Coach from "@/pages/Coach";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  signOut: vi.fn(),
  overviewProps: vi.fn(),
  managementProps: vi.fn(),
  calendarProps: vi.fn(),
  programStartDate: "2026-08-01" as string | null,
  user: { id: "coach-1", user_metadata: { full_name: "Nina Beispiel" } },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mocks.user,
    role: "coach",
    signOut: mocks.signOut,
  }),
}));

const resolvedQuery = (value: unknown) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue(value),
  or: vi.fn().mockResolvedValue(value),
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "team_members") {
        return resolvedQuery({ data: [], error: null });
      }
      if (table === "teams") {
        return resolvedQuery({
          data: [{
            id: "team-1",
            name: "U17",
            sport: "Fußball",
            access_code: "TEAM01",
            program_start_date: mocks.programStartDate,
            program_activated_at: "2026-08-01T09:00:00Z",
          }],
          error: null,
        });
      }
      throw new Error(`Unexpected table ${table}`);
    }),
  },
}));

vi.mock("@/components/coach/TeamOverview", () => ({
  default: (props: {
    onPrepareProgramStart: () => void;
    onOpenCalendar: () => void;
  }) => {
    mocks.overviewProps(props);
    return (
      <div>
        <p>Reale Übersicht</p>
        <button type="button" onClick={props.onPrepareProgramStart}>Programmstart vorbereiten</button>
        <button type="button" onClick={props.onOpenCalendar}>Teamkalender öffnen</button>
      </div>
    );
  },
}));
vi.mock("@/components/coach/TeamMentalState", () => ({ default: () => <div>Realer Teamzustand</div> }));
vi.mock("@/components/coach/TeamEvidence", () => ({ default: () => <div>Reale Entwicklung</div> }));
vi.mock("@/components/coach/CoachEvidenceReviewPanel", () => ({ default: () => <div>Reale Beobachtung</div> }));
vi.mock("@/components/coach/CoachToolkit", () => ({ default: () => <div>Reales Toolkit</div> }));
vi.mock("@/components/coach/TeamManagement", () => ({
  default: (props: { onOpenCalendar: (teamId: string) => void }) => {
    mocks.managementProps(props);
    return (
      <div>
        <p>Reale Teamverwaltung</p>
        <button type="button" onClick={() => props.onOpenCalendar("team-1")}>Kalender aus Team öffnen</button>
      </div>
    );
  },
}));
vi.mock("@/components/coach/TeamTrainingSchedule", () => ({
  default: (props: { teamId: string; variant?: string }) => {
    mocks.calendarProps(props);
    return <div>Realer Teamkalender</div>;
  },
}));
vi.mock("@/components/coach/CoachAccountPanel", () => ({ CoachAccountPanel: () => <div>Coach-Konto und Feedback</div> }));

describe("premium Coach dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.programStartDate = "2026-08-01";
    mocks.signOut.mockResolvedValue(undefined);
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
  });

  it("starts with the real overview and preserves the selected real team", async () => {
    render(<Coach />);

    expect(await screen.findByText("Reale Übersicht")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Nina/ })).toBeInTheDocument();
    expect(screen.getByText("U17")).toBeInTheDocument();
    expect(mocks.overviewProps).toHaveBeenLastCalledWith(expect.objectContaining({
      teamId: "team-1",
      teamName: "U17",
      programStartDate: "2026-08-01",
    }));
  });

  it("switches all five real areas without a mobile home detour", async () => {
    render(<Coach />);
    await screen.findByText("Reale Übersicht");

    const nav = screen.getByRole("navigation", { name: "Coach-Navigation" });
    expect(nav.querySelectorAll("button")).toHaveLength(5);

    fireEvent.click(screen.getByRole("button", { name: "Zustand" }));
    expect(await screen.findByText("Realer Teamzustand")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Entwicklung" }));
    expect(await screen.findByText("Reale Beobachtung")).toBeInTheDocument();
    expect(screen.getByText("Reale Entwicklung")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Toolkit" }));
    expect(await screen.findByText("Reales Toolkit")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Team" }));
    expect(await screen.findByText("Reale Teamverwaltung")).toBeInTheDocument();
  });

  it("opens the existing management start area from the prominent overview action", async () => {
    mocks.programStartDate = null;
    render(<Coach />);
    await screen.findByText("Reale Übersicht");

    fireEvent.click(screen.getByRole("button", { name: "Programmstart vorbereiten" }));

    expect(await screen.findByText("Reale Teamverwaltung")).toBeInTheDocument();
    expect(mocks.managementProps).toHaveBeenLastCalledWith(expect.objectContaining({
      programStartFocus: { teamId: "team-1", requestKey: 1 },
    }));
  });

  it("uses a dedicated calendar view and returns without losing the previous coach area", async () => {
    render(<Coach />);
    await screen.findByText("Reale Übersicht");

    fireEvent.click(screen.getByRole("button", { name: "Teamkalender öffnen" }));
    expect(await screen.findByText("Realer Teamkalender")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Coach-Navigation" })).not.toBeInTheDocument();
    expect(mocks.calendarProps).toHaveBeenLastCalledWith(expect.objectContaining({
      teamId: "team-1",
      variant: "full",
    }));

    fireEvent.click(screen.getByRole("button", { name: "Zurück" }));
    expect(await screen.findByText("Reale Übersicht")).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Coach-Navigation" })).toBeInTheDocument();
  });

  it("opens the same calendar view from team management", async () => {
    render(<Coach />);
    await screen.findByText("Reale Übersicht");

    fireEvent.click(screen.getByRole("button", { name: "Team" }));
    fireEvent.click(await screen.findByRole("button", { name: "Kalender aus Team öffnen" }));
    expect(await screen.findByText("Realer Teamkalender")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Zurück" }));
    expect(await screen.findByText("Reale Teamverwaltung")).toBeVisible();
  });

  it("signs out through the existing auth action", async () => {
    render(<Coach />);
    await screen.findByText("Reale Übersicht");

    fireEvent.click(screen.getByRole("button", { name: "Abmelden" }));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledTimes(1));
    expect(mocks.navigate).toHaveBeenCalledWith("/");
  });

  it("opens the dedicated coach account and feedback area from the header", async () => {
    render(<Coach />);
    await screen.findByText("Reale Übersicht");

    fireEvent.click(screen.getByRole("button", { name: "Konto und Feedback" }));
    expect(await screen.findByText("Coach-Konto und Feedback")).toBeInTheDocument();
  });
});
