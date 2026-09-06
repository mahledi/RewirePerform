import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AdminJarvisDashboard from "@/components/admin/AdminJarvisDashboard";
import type { JarvisReadModel } from "@/lib/adminJarvis";

const model = (athletes = 12): JarvisReadModel => ({
  overview: { total_athletes: athletes },
  teams: [],
  system: { teams_below_min_n: 1 },
  operations: { failed_events_24h: 2 },
  presentation: null,
  study: {
    summary: { athletes_total: athletes },
    activation: { activated_athletes: 10, day_1_completed: 9, active_7d: 8, active_28d: 11, day_56_completed: 1, activation_rate: 0.83, day_1_rate: 0.75, active_7d_rate: 0.67 },
    activity: { avg_completion_rate: 0.72, avg_comprehension: 0.81 },
    data_quality: { athletes_without_program_instance: 1, athletes_without_day_1: 2, athletes_without_any_activity: 3 },
    measurement_readiness: { validated_assessments_pre_n: 10, validated_assessments_mid_n: 7, validated_assessments_post_n: 5 },
    team_summaries: [{ team: "U17", athlete_count: 8, avg_completion_rate: 0.72, avg_comprehension: 0.81 }],
  },
  solo: { sample: { eligible_participants: 6, total_observations: 24 }, coverage: { transfer_completion_rate: 0.75 } },
  trends: {
    segments: [
      { participation_mode: "all", sample_size: 12, sufficient_data: true, previous_active_athletes: 6, current_active_athletes: 8, active_athlete_delta: 2, direction: "up", previous_checkins: 20, current_checkins: 28, previous_completed_days: 18, current_completed_days: 24 },
      { participation_mode: "team", sample_size: 8, sufficient_data: true, previous_active_athletes: 5, current_active_athletes: 4, active_athlete_delta: -1, direction: "down", previous_checkins: 14, current_checkins: 12, previous_completed_days: 11, current_completed_days: 10 },
      { participation_mode: "solo", sample_size: 4, sufficient_data: false, previous_active_athletes: null, current_active_athletes: null, active_athlete_delta: null, direction: "insufficient_data", previous_checkins: null, current_checkins: null, previous_completed_days: null, current_completed_days: null },
    ],
    data_quality: { previous_unclassified_events: 1, current_unclassified_events: 2 },
  },
});

describe("Admin Jarvis dashboard", () => {
  it("renders the connected decision view and equal-window trends", () => {
    render(<AdminJarvisDashboard data={model()} />);
    expect(screen.getByText("Vom Zugang zur Nutzung")).toBeInTheDocument();
    expect(screen.getByText("Teams im Vergleich")).toBeInTheDocument();
    expect(screen.getByText("Solo-Athleten")).toBeInTheDocument();
    expect(screen.getByText("Aktivitätstrend")).toBeInTheDocument();
    expect(screen.getByText("6 → 8")).toBeInTheDocument();
    expect(screen.getByText("5 → 4")).toBeInTheDocument();
    expect(screen.getByText("Noch geschützt")).toBeInTheDocument();
    expect(screen.getByText(/Testprofile, Test-Programminstanzen und Testteams/)).toBeInTheDocument();
    expect(screen.getByText(/1 frühere und 2 aktuelle Aktivitätsereignisse/)).toBeInTheDocument();
    expect(screen.getByText("75 %")).toBeInTheDocument();
  });

  it("suppresses group analysis below n five", () => {
    render(<AdminJarvisDashboard data={model(4)} />);
    expect(screen.getByText("Noch keine geschützte Gruppenanalyse.")).toBeInTheDocument();
    expect(screen.queryByText("Vom Zugang zur Nutzung")).not.toBeInTheDocument();
  });
});
