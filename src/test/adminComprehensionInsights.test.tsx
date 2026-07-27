import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminComprehensionInsights from "@/components/admin/AdminComprehensionInsights";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: mocks.rpc,
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
  },
}));

const payload = {
  schema_version: "admin-comprehension-insights-v1",
  generated_at: "2026-07-27T12:30:00.000Z",
  include_test: false,
  summary: {
    participants: 8,
    completed_checks: 20,
    question_responses: 40,
    correct_responses: 27,
    incorrect_responses: 13,
    accuracy: 0.675,
    sufficient_data: true,
  },
  weeks: [
    {
      week_number: 1,
      participants: 8,
      completed_checks: 20,
      question_responses: 40,
      correct_responses: 27,
      incorrect_responses: 13,
      accuracy: 0.675,
      sufficient_data: true,
    },
  ],
  days: [],
  questions: [
    {
      day_number: 4,
      week_number: 1,
      question_id: "d4-q1",
      question_version_key: "version-1",
      target: "action",
      stem: "Was machst du direkt nach einem Fehler?",
      participants: 8,
      times_shown: 8,
      correct_responses: 5,
      incorrect_responses: 3,
      accuracy: 0.625,
      needs_content_review: true,
      sufficient_data: true,
    },
  ],
  privacy: {
    minimum_participants_for_scores: 5,
    journal_or_reflection_text_included: false,
    selected_options_included: false,
    user_identifiers_included: false,
    names_or_emails_included: false,
    test_data_included: false,
  },
};

describe("admin comprehension insights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads only production aggregates and explains the interpretation boundary", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: payload, error: null });

    render(<AdminComprehensionInsights />);

    expect(await screen.findByRole("heading", { name: "Verständnis der Tagesinhalte" })).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledWith("get_admin_comprehension_insights", {
      _include_test: false,
    });
    expect(screen.getByText("Production ohne QA")).toBeInTheDocument();
    expect(screen.getByText("Scores ab n ≥ 5")).toBeInTheDocument();
    expect(screen.getAllByText("Was machst du direkt nach einem Fehler?")).toHaveLength(2);
    expect(screen.getByText(/bewertet nicht die Qualität der Kontrollfrage/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /csv/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/selectedOptionId/i)).not.toBeInTheDocument();
  });

  it("fails closed when the aggregate RPC is unavailable", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "admin_role_required" },
    });

    render(<AdminComprehensionInsights />);

    expect(await screen.findByText("Verständnisdaten sind derzeit nicht verfügbar.")).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Verständnisdaten konnten nicht geladen werden: admin_role_required",
      );
    });
  });
});
