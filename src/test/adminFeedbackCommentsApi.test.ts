import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc },
}));

import {
  AdminFeedbackCommentsError,
  getAdminFeedbackCommentPage,
} from "@/lib/adminFeedbackComments";

const item = {
  comment_id: "10000000-0000-4000-8000-000000000010",
  subject_reference: "20000000-0000-4000-8000-000000000010",
  submitted_at: "2026-08-14T10:00:00.000Z",
  program_day: 10,
  campaign_reference: "feedback-day-10-v1",
  questionnaire_version: "feedback-d10-v1.1.2",
  questionnaire_manifest_hash: "48c2bf887ec96a0cc49eb327b380f7da7d163beb08929b9b359bfa0356692f2c",
  content_version: "feedback-intelligence-content-v1.1.2",
  question_id: "d10_content_clarity",
  selected_option_ids: ["2"],
  comment: "Die Sprache ist klar, nur an Trainingstagen ist es etwas viel Text.",
  authorization: {
    consent_valid_at_read: true,
    guardian_required: true,
    retention_days: 365,
  },
  activity_snapshot: {
    program_days_available: 10,
    program_days_completed: 9,
    checkins_completed: 8,
    journal_entries_created_count: 4,
    tasks_completed: 7,
    transfer_pulse_count: 2,
    resume_delay_bucket: "DAYS_1_3",
    continuation_status_bucket: "ACTIVE_OR_COMPLETED",
  },
};

const page = {
  schema_version: "admin-feedback-comment-page-v1.1",
  access_request_reference: "30000000-0000-4000-8000-000000000010",
  generated_at: "2026-08-14T10:05:00.000Z",
  data_scope: "production",
  checkpoint_day: 10,
  returned_count: 1,
  has_more: true,
  next_cursor: {
    submitted_at: item.submitted_at,
    comment_id: item.comment_id,
  },
  items: [item],
  privacy: {
    journal_or_reflection_text_included: false,
    jarvis_raw_text_access_included: false,
  },
};

describe("admin Feedback Intelligence comment API", () => {
  afterEach(() => mocks.rpc.mockReset());

  it("uses the purpose-bound cursor contract and maps only current questionnaire copy", async () => {
    mocks.rpc.mockResolvedValue({ data: page, error: null });

    const result = await getAdminFeedbackCommentPage({
      dataScope: "production",
      checkpointDay: 10,
      pageSize: 20,
    });

    expect(mocks.rpc).toHaveBeenCalledWith("get_admin_feedback_comment_page", {
      _purpose: "pilot_product_feedback_review",
      _data_scope: "production",
      _checkpoint_day: 10,
      _before_submitted_at: null,
      _before_comment_id: null,
      _page_size: 20,
    });
    expect(result.items[0]).toMatchObject({
      questionPrompt: "Wie verständlich sind die täglichen Inhalte bisher für dich?",
      selectedOptionLabels: ["Eher verständlich"],
      guardianRequired: true,
    });
    expect(result.items[0].activitySnapshot?.journalEntriesCreatedCount).toBe(4);
  });

  it("fails closed on questionnaire drift instead of displaying mismatched raw text", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        ...page,
        items: [{ ...item, questionnaire_manifest_hash: "a".repeat(64) }],
      },
      error: null,
    });

    await expect(getAdminFeedbackCommentPage()).rejects.toEqual(
      new AdminFeedbackCommentsError("admin_feedback_contract_drift"),
    );
  });

  it("does not accept a response that claims consent is invalid", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        ...page,
        items: [{
          ...item,
          authorization: { ...item.authorization, consent_valid_at_read: false },
        }],
      },
      error: null,
    });

    await expect(getAdminFeedbackCommentPage()).rejects.toBeInstanceOf(AdminFeedbackCommentsError);
  });
});
