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
});

describe("Admin Jarvis dashboard", () => {
  it("renders the connected decision view and honest trend boundary", () => {
    render(<AdminJarvisDashboard data={model()} />);
    expect(screen.getByText("Vom Zugang zur Nutzung")).toBeInTheDocument();
    expect(screen.getByText("Teams im Vergleich")).toBeInTheDocument();
    expect(screen.getByText("Solo-Athleten")).toBeInTheDocument();
    expect(screen.getByText("Auf und Ab: noch bewusst offen")).toBeInTheDocument();
    expect(screen.getByText(/Fenster überlappen/)).toBeInTheDocument();
    expect(screen.getByText("75 %")).toBeInTheDocument();
  });

  it("suppresses group analysis below n five", () => {
    render(<AdminJarvisDashboard data={model(4)} />);
    expect(screen.getByText("Noch keine geschützte Gruppenanalyse.")).toBeInTheDocument();
    expect(screen.queryByText("Vom Zugang zur Nutzung")).not.toBeInTheDocument();
  });
});
