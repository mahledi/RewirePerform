import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Coach from "@/pages/Coach";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  signOut: vi.fn(),
  overviewProps: vi.fn(),
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
            program_start_date: "2026-08-01",
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
  default: (props: unknown) => {
    mocks.overviewProps(props);
    return <div>Reale Übersicht</div>;
  },
}));
vi.mock("@/components/coach/TeamMentalState", () => ({ default: () => <div>Realer Teamzustand</div> }));
vi.mock("@/components/coach/TeamEvidence", () => ({ default: () => <div>Reale Entwicklung</div> }));
vi.mock("@/components/coach/CoachEvidenceReviewPanel", () => ({ default: () => <div>Reale Beobachtung</div> }));
vi.mock("@/components/coach/CoachToolkit", () => ({ default: () => <div>Reales Toolkit</div> }));
vi.mock("@/components/coach/TeamManagement", () => ({ default: () => <div>Reale Teamverwaltung</div> }));

describe("premium Coach dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("signs out through the existing auth action", async () => {
    render(<Coach />);
    await screen.findByText("Reale Übersicht");

    fireEvent.click(screen.getByRole("button", { name: "Abmelden" }));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledTimes(1));
    expect(mocks.navigate).toHaveBeenCalledWith("/");
  });
});
