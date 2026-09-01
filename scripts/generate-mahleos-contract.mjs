import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, "docs/mahleos-handoff/contracts/v1");
const checkOnly = process.argv.includes("--check");
const schemaBase = "https://rewireperform.com/contracts/mahleos/v1";

const strictObject = (required, properties, extra = {}) => ({
  type: "object",
  required,
  properties,
  additionalProperties: false,
  ...extra,
});
const schema = (name, title, body) => ({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: `${schemaBase}/${name}.schema.json`,
  title,
  ...body,
});
const arrayOf = (items) => ({ type: "array", items });
const nonnegativeInteger = { type: "integer", minimum: 0 };
const nullableNonnegativeInteger = { type: ["integer", "null"], minimum: 0 };
const dateTime = {
  type: "string",
  pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})$",
};
const nullableDateTime = { ...dateTime, type: ["string", "null"] };
const date = { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" };
const nullableDate = { ...date, type: ["string", "null"] };
const uuid = {
  type: "string",
  pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
};
const nullableUuid = { ...uuid, type: ["string", "null"] };
const sha256 = { type: "string", pattern: "^[a-f0-9]{64}$" };
const reportingTimezone = { const: "UTC" };
const operationalStatus = { enum: ["GREEN", "YELLOW", "RED"] };
const extendedOperationalStatus = { enum: ["GREEN", "YELLOW", "RED", "NO_DATA"] };
const privacyArray = (values) => ({ const: values });

const systemPrivacyExclusions = [
  "names",
  "emails",
  "user_ids",
  "team_names",
  "feedback_text",
  "journal_text",
  "free_reflection",
  "individual_scores",
  "raw_checkins",
];
const trackingPrivacyExclusions = [
  "user_ids",
  "daily_checkin_values",
  "wellbeing_metrics",
  "reflection",
  "journal_text",
  "assessment_scores",
];
const pilotPrivacyExclusions = [
  "team_name",
  "athlete_names",
  "user_ids",
  "missing_player_lists",
  "individual_scores",
  "coach_observation_values",
  "journal_text",
  "reflection",
];
const soloPrivacyExclusions = [
  "athlete_names",
  "user_ids",
  "individual_checkins",
  "individual_scores",
  "journal_text",
  "reflection",
];
const evidencePrivacyExclusions = [
  "evidence_payload",
  "analysis_manifest",
  "locked_by",
  "athlete_identifiers",
  "private_text",
  "individual_values",
];

const healthFlowFailures = strictObject(
  [
    "auth_login",
    "auth_signup",
    "team_join_attempt",
    "daily_checkin_saved",
    "journal_saved",
    "assessment_saved",
    "coach_evidence_load_failed",
    "app_runtime_error",
  ],
  Object.fromEntries([
    "auth_login",
    "auth_signup",
    "team_join_attempt",
    "daily_checkin_saved",
    "journal_saved",
    "assessment_saved",
    "coach_evidence_load_failed",
    "app_runtime_error",
  ].map((key) => [key, nonnegativeInteger])),
);

const criticalJourneyCoverage = strictObject(
  ["auth_login", "auth_signup", "team_join", "program_start", "minor_authorization"],
  {
    auth_login: strictObject(
      ["coverage", "authority", "successes_24h", "failures_24h"],
      {
        coverage: { const: "AUTHENTICATED_SUCCESS_ONLY" },
        authority: { const: "authenticated_app_event_log" },
        successes_24h: nonnegativeInteger,
        failures_24h: { type: "null" },
      },
    ),
    auth_signup: strictObject(
      ["coverage", "authority", "successes_24h", "failures_24h"],
      {
        coverage: { const: "SERVER_ACCOUNT_CREATION_ONLY" },
        authority: { const: "auth.users" },
        successes_24h: nonnegativeInteger,
        failures_24h: { type: "null" },
      },
    ),
    team_join: strictObject(
      ["coverage", "authority", "attempts_24h", "successes_24h", "failures_24h"],
      {
        coverage: { const: "AUTHENTICATED_APP_EVENTS" },
        authority: { const: "authenticated_app_event_log" },
        attempts_24h: nonnegativeInteger,
        successes_24h: nonnegativeInteger,
        failures_24h: nonnegativeInteger,
      },
    ),
    program_start: strictObject(
      ["coverage", "authority", "attempts_24h", "successes_24h", "failures_24h", "state_reconciliation"],
      {
        coverage: { const: "SERVER_ACTIVATION_SUCCESS_AND_STATE_RECONCILIATION" },
        authority: { const: "teams_program_runs_program_instances" },
        attempts_24h: { type: "null" },
        successes_24h: nonnegativeInteger,
        failures_24h: { type: "null" },
        state_reconciliation: { const: "COMPLETE" },
      },
    ),
    minor_authorization: strictObject(
      ["coverage", "authority", "delivery_failures_24h"],
      {
        coverage: { enum: ["NOT_CONNECTED", "STRUCTURAL_AND_DELIVERY_ONLY"] },
        authority: { const: "minor_auth_state_machine" },
        delivery_failures_24h: nullableNonnegativeInteger,
      },
    ),
  },
);

const systemHealthSchema = schema("system-health", "MahleOS system health v1", strictObject(
  [
    "schema_version",
    "generated_at",
    "reporting_timezone",
    "status",
    "identity_integrity",
    "program_integrity",
    "tracking_integrity_7d",
    "operations_24h",
    "critical_journey_coverage",
    "notifications_7d",
    "feedback",
    "privacy_level",
    "privacy_exclusions",
  ],
  {
    schema_version: { const: "mahleos-system-health-v1.5" },
    generated_at: dateTime,
    reporting_timezone: reportingTimezone,
    status: operationalStatus,
    identity_integrity: strictObject(
      ["users_missing_profile", "production_profiles_missing_role"],
      {
        users_missing_profile: nonnegativeInteger,
        production_profiles_missing_role: nonnegativeInteger,
      },
    ),
    program_integrity: strictObject(
      [
        "athletes_without_program_instance",
        "athletes_with_multiple_active_instances",
        "active_team_instances_without_run",
        "active_runs_without_start_date",
        "activated_teams_without_active_run",
        "activated_teams_with_multiple_active_runs",
        "active_runs_with_assignment_set_mismatch",
      ],
      {
        athletes_without_program_instance: nonnegativeInteger,
        athletes_with_multiple_active_instances: nonnegativeInteger,
        active_team_instances_without_run: nonnegativeInteger,
        active_runs_without_start_date: nonnegativeInteger,
        activated_teams_without_active_run: nonnegativeInteger,
        activated_teams_with_multiple_active_runs: nonnegativeInteger,
        active_runs_with_assignment_set_mismatch: nonnegativeInteger,
      },
    ),
    tracking_integrity_7d: strictObject(
      [
        "checkins_missing_instance",
        "completions_missing_instance",
        "assessments_missing_instance",
        "questionnaires_missing_instance",
        "comprehension_missing_instance",
      ],
      {
        checkins_missing_instance: nonnegativeInteger,
        completions_missing_instance: nonnegativeInteger,
        assessments_missing_instance: nonnegativeInteger,
        questionnaires_missing_instance: nonnegativeInteger,
        comprehension_missing_instance: nonnegativeInteger,
      },
    ),
    operations_24h: strictObject(
      ["failed_events", "critical_failed_events", "flow_failures"],
      {
        failed_events: nonnegativeInteger,
        critical_failed_events: nonnegativeInteger,
        flow_failures: healthFlowFailures,
      },
    ),
    critical_journey_coverage: criticalJourneyCoverage,
    notifications_7d: strictObject(
      ["sent", "opened", "failed", "expired_subscriptions"],
      {
        sent: nonnegativeInteger,
        opened: nonnegativeInteger,
        failed: nonnegativeInteger,
        expired_subscriptions: nonnegativeInteger,
      },
    ),
    feedback: strictObject(["open"], { open: nonnegativeInteger }),
    privacy_level: { const: "aggregate_operational_no_user_content" },
    privacy_exclusions: privacyArray(systemPrivacyExclusions),
  },
));

const trackingQualitySchema = schema("tracking-quality", "MahleOS tracking quality v1", strictObject(
  [
    "schema_version",
    "generated_at",
    "reporting_timezone",
    "status",
    "activity",
    "integrity",
    "save_pipeline_24h",
    "test_data_included",
    "privacy_level",
    "privacy_exclusions",
  ],
  {
    schema_version: { const: "mahleos-tracking-quality-v1" },
    generated_at: dateTime,
    reporting_timezone: reportingTimezone,
    status: operationalStatus,
    activity: strictObject(
      [
        "active_instances",
        "active_athletes_7d",
        "checkins_today",
        "checkins_7d",
        "completed_days_today",
        "completed_days_7d",
        "fresh_snapshots_today",
      ],
      {
        active_instances: nonnegativeInteger,
        active_athletes_7d: nonnegativeInteger,
        checkins_today: nonnegativeInteger,
        checkins_7d: nonnegativeInteger,
        completed_days_today: nonnegativeInteger,
        completed_days_7d: nonnegativeInteger,
        fresh_snapshots_today: nonnegativeInteger,
      },
    ),
    integrity: strictObject(
      [
        "duplicate_checkins_56d",
        "checkins_missing_instance_7d",
        "completions_missing_instance_7d",
        "completions_without_checkin_7d",
      ],
      {
        duplicate_checkins_56d: nonnegativeInteger,
        checkins_missing_instance_7d: nonnegativeInteger,
        completions_missing_instance_7d: nonnegativeInteger,
        completions_without_checkin_7d: nonnegativeInteger,
      },
    ),
    save_pipeline_24h: strictObject(
      ["success", "failed"],
      { success: nonnegativeInteger, failed: nonnegativeInteger },
    ),
    test_data_included: { const: false },
    privacy_level: { const: "aggregate_tracking_counts_only" },
    privacy_exclusions: privacyArray(trackingPrivacyExclusions),
  },
));

const feedbackStatusSchema = schema("feedback-status", "MahleOS feedback status v1", strictObject(
  [
    "schema_version",
    "generated_at",
    "reporting_timezone",
    "status",
    "counts",
    "open_by_category",
    "feedback_text_exported",
    "user_identifiers_exported",
    "privacy_level",
  ],
  {
    schema_version: { const: "mahleos-feedback-status-v1" },
    generated_at: dateTime,
    reporting_timezone: reportingTimezone,
    status: { enum: ["CLEAR", "OPEN", "NEEDS_ATTENTION"] },
    counts: strictObject(
      ["open", "reviewed", "resolved", "new_24h", "new_7d"],
      {
        open: nonnegativeInteger,
        reviewed: nonnegativeInteger,
        resolved: nonnegativeInteger,
        new_24h: nonnegativeInteger,
        new_7d: nonnegativeInteger,
      },
    ),
    open_by_category: strictObject(
      ["bug", "suggestion", "general", "other"],
      {
        bug: nonnegativeInteger,
        suggestion: nonnegativeInteger,
        general: nonnegativeInteger,
        other: nonnegativeInteger,
      },
    ),
    feedback_text_exported: { const: false },
    user_identifiers_exported: { const: false },
    privacy_level: { const: "backlog_counts_only" },
  },
));

const integerMap = {
  type: "object",
  propertyNames: { pattern: "^[A-Za-z0-9_.:/-]{1,96}$" },
  additionalProperties: nonnegativeInteger,
};
const nullableMetric = { type: ["integer", "null"], minimum: 0 };
const nullableAccuracy = { type: ["number", "null"], minimum: 0, maximum: 1 };

const adminOverviewSchema = schema("admin-overview", "MahleOS admin overview v1", strictObject(
  ["schema_version", "generated_at", "reporting_timezone", "counts", "test_data_included", "privacy_level", "direct_identifiers_included", "private_content_included"],
  {
    schema_version: { const: "mahleos-admin-overview-v1" },
    generated_at: dateTime,
    reporting_timezone: reportingTimezone,
    counts: strictObject(
      ["users", "athletes", "coaches", "admins", "teams", "active_program_runs", "active_program_instances", "completed_days_total", "checkins_total", "assessments_total", "comprehension_checks_completed"],
      Object.fromEntries(["users", "athletes", "coaches", "admins", "teams", "active_program_runs", "active_program_instances", "completed_days_total", "checkins_total", "assessments_total", "comprehension_checks_completed"].map((key) => [key, nonnegativeInteger])),
    ),
    test_data_included: { const: false },
    privacy_level: { const: "company_counts_only" },
    direct_identifiers_included: { const: false },
    private_content_included: { const: false },
  },
));

const adminTeamItem = strictObject(
  ["team_reference", "sport_category", "program_start_date", "athletes", "active_7d", "inactive_7d", "checkins_7d", "completed_days_7d", "pre_n", "mid_n", "post_n", "run_reference", "run_status", "run_started_at"],
  {
    team_reference: { type: "string", pattern: "^aggregate-team-[a-f0-9]{16}$" },
    sport_category: { type: "string", minLength: 1, maxLength: 64 },
    program_start_date: nullableDate,
    athletes: nonnegativeInteger,
    active_7d: nonnegativeInteger,
    inactive_7d: nonnegativeInteger,
    checkins_7d: nonnegativeInteger,
    completed_days_7d: nonnegativeInteger,
    pre_n: nonnegativeInteger,
    mid_n: nonnegativeInteger,
    post_n: nonnegativeInteger,
    run_reference: { type: ["string", "null"], pattern: "^aggregate-run-[a-f0-9]{16}$" },
    run_status: { type: ["string", "null"], enum: ["planned", "active", null] },
    run_started_at: nullableDate,
  },
);
const adminTeamsSchema = schema("admin-teams", "MahleOS admin teams v1", strictObject(
  ["schema_version", "generated_at", "reporting_timezone", "returned_teams", "truncated", "teams", "test_data_included", "team_names_included", "direct_identifiers_included", "private_content_included"],
  {
    schema_version: { const: "mahleos-admin-teams-v1" },
    generated_at: dateTime,
    reporting_timezone: reportingTimezone,
    returned_teams: { type: "integer", minimum: 0, maximum: 50 },
    truncated: { type: "boolean" },
    teams: { type: "array", maxItems: 50, items: adminTeamItem },
    test_data_included: { const: false },
    team_names_included: { const: false },
    direct_identifiers_included: { const: false },
    private_content_included: { const: false },
  },
));

const comprehensionAggregate = (dimensions) => strictObject(
  [...dimensions, "participants", "completed_checks", "question_responses", "correct_responses", "incorrect_responses", "accuracy"],
  {
    ...Object.fromEntries(dimensions.map((key) => [key, { type: "integer", minimum: 1 }])),
    participants: { type: "integer", minimum: 5 },
    completed_checks: nonnegativeInteger,
    question_responses: nonnegativeInteger,
    correct_responses: nonnegativeInteger,
    incorrect_responses: nonnegativeInteger,
    accuracy: nullableAccuracy,
  },
);
const comprehensionQuestion = strictObject(
  ["day_number", "week_number", "question_id", "question_version_key", "target", "participants", "times_shown", "correct_responses", "incorrect_responses", "accuracy", "needs_content_review"],
  {
    day_number: { type: "integer", minimum: 1 },
    week_number: { type: "integer", minimum: 1 },
    question_id: { type: "string", minLength: 1, maxLength: 160 },
    question_version_key: { type: "string", pattern: "^[a-f0-9]{32}$" },
    target: { type: "string", minLength: 1, maxLength: 96 },
    participants: { type: "integer", minimum: 5 },
    times_shown: nonnegativeInteger,
    correct_responses: nonnegativeInteger,
    incorrect_responses: nonnegativeInteger,
    accuracy: nullableAccuracy,
    needs_content_review: { type: "boolean" },
  },
);
const adminComprehensionSchema = schema("admin-comprehension", "MahleOS admin comprehension v1", strictObject(
  ["schema_version", "generated_at", "reporting_timezone", "summary", "weeks", "days", "questions", "suppressed_groups", "minimum_distinct_participants", "question_text_included", "selected_options_included", "direct_identifiers_included", "private_content_included", "test_data_included"],
  {
    schema_version: { const: "mahleos-admin-comprehension-v1" },
    generated_at: dateTime,
    reporting_timezone: reportingTimezone,
    summary: strictObject(
      ["participants", "completed_checks", "question_responses", "correct_responses", "incorrect_responses", "accuracy", "sufficient_data"],
      { participants: nonnegativeInteger, completed_checks: nullableMetric, question_responses: nullableMetric, correct_responses: nullableMetric, incorrect_responses: nullableMetric, accuracy: nullableAccuracy, sufficient_data: { type: "boolean" } },
    ),
    weeks: arrayOf(comprehensionAggregate(["week_number"])),
    days: arrayOf(comprehensionAggregate(["day_number", "week_number"])),
    questions: arrayOf(comprehensionQuestion),
    suppressed_groups: strictObject(["weeks", "days", "questions"], { weeks: nonnegativeInteger, days: nonnegativeInteger, questions: nonnegativeInteger }),
    minimum_distinct_participants: { const: 5 },
    question_text_included: { const: false },
    selected_options_included: { const: false },
    direct_identifiers_included: { const: false },
    private_content_included: { const: false },
    test_data_included: { const: false },
  },
));

const adminFeedbackMetadataSchema = schema("admin-feedback-metadata", "MahleOS admin feedback metadata v1", strictObject(
  ["schema_version", "generated_at", "reporting_timezone", "counts", "open_by_category", "by_platform", "by_runtime", "by_app_version", "test_data_included", "free_text_included", "admin_notes_included", "direct_identifiers_included"],
  {
    schema_version: { const: "mahleos-admin-feedback-metadata-v1" },
    generated_at: dateTime,
    reporting_timezone: reportingTimezone,
    counts: strictObject(["total", "open", "reviewed", "resolved", "new_24h", "new_7d"], Object.fromEntries(["total", "open", "reviewed", "resolved", "new_24h", "new_7d"].map((key) => [key, nonnegativeInteger]))),
    open_by_category: strictObject(["bug", "suggestion", "general", "other"], Object.fromEntries(["bug", "suggestion", "general", "other"].map((key) => [key, nonnegativeInteger]))),
    by_platform: integerMap,
    by_runtime: integerMap,
    by_app_version: integerMap,
    test_data_included: { const: false },
    free_text_included: { const: false },
    admin_notes_included: { const: false },
    direct_identifiers_included: { const: false },
  },
));

const adminPartnerRequestsSchema = schema("admin-partner-requests", "MahleOS admin partner requests v1", strictObject(
  ["schema_version", "generated_at", "reporting_timezone", "counts", "by_organization_type", "by_rollout_scope", "by_desired_start", "contact_details_included", "organization_names_included", "notes_or_context_included", "direct_identifiers_included"],
  {
    schema_version: { const: "mahleos-admin-partner-requests-v1" },
    generated_at: dateTime,
    reporting_timezone: reportingTimezone,
    counts: strictObject(["total", "submitted", "needs_information", "review_ready", "call_requested", "approved", "activated", "declined_or_withdrawn", "open_older_than_7d"], Object.fromEntries(["total", "submitted", "needs_information", "review_ready", "call_requested", "approved", "activated", "declined_or_withdrawn", "open_older_than_7d"].map((key) => [key, nonnegativeInteger]))),
    by_organization_type: integerMap,
    by_rollout_scope: integerMap,
    by_desired_start: integerMap,
    contact_details_included: { const: false },
    organization_names_included: { const: false },
    notes_or_context_included: { const: false },
    direct_identifiers_included: { const: false },
  },
));

const activityTrendSegment = strictObject(
  [
    "participation_mode", "sample_size", "sufficient_data",
    "previous_active_athletes", "current_active_athletes",
    "active_athlete_delta", "active_athlete_change_rate", "direction",
    "previous_checkins", "current_checkins",
    "previous_completed_days", "current_completed_days",
  ],
  {
    participation_mode: { enum: ["all", "team", "solo"] },
    sample_size: nonnegativeInteger,
    sufficient_data: { type: "boolean" },
    previous_active_athletes: nullableNonnegativeInteger,
    current_active_athletes: nullableNonnegativeInteger,
    active_athlete_delta: { type: ["integer", "null"] },
    active_athlete_change_rate: { type: ["number", "null"] },
    direction: { enum: ["up", "down", "flat", "insufficient_data"] },
    previous_checkins: nullableNonnegativeInteger,
    current_checkins: nullableNonnegativeInteger,
    previous_completed_days: nullableNonnegativeInteger,
    current_completed_days: nullableNonnegativeInteger,
  },
);

const adminActivityTrendsSchema = schema("admin-activity-trends", "MahleOS admin activity trends v1", strictObject(
  [
    "schema_version", "generated_at", "reporting_timezone", "window_days",
    "previous_window", "current_window", "segments", "data_quality", "privacy",
  ],
  {
    schema_version: { const: "admin-activity-trends-v1" },
    generated_at: dateTime,
    reporting_timezone: reportingTimezone,
    window_days: { const: 7 },
    previous_window: strictObject(["start_date", "end_date"], { start_date: date, end_date: date }),
    current_window: strictObject(["start_date", "end_date"], { start_date: date, end_date: date }),
    segments: { type: "array", minItems: 3, maxItems: 3, items: activityTrendSegment },
    data_quality: strictObject(
      ["previous_unclassified_events", "current_unclassified_events", "unclassified_events_in_overall"],
      {
        previous_unclassified_events: nonnegativeInteger,
        current_unclassified_events: nonnegativeInteger,
        unclassified_events_in_overall: { const: true },
      },
    ),
    privacy: strictObject(
      [
        "minimum_distinct_athletes_per_segment", "test_profiles_excluded",
        "test_program_instances_excluded", "test_teams_excluded",
        "names_or_emails_included", "direct_identifiers_included",
        "individual_rows_included", "free_text_included", "observational_not_causal",
      ],
      {
        minimum_distinct_athletes_per_segment: { const: 5 },
        test_profiles_excluded: { const: true },
        test_program_instances_excluded: { const: true },
        test_teams_excluded: { const: true },
        names_or_emails_included: { const: false },
        direct_identifiers_included: { const: false },
        individual_rows_included: { const: false },
        free_text_included: { const: false },
        observational_not_causal: { const: true },
      },
    ),
  },
));

const pilotReadinessFull = strictObject(
  [
    "schema_version",
    "generated_at",
    "reporting_timezone",
    "program_run_id",
    "run_status",
    "started_at",
    "ended_at",
    "status",
    "current_program_day",
    "setup",
    "evidence_authorization",
    "pre_measurement",
    "daily_tracking",
    "transfer_tracking",
    "coach_tracking",
    "data_quality",
    "test_data_included",
    "privacy_level",
    "privacy_exclusions",
  ],
  {
    schema_version: { const: "mahleos-pilot-readiness-v1" },
    generated_at: dateTime,
    reporting_timezone: reportingTimezone,
    program_run_id: uuid,
    run_status: { enum: ["planned", "active", "completed", "archived"] },
    started_at: nullableDate,
    ended_at: nullableDate,
    status: operationalStatus,
    current_program_day: { type: "integer", minimum: 0, maximum: 56 },
    setup: strictObject(
      [
        "athletes",
        "with_program_instance",
        "active_instances",
        "run_instance_team_mismatches",
        "run_instances_outside_team_roster",
        "multiple_run_instances",
        "multiple_active_instances",
      ],
      {
        athletes: nonnegativeInteger,
        with_program_instance: nonnegativeInteger,
        active_instances: nonnegativeInteger,
        run_instance_team_mismatches: nonnegativeInteger,
        run_instances_outside_team_roster: nonnegativeInteger,
        multiple_run_instances: nonnegativeInteger,
        multiple_active_instances: nonnegativeInteger,
      },
    ),
    evidence_authorization: strictObject(
      ["eligible", "not_eligible", "complete"],
      {
        eligible: nonnegativeInteger,
        not_eligible: nonnegativeInteger,
        complete: { type: "boolean" },
      },
    ),
    pre_measurement: strictObject(
      ["validated_complete", "validated_missing"],
      {
        validated_complete: nonnegativeInteger,
        validated_missing: nonnegativeInteger,
      },
    ),
    daily_tracking: strictObject(
      ["day_1_completed", "checkins_today", "active_7d", "inactive_7d"],
      {
        day_1_completed: nonnegativeInteger,
        checkins_today: nonnegativeInteger,
        active_7d: nonnegativeInteger,
        inactive_7d: nonnegativeInteger,
      },
    ),
    transfer_tracking: strictObject(
      ["measurements_completed", "points_due_per_athlete", "measurements_expected"],
      {
        measurements_completed: nonnegativeInteger,
        points_due_per_athlete: nonnegativeInteger,
        measurements_expected: nonnegativeInteger,
      },
    ),
    coach_tracking: strictObject(
      ["weekly_reviews_completed", "weekly_reviews_due"],
      {
        weekly_reviews_completed: nonnegativeInteger,
        weekly_reviews_due: nonnegativeInteger,
      },
    ),
    data_quality: strictObject(
      [
        "duplicate_checkins",
        "completions_without_checkin",
        "run_instance_team_mismatches",
        "run_instances_outside_team_roster",
        "multiple_run_instances",
        "aggregate_visible",
        "low_confidence",
        "minimum_aggregate_n",
      ],
      {
        duplicate_checkins: nonnegativeInteger,
        completions_without_checkin: nonnegativeInteger,
        run_instance_team_mismatches: nonnegativeInteger,
        run_instances_outside_team_roster: nonnegativeInteger,
        multiple_run_instances: nonnegativeInteger,
        aggregate_visible: { type: "boolean" },
        low_confidence: { type: "boolean" },
        minimum_aggregate_n: { const: 5 },
      },
    ),
    test_data_included: { const: false },
    privacy_level: { const: "run_scoped_operational_counts_only" },
    privacy_exclusions: privacyArray(pilotPrivacyExclusions),
  },
);
const pilotReadinessExcluded = strictObject(
  [
    "schema_version",
    "generated_at",
    "reporting_timezone",
    "program_run_id",
    "status",
    "test_data_included",
    "privacy_level",
  ],
  {
    schema_version: { const: "mahleos-pilot-readiness-v1" },
    generated_at: dateTime,
    reporting_timezone: reportingTimezone,
    program_run_id: uuid,
    status: { const: "TEST_EXCLUDED" },
    test_data_included: { const: false },
    privacy_level: { const: "aggregate_operational_no_user_content" },
  },
);
const pilotReadinessSchema = schema(
  "pilot-readiness",
  "MahleOS pilot readiness v1",
  { oneOf: [pilotReadinessFull, pilotReadinessExcluded] },
);

const pilotCatalogItem = strictObject(
  [
    "program_run_id",
    "run_status",
    "started_at",
    "current_program_day",
    "readiness_status",
    "athletes",
    "evidence_eligible",
    "validated_pre_complete",
    "active_7d",
    "aggregate_visible",
    "low_confidence",
  ],
  {
    program_run_id: uuid,
    run_status: { const: "active" },
    started_at: nullableDate,
    current_program_day: { type: "integer", minimum: 0, maximum: 56 },
    readiness_status: operationalStatus,
    athletes: nonnegativeInteger,
    evidence_eligible: nonnegativeInteger,
    validated_pre_complete: nonnegativeInteger,
    active_7d: nonnegativeInteger,
    aggregate_visible: { type: "boolean" },
    low_confidence: { type: "boolean" },
  },
);
const pilotCatalogSchema = schema("pilot-catalog", "MahleOS pilot catalog v1", strictObject(
  [
    "schema_version",
    "generated_at",
    "reporting_timezone",
    "status",
    "total_active_runs",
    "returned_runs",
    "truncated",
    "runs",
    "test_data_included",
    "privacy_level",
    "privacy_exclusions",
  ],
  {
    schema_version: { const: "mahleos-pilot-catalog-v1" },
    generated_at: dateTime,
    reporting_timezone: reportingTimezone,
    status: extendedOperationalStatus,
    total_active_runs: nonnegativeInteger,
    returned_runs: { type: "integer", minimum: 0, maximum: 20 },
    truncated: { type: "boolean" },
    runs: { type: "array", maxItems: 20, items: pilotCatalogItem },
    test_data_included: { const: false },
    privacy_level: { const: "opaque_run_references_and_operational_counts_only" },
    privacy_exclusions: privacyArray(pilotPrivacyExclusions),
  },
));

const soloCohort = strictObject(
  [
    "sport_category",
    "sport_level",
    "athletes",
    "evidence_eligible",
    "aggregate_visible",
    "low_confidence",
  ],
  {
    sport_category: { type: "string", minLength: 1, maxLength: 64 },
    sport_level: { type: ["string", "null"], minLength: 1, maxLength: 64 },
    athletes: { type: "integer", minimum: 5 },
    evidence_eligible: nonnegativeInteger,
    aggregate_visible: { const: true },
    low_confidence: { type: "boolean" },
  },
);
const soloReadinessSchema = schema("solo-readiness", "MahleOS solo readiness v1", strictObject(
  [
    "schema_version",
    "generated_at",
    "reporting_timezone",
    "status",
    "setup",
    "evidence_authorization",
    "pre_measurement",
    "daily_tracking",
    "transfer_tracking",
    "cohort_breakdown",
    "suppressed_cohort_count",
    "data_quality",
    "test_data_included",
    "privacy_level",
    "privacy_exclusions",
  ],
  {
    schema_version: { const: "mahleos-solo-readiness-v1" },
    generated_at: dateTime,
    reporting_timezone: reportingTimezone,
    status: extendedOperationalStatus,
    setup: strictObject(
      ["athletes", "active_instances", "multiple_active_instances"],
      {
        athletes: nonnegativeInteger,
        active_instances: nonnegativeInteger,
        multiple_active_instances: nonnegativeInteger,
      },
    ),
    evidence_authorization: strictObject(
      ["eligible", "not_eligible", "complete"],
      {
        eligible: nonnegativeInteger,
        not_eligible: nonnegativeInteger,
        complete: { type: "boolean" },
      },
    ),
    pre_measurement: strictObject(
      ["validated_complete", "validated_missing"],
      {
        validated_complete: nonnegativeInteger,
        validated_missing: nonnegativeInteger,
      },
    ),
    daily_tracking: strictObject(
      ["day_1_completed", "checkins_today", "active_7d", "inactive_7d"],
      {
        day_1_completed: nonnegativeInteger,
        checkins_today: nonnegativeInteger,
        active_7d: nonnegativeInteger,
        inactive_7d: nonnegativeInteger,
      },
    ),
    transfer_tracking: strictObject(
      ["measurements_completed", "measurements_expected"],
      {
        measurements_completed: nonnegativeInteger,
        measurements_expected: nonnegativeInteger,
      },
    ),
    cohort_breakdown: arrayOf(soloCohort),
    suppressed_cohort_count: nonnegativeInteger,
    data_quality: strictObject(
      [
        "duplicate_checkins",
        "completions_without_checkin",
        "aggregate_visible",
        "low_confidence",
        "minimum_aggregate_n",
      ],
      {
        duplicate_checkins: nonnegativeInteger,
        completions_without_checkin: nonnegativeInteger,
        aggregate_visible: { type: "boolean" },
        low_confidence: { type: "boolean" },
        minimum_aggregate_n: { const: 5 },
      },
    ),
    test_data_included: { const: false },
    privacy_level: { const: "solo_operational_counts_with_suppressed_cohorts" },
    privacy_exclusions: privacyArray(soloPrivacyExclusions),
  },
));

const evidenceLockStatus = strictObject(
  [
    "lock_id",
    "scope_type",
    "program_run_id",
    "sport_category",
    "sport_level",
    "protocol_version",
    "snapshot_schema_version",
    "source_cutoff",
    "locked_at",
    "integrity_status",
  ],
  {
    lock_id: uuid,
    scope_type: { enum: ["program_run", "solo_aggregate"] },
    program_run_id: nullableUuid,
    sport_category: { type: ["string", "null"], minLength: 1, maxLength: 64 },
    sport_level: { type: ["string", "null"], minLength: 1, maxLength: 64 },
    protocol_version: { type: "string", minLength: 1, maxLength: 128 },
    snapshot_schema_version: { type: "string", minLength: 1, maxLength: 128 },
    source_cutoff: dateTime,
    locked_at: dateTime,
    integrity_status: { enum: ["VALID", "INVALID"] },
  },
);
const evidenceStatusSchema = schema("evidence-status", "MahleOS evidence status v1", strictObject(
  [
    "schema_version",
    "generated_at",
    "reporting_timezone",
    "status",
    "active_locks",
    "program_run_locks",
    "solo_aggregate_locks",
    "checksum_valid",
    "checksum_invalid",
    "returned_locks",
    "truncated",
    "locks",
    "test_data_included",
    "privacy_level",
    "privacy_exclusions",
  ],
  {
    schema_version: { const: "mahleos-evidence-status-v1" },
    generated_at: dateTime,
    reporting_timezone: reportingTimezone,
    status: extendedOperationalStatus,
    active_locks: nonnegativeInteger,
    program_run_locks: nonnegativeInteger,
    solo_aggregate_locks: nonnegativeInteger,
    checksum_valid: nonnegativeInteger,
    checksum_invalid: nonnegativeInteger,
    returned_locks: { type: "integer", minimum: 0, maximum: 100 },
    truncated: { type: "boolean" },
    locks: { type: "array", maxItems: 100, items: evidenceLockStatus },
    test_data_included: { const: false },
    privacy_level: { const: "data_lock_metadata_and_integrity_only" },
    privacy_exclusions: privacyArray(evidencePrivacyExclusions),
  },
));

const dailyBriefSchema = schema("daily-brief", "MahleOS daily brief v1", strictObject(
  [
    "schema_version",
    "generated_at",
    "reporting_timezone",
    "system_health",
    "tracking_quality",
    "feedback_status",
    "claim_boundary",
  ],
  {
    schema_version: { const: "mahleos-daily-brief-v1" },
    generated_at: dateTime,
    reporting_timezone: reportingTimezone,
    system_health: { $ref: `${schemaBase}/system-health.schema.json` },
    tracking_quality: { $ref: `${schemaBase}/tracking-quality.schema.json` },
    feedback_status: { $ref: `${schemaBase}/feedback-status.schema.json` },
    claim_boundary: {
      const: "operational monitoring only; no effectiveness or causal conclusion",
    },
  },
));

const successBranch = (view, dataRef) => strictObject(
  ["ok", "request_id", "view", "checksum_algorithm", "response_checksum", "data"],
  {
    ok: { const: true },
    request_id: uuid,
    view: { const: view },
    checksum_algorithm: { const: "sha256" },
    response_checksum: sha256,
    data: { $ref: `${schemaBase}/${dataRef}.schema.json` },
  },
);
const operationsSuccessSchema = schema(
  "operations-success",
  "MahleOS operations success envelope v1",
  {
    oneOf: [
      successBranch("daily_brief", "daily-brief"),
      successBranch("system_health", "system-health"),
      successBranch("tracking_quality", "tracking-quality"),
      successBranch("feedback_status", "feedback-status"),
      successBranch("pilot_readiness", "pilot-readiness"),
      successBranch("pilot_catalog", "pilot-catalog"),
      successBranch("solo_readiness", "solo-readiness"),
      successBranch("evidence_status", "evidence-status"),
      successBranch("admin_overview", "admin-overview"),
      successBranch("admin_teams", "admin-teams"),
      successBranch("admin_comprehension", "admin-comprehension"),
      successBranch("admin_feedback_metadata", "admin-feedback-metadata"),
      successBranch("admin_partner_requests", "admin-partner-requests"),
      successBranch("admin_activity_trends", "admin-activity-trends"),
    ],
  },
);

const viewRequest = (view) => strictObject(
  ["view"],
  { view: { const: view } },
);
const operationsRequestSchema = schema(
  "operations-request",
  "MahleOS operations request v1",
  {
    oneOf: [
      strictObject([], {}),
      viewRequest("daily_brief"),
      viewRequest("system_health"),
      viewRequest("tracking_quality"),
      viewRequest("feedback_status"),
      viewRequest("pilot_catalog"),
      viewRequest("solo_readiness"),
      viewRequest("evidence_status"),
      viewRequest("admin_overview"),
      viewRequest("admin_teams"),
      viewRequest("admin_comprehension"),
      viewRequest("admin_feedback_metadata"),
      viewRequest("admin_partner_requests"),
      viewRequest("admin_activity_trends"),
      strictObject(
        ["view", "program_run_id"],
        {
          view: { const: "pilot_readiness" },
          program_run_id: uuid,
        },
      ),
    ],
  },
);

const errorResponseSchema = schema("error-response", "MahleOS machine API error v1", strictObject(
  ["error"],
  {
    error: {
      enum: [
        "invalid_request",
        "invalid_json",
        "unauthorized",
        "not_found",
        "method_not_allowed",
        "request_too_large",
        "unsupported_media_type",
        "rate_limited",
        "service_not_configured",
        "operations_read_unavailable",
        "evidence_read_unavailable",
        "checksum_mismatch",
      ],
    },
    request_id: uuid,
  },
));

const evidenceManifestSchema = strictObject(
  [
    "manifest_version",
    "source_cutoff",
    "scope_type",
    "program_run_id",
    "sport_category",
    "sport_level",
    "data_mode",
    "protocol_version",
    "snapshot_schema_version",
    "checksum_algorithm",
    "content_checksum",
    "minimum_aggregate_n",
    "low_confidence_below_n",
    "included_sections",
  ],
  {
    manifest_version: { const: "evidence-analysis-manifest-v2-2026-07" },
    source_cutoff: dateTime,
    scope_type: { enum: ["program_run", "solo_aggregate"] },
    program_run_id: nullableUuid,
    sport_category: { type: ["string", "null"], minLength: 1, maxLength: 64 },
    sport_level: { type: ["string", "null"], minLength: 1, maxLength: 64 },
    data_mode: { const: "production_only" },
    protocol_version: { const: "56d-transfer-v2-2026-07" },
    snapshot_schema_version: {
      enum: [
        "program-run-evidence-lock-v2-2026-07",
        "solo-sport-evidence-lock-v2-2026-07",
      ],
    },
    checksum_algorithm: { const: "sha256" },
    content_checksum: sha256,
    minimum_aggregate_n: { const: 5 },
    low_confidence_below_n: { const: 10 },
    included_sections: { type: "array", minItems: 1, uniqueItems: true, items: { type: "string" } },
  },
);
const programRunEvidencePayload = strictObject(
  [
    "generated_at",
    "schema_version",
    "scope",
    "protocol_version",
    "meta",
    "sample",
    "usage",
    "team_pulse",
    "measurement",
    "outcomes",
    "transfer_evidence",
    "data_quality",
    "claim_boundary",
    "privacy",
  ],
  {
    generated_at: dateTime,
    schema_version: { const: "program-run-evidence-lock-v2-2026-07" },
    scope: { const: "program_run" },
    protocol_version: { const: "56d-transfer-v2-2026-07" },
    meta: { type: "object" },
    sample: { type: "object" },
    usage: { type: "object" },
    team_pulse: { type: "object" },
    measurement: { type: "object" },
    outcomes: { type: "object" },
    transfer_evidence: { type: "object" },
    data_quality: { type: "object" },
    claim_boundary: { type: "object" },
    privacy: { type: "object" },
  },
);
const soloEvidencePayload = strictObject(
  [
    "generated_at",
    "schema_version",
    "scope",
    "protocol_version",
    "sample",
    "sport_catalog",
    "cohort_breakdown",
    "usage",
    "measurement",
    "outcomes",
    "weekly_state",
    "transfer_evidence",
    "data_quality",
    "claim_boundary",
    "privacy",
  ],
  {
    generated_at: dateTime,
    schema_version: { const: "solo-sport-evidence-lock-v2-2026-07" },
    scope: { type: "object" },
    protocol_version: { const: "56d-transfer-v2-2026-07" },
    sample: { type: "object" },
    sport_catalog: { type: "object" },
    cohort_breakdown: { type: "array" },
    usage: { type: "object" },
    measurement: { type: "object" },
    outcomes: { type: "object" },
    weekly_state: { type: "array" },
    transfer_evidence: { type: "object" },
    data_quality: { type: "object" },
    claim_boundary: { type: "object" },
    privacy: { type: "object" },
  },
);
const evidenceReadSuccessSchema = schema("evidence-read-success", "MahleOS evidence read envelope v1", strictObject(
  [
    "ok",
    "request_id",
    "lock_id",
    "scope_type",
    "program_run_id",
    "sport_category",
    "sport_level",
    "protocol_version",
    "snapshot_schema_version",
    "source_cutoff",
    "locked_at",
    "checksum_algorithm",
    "content_checksum",
    "analysis_manifest",
    "evidence",
  ],
  {
    ok: { const: true },
    request_id: uuid,
    lock_id: uuid,
    scope_type: { enum: ["program_run", "solo_aggregate"] },
    program_run_id: nullableUuid,
    sport_category: { type: ["string", "null"], minLength: 1, maxLength: 64 },
    sport_level: { type: ["string", "null"], minLength: 1, maxLength: 64 },
    protocol_version: { const: "56d-transfer-v2-2026-07" },
    snapshot_schema_version: {
      enum: [
        "program-run-evidence-lock-v2-2026-07",
        "solo-sport-evidence-lock-v2-2026-07",
      ],
    },
    source_cutoff: dateTime,
    locked_at: dateTime,
    checksum_algorithm: { const: "sha256" },
    content_checksum: sha256,
    analysis_manifest: evidenceManifestSchema,
    evidence: { oneOf: [programRunEvidencePayload, soloEvidencePayload] },
  },
));
const evidenceReadRequestSchema = schema(
  "evidence-read-request",
  "MahleOS evidence read request v1",
  {
    oneOf: [
      strictObject(["lock_id"], { lock_id: uuid }),
      strictObject(
        ["scope_type", "program_run_id"],
        {
          scope_type: { const: "program_run" },
          program_run_id: uuid,
        },
      ),
      strictObject(
        ["scope_type"],
        {
          scope_type: { const: "solo_aggregate" },
          sport_category: {
            enum: [
              "invasion_team_sport",
              "net_or_target_sport",
              "combat_sport",
              "aesthetic_or_technical_sport",
              "endurance_sport",
              "strength_power_sport",
              "precision_sport",
              "unknown_or_other",
            ],
          },
          sport_level: {
            enum: ["youth", "amateur", "competitive_amateur", "semi_pro", "pro", "college"],
          },
        },
      ),
    ],
  },
);

const generatedAt = "2026-07-21T12:00:00Z";
const runId = "20000000-0000-4000-8000-000000000501";
const lockId = "70000000-0000-4000-8000-000000000501";
const checksum = "a".repeat(64);

const systemHealth = {
  schema_version: "mahleos-system-health-v1.5",
  generated_at: generatedAt,
  reporting_timezone: "UTC",
  status: "GREEN",
  identity_integrity: { users_missing_profile: 0, production_profiles_missing_role: 0 },
  program_integrity: {
    athletes_without_program_instance: 0,
    athletes_with_multiple_active_instances: 0,
    active_team_instances_without_run: 0,
    active_runs_without_start_date: 0,
    activated_teams_without_active_run: 0,
    activated_teams_with_multiple_active_runs: 0,
    active_runs_with_assignment_set_mismatch: 0,
  },
  tracking_integrity_7d: {
    checkins_missing_instance: 0,
    completions_missing_instance: 0,
    assessments_missing_instance: 0,
    questionnaires_missing_instance: 0,
    comprehension_missing_instance: 0,
  },
  operations_24h: {
    failed_events: 0,
    critical_failed_events: 0,
    flow_failures: {
      auth_login: 0,
      auth_signup: 0,
      team_join_attempt: 0,
      daily_checkin_saved: 0,
      journal_saved: 0,
      assessment_saved: 0,
      coach_evidence_load_failed: 0,
      app_runtime_error: 0,
    },
  },
  critical_journey_coverage: {
    auth_login: {
      coverage: "AUTHENTICATED_SUCCESS_ONLY",
      authority: "authenticated_app_event_log",
      successes_24h: 3,
      failures_24h: null,
    },
    auth_signup: {
      coverage: "SERVER_ACCOUNT_CREATION_ONLY",
      authority: "auth.users",
      successes_24h: 2,
      failures_24h: null,
    },
    team_join: {
      coverage: "AUTHENTICATED_APP_EVENTS",
      authority: "authenticated_app_event_log",
      attempts_24h: 2,
      successes_24h: 2,
      failures_24h: 0,
    },
    program_start: {
      coverage: "SERVER_ACTIVATION_SUCCESS_AND_STATE_RECONCILIATION",
      authority: "teams_program_runs_program_instances",
      attempts_24h: null,
      successes_24h: 1,
      failures_24h: null,
      state_reconciliation: "COMPLETE",
    },
    minor_authorization: {
      coverage: "STRUCTURAL_AND_DELIVERY_ONLY",
      authority: "minor_auth_state_machine",
      delivery_failures_24h: 0,
    },
  },
  notifications_7d: { sent: 4, opened: 2, failed: 0, expired_subscriptions: 0 },
  feedback: { open: 0 },
  privacy_level: "aggregate_operational_no_user_content",
  privacy_exclusions: systemPrivacyExclusions,
};
const trackingQuality = {
  schema_version: "mahleos-tracking-quality-v1",
  generated_at: generatedAt,
  reporting_timezone: "UTC",
  status: "GREEN",
  activity: {
    active_instances: 7,
    active_athletes_7d: 6,
    checkins_today: 5,
    checkins_7d: 31,
    completed_days_today: 5,
    completed_days_7d: 31,
    fresh_snapshots_today: 5,
  },
  integrity: {
    duplicate_checkins_56d: 0,
    checkins_missing_instance_7d: 0,
    completions_missing_instance_7d: 0,
    completions_without_checkin_7d: 0,
  },
  save_pipeline_24h: { success: 5, failed: 0 },
  test_data_included: false,
  privacy_level: "aggregate_tracking_counts_only",
  privacy_exclusions: trackingPrivacyExclusions,
};
const feedbackStatus = {
  schema_version: "mahleos-feedback-status-v1",
  generated_at: generatedAt,
  reporting_timezone: "UTC",
  status: "CLEAR",
  counts: { open: 0, reviewed: 2, resolved: 4, new_24h: 0, new_7d: 1 },
  open_by_category: { bug: 0, suggestion: 0, general: 0, other: 0 },
  feedback_text_exported: false,
  user_identifiers_exported: false,
  privacy_level: "backlog_counts_only",
};
const dailyBrief = {
  schema_version: "mahleos-daily-brief-v1",
  generated_at: generatedAt,
  reporting_timezone: "UTC",
  system_health: systemHealth,
  tracking_quality: trackingQuality,
  feedback_status: feedbackStatus,
  claim_boundary: "operational monitoring only; no effectiveness or causal conclusion",
};
const pilotReadiness = {
  schema_version: "mahleos-pilot-readiness-v1",
  generated_at: generatedAt,
  reporting_timezone: "UTC",
  program_run_id: runId,
  run_status: "active",
  started_at: "2026-07-14",
  ended_at: null,
  status: "GREEN",
  current_program_day: 8,
  setup: {
    athletes: 5,
    with_program_instance: 5,
    active_instances: 5,
    run_instance_team_mismatches: 0,
    run_instances_outside_team_roster: 0,
    multiple_run_instances: 0,
    multiple_active_instances: 0,
  },
  evidence_authorization: { eligible: 5, not_eligible: 0, complete: true },
  pre_measurement: { validated_complete: 5, validated_missing: 0 },
  daily_tracking: { day_1_completed: 5, checkins_today: 4, active_7d: 5, inactive_7d: 0 },
  transfer_tracking: { measurements_completed: 10, points_due_per_athlete: 2, measurements_expected: 10 },
  coach_tracking: { weekly_reviews_completed: 1, weekly_reviews_due: 1 },
  data_quality: {
    duplicate_checkins: 0,
    completions_without_checkin: 0,
    run_instance_team_mismatches: 0,
    run_instances_outside_team_roster: 0,
    multiple_run_instances: 0,
    aggregate_visible: true,
    low_confidence: true,
    minimum_aggregate_n: 5,
  },
  test_data_included: false,
  privacy_level: "run_scoped_operational_counts_only",
  privacy_exclusions: pilotPrivacyExclusions,
};
const pilotCatalog = {
  schema_version: "mahleos-pilot-catalog-v1",
  generated_at: generatedAt,
  reporting_timezone: "UTC",
  status: "GREEN",
  total_active_runs: 1,
  returned_runs: 1,
  truncated: false,
  runs: [{
    program_run_id: runId,
    run_status: "active",
    started_at: "2026-07-14",
    current_program_day: 8,
    readiness_status: "GREEN",
    athletes: 5,
    evidence_eligible: 5,
    validated_pre_complete: 5,
    active_7d: 5,
    aggregate_visible: true,
    low_confidence: true,
  }],
  test_data_included: false,
  privacy_level: "opaque_run_references_and_operational_counts_only",
  privacy_exclusions: pilotPrivacyExclusions,
};
const soloReadiness = {
  schema_version: "mahleos-solo-readiness-v1",
  generated_at: generatedAt,
  reporting_timezone: "UTC",
  status: "YELLOW",
  setup: { athletes: 2, active_instances: 2, multiple_active_instances: 0 },
  evidence_authorization: { eligible: 2, not_eligible: 0, complete: true },
  pre_measurement: { validated_complete: 2, validated_missing: 0 },
  daily_tracking: { day_1_completed: 2, checkins_today: 1, active_7d: 2, inactive_7d: 0 },
  transfer_tracking: { measurements_completed: 4, measurements_expected: 4 },
  cohort_breakdown: [],
  suppressed_cohort_count: 1,
  data_quality: {
    duplicate_checkins: 0,
    completions_without_checkin: 0,
    aggregate_visible: false,
    low_confidence: false,
    minimum_aggregate_n: 5,
  },
  test_data_included: false,
  privacy_level: "solo_operational_counts_with_suppressed_cohorts",
  privacy_exclusions: soloPrivacyExclusions,
};
const evidenceStatus = {
  schema_version: "mahleos-evidence-status-v1",
  generated_at: generatedAt,
  reporting_timezone: "UTC",
  status: "GREEN",
  active_locks: 1,
  program_run_locks: 1,
  solo_aggregate_locks: 0,
  checksum_valid: 1,
  checksum_invalid: 0,
  returned_locks: 1,
  truncated: false,
  locks: [{
    lock_id: lockId,
    scope_type: "program_run",
    program_run_id: runId,
    sport_category: null,
    sport_level: null,
    protocol_version: "56d-transfer-v2-2026-07",
    snapshot_schema_version: "program-run-evidence-lock-v2-2026-07",
    source_cutoff: generatedAt,
    locked_at: generatedAt,
    integrity_status: "VALID",
  }],
  test_data_included: false,
  privacy_level: "data_lock_metadata_and_integrity_only",
  privacy_exclusions: evidencePrivacyExclusions,
};
const adminOverview = {
  schema_version: "mahleos-admin-overview-v1",
  generated_at: generatedAt,
  reporting_timezone: "UTC",
  counts: { users: 12, athletes: 9, coaches: 2, admins: 1, teams: 2, active_program_runs: 1, active_program_instances: 9, completed_days_total: 84, checkins_total: 76, assessments_total: 9, comprehension_checks_completed: 42 },
  test_data_included: false,
  privacy_level: "company_counts_only",
  direct_identifiers_included: false,
  private_content_included: false,
};
const adminTeams = {
  schema_version: "mahleos-admin-teams-v1",
  generated_at: generatedAt,
  reporting_timezone: "UTC",
  returned_teams: 1,
  truncated: false,
  teams: [{ team_reference: "aggregate-team-0123456789abcdef", sport_category: "football", program_start_date: "2026-07-14", athletes: 9, active_7d: 8, inactive_7d: 1, checkins_7d: 31, completed_days_7d: 31, pre_n: 9, mid_n: 0, post_n: 0, run_reference: "aggregate-run-fedcba9876543210", run_status: "active", run_started_at: "2026-07-14" }],
  test_data_included: false,
  team_names_included: false,
  direct_identifiers_included: false,
  private_content_included: false,
};
const adminComprehension = {
  schema_version: "mahleos-admin-comprehension-v1",
  generated_at: generatedAt,
  reporting_timezone: "UTC",
  summary: { participants: 9, completed_checks: 42, question_responses: 126, correct_responses: 101, incorrect_responses: 25, accuracy: 0.8016, sufficient_data: true },
  weeks: [{ week_number: 1, participants: 9, completed_checks: 42, question_responses: 126, correct_responses: 101, incorrect_responses: 25, accuracy: 0.8016 }],
  days: [{ day_number: 7, week_number: 1, participants: 9, completed_checks: 9, question_responses: 27, correct_responses: 21, incorrect_responses: 6, accuracy: 0.7778 }],
  questions: [{ day_number: 7, week_number: 1, question_id: "day7-q1", question_version_key: "0123456789abcdef0123456789abcdef", target: "program_understanding", participants: 9, times_shown: 9, correct_responses: 7, incorrect_responses: 2, accuracy: 0.7778, needs_content_review: false }],
  suppressed_groups: { weeks: 0, days: 0, questions: 0 },
  minimum_distinct_participants: 5,
  question_text_included: false,
  selected_options_included: false,
  direct_identifiers_included: false,
  private_content_included: false,
  test_data_included: false,
};
const adminFeedbackMetadata = {
  schema_version: "mahleos-admin-feedback-metadata-v1",
  generated_at: generatedAt,
  reporting_timezone: "UTC",
  counts: { total: 7, open: 1, reviewed: 2, resolved: 4, new_24h: 0, new_7d: 1 },
  open_by_category: { bug: 1, suggestion: 0, general: 0, other: 0 },
  by_platform: { ios: 3, android: 3, web: 1 },
  by_runtime: { native: 6, browser: 1 },
  by_app_version: { "1.2.0": 7 },
  test_data_included: false,
  free_text_included: false,
  admin_notes_included: false,
  direct_identifiers_included: false,
};
const adminPartnerRequests = {
  schema_version: "mahleos-admin-partner-requests-v1",
  generated_at: generatedAt,
  reporting_timezone: "UTC",
  counts: { total: 3, submitted: 1, needs_information: 0, review_ready: 1, call_requested: 0, approved: 1, activated: 0, declined_or_withdrawn: 0, open_older_than_7d: 1 },
  by_organization_type: { local_club: 2, academy: 1 },
  by_rollout_scope: { single_team: 2, pilot: 1 },
  by_desired_start: { asap: 1, next_4_weeks: 2 },
  contact_details_included: false,
  organization_names_included: false,
  notes_or_context_included: false,
  direct_identifiers_included: false,
};
const adminActivityTrends = {
  schema_version: "admin-activity-trends-v1",
  generated_at: generatedAt,
  reporting_timezone: "UTC",
  window_days: 7,
  previous_window: { start_date: "2026-07-08", end_date: "2026-07-14" },
  current_window: { start_date: "2026-07-15", end_date: "2026-07-21" },
  segments: [
    { participation_mode: "all", sample_size: 12, sufficient_data: true, previous_active_athletes: 6, current_active_athletes: 8, active_athlete_delta: 2, active_athlete_change_rate: 0.3333, direction: "up", previous_checkins: 20, current_checkins: 28, previous_completed_days: 18, current_completed_days: 24 },
    { participation_mode: "team", sample_size: 8, sufficient_data: true, previous_active_athletes: 5, current_active_athletes: 4, active_athlete_delta: -1, active_athlete_change_rate: -0.2, direction: "down", previous_checkins: 14, current_checkins: 12, previous_completed_days: 11, current_completed_days: 10 },
    { participation_mode: "solo", sample_size: 4, sufficient_data: false, previous_active_athletes: null, current_active_athletes: null, active_athlete_delta: null, active_athlete_change_rate: null, direction: "insufficient_data", previous_checkins: null, current_checkins: null, previous_completed_days: null, current_completed_days: null },
  ],
  data_quality: { previous_unclassified_events: 1, current_unclassified_events: 2, unclassified_events_in_overall: true },
  privacy: {
    minimum_distinct_athletes_per_segment: 5,
    test_profiles_excluded: true,
    test_program_instances_excluded: true,
    test_teams_excluded: true,
    names_or_emails_included: false,
    direct_identifiers_included: false,
    individual_rows_included: false,
    free_text_included: false,
    observational_not_causal: true,
  },
};

const requestIdFor = (index) => `90000000-0000-4000-8000-${String(500 + index).padStart(12, "0")}`;
const success = (view, data, index) => ({
  ok: true,
  request_id: requestIdFor(index),
  view,
  checksum_algorithm: "sha256",
  response_checksum: checksum,
  data,
});
const evidenceResponse = {
  ok: true,
  request_id: requestIdFor(20),
  lock_id: lockId,
  scope_type: "program_run",
  program_run_id: runId,
  sport_category: null,
  sport_level: null,
  protocol_version: "56d-transfer-v2-2026-07",
  snapshot_schema_version: "program-run-evidence-lock-v2-2026-07",
  source_cutoff: generatedAt,
  locked_at: generatedAt,
  checksum_algorithm: "sha256",
  content_checksum: checksum,
  analysis_manifest: {
    manifest_version: "evidence-analysis-manifest-v2-2026-07",
    source_cutoff: generatedAt,
    scope_type: "program_run",
    program_run_id: runId,
    sport_category: null,
    sport_level: null,
    data_mode: "production_only",
    protocol_version: "56d-transfer-v2-2026-07",
    snapshot_schema_version: "program-run-evidence-lock-v2-2026-07",
    checksum_algorithm: "sha256",
    content_checksum: checksum,
    minimum_aggregate_n: 5,
    low_confidence_below_n: 10,
    included_sections: ["sample", "usage", "measurement", "outcomes", "data_quality"],
  },
  evidence: {
    generated_at: generatedAt,
    schema_version: "program-run-evidence-lock-v2-2026-07",
    scope: "program_run",
    protocol_version: "56d-transfer-v2-2026-07",
    meta: {},
    sample: {},
    usage: {},
    team_pulse: {},
    measurement: {},
    outcomes: {},
    transfer_evidence: {},
    data_quality: {},
    claim_boundary: {},
    privacy: {},
  },
};

const manifest = {
  contract_id: "rewireperform-mahleos-machine-read",
  contract_version: "1.5.0",
  status: "IMPLEMENTED_NOT_PRODUCTION_ACTIVATED",
  reporting_timezone: "UTC",
  authentication: {
    scheme: "Bearer",
    key_format: "64 lowercase or uppercase hexadecimal characters",
    current_secret: "MAHLEOS_REWIRE_API_KEY",
    previous_secret: "MAHLEOS_REWIRE_API_KEY_PREVIOUS",
  },
  operations_endpoint: {
    path: "/functions/v1/mahleos-read",
    method: "POST",
    content_type: "application/json",
    max_request_bytes: 2048,
    rate_limit_per_client_per_minute: 30,
    request_body_fields: ["view", "program_run_id"],
    views: [
      "daily_brief",
      "system_health",
      "tracking_quality",
      "feedback_status",
      "pilot_readiness",
      "pilot_catalog",
      "solo_readiness",
      "evidence_status",
      "admin_overview",
      "admin_teams",
      "admin_comprehension",
      "admin_feedback_metadata",
      "admin_partner_requests",
      "admin_activity_trends",
    ],
  },
  evidence_endpoint: {
    path: "/functions/v1/evidence-read",
    method: "POST",
    content_type: "application/json",
    max_request_bytes: 4096,
    rate_limit_per_client_per_minute: 30,
  },
  retry_policy: {
    retryable_http_statuses: [429, 503],
    non_retryable_http_statuses: [400, 401, 404, 405, 413, 415],
    maximum_attempts: 3,
    redirects_allowed: false,
  },
  checksum_policy: {
    response_checksum: "server-side audit reference; do not recalculate from reserialized JSON",
    evidence_content_checksum: "verified server-side before response",
    transport_integrity: "HTTPS",
  },
  consumer_policy: {
    unknown_schema_versions: "BLOCK",
    unknown_top_level_fields: "BLOCK",
    raw_evidence_persistence: "FORBIDDEN_BEFORE_NORMALIZED_ALLOWLIST_PROJECTION",
    incomplete_source_coverage: "MUST_NOT_REPORT_GREEN",
    external_release: "HUMAN_APPROVAL_REQUIRED",
  },
  privacy_boundaries: {
    minimum_sensitive_aggregate_n: 5,
    low_confidence_below_n: 10,
    test_data_included: false,
    forbidden: [
      "names",
      "emails",
      "user_ids",
      "journal_text",
      "reflection_text",
      "feedback_text",
      "individual_checkins",
      "individual_scores",
      "raw_questionnaire_answers",
    ],
  },
};

const readme = `# RewirePerform -> MahleOS Contract v1

This directory is generated by \`npm run mahleos:contract:build\` and checked by
\`npm run mahleos:contract:check\`. It is the machine-readable handoff for the
read-only MahleOS adapter.

The package contains strict top-level JSON Schemas, synthetic Golden Responses
and the transport manifest. The SQL and Edge implementation remain the runtime
source of truth. Producer tests execute the SQL contract and validate its
responses against these schemas.

## Consumer rules

- Pin this package to a reviewed RewirePerform Git commit.
- Use HTTPS POST only and reject redirects.
- Read the machine key only from the macOS Keychain.
- Reject unknown schema versions and unknown top-level fields.
- Treat response checksums as server audit references; HTTPS protects transport.
- Never persist a raw Evidence payload before projecting it through an explicit
  allowlist and recursive private-content guard.
- Missing website, GitHub, Vercel or support-mail connectors remain
  \`NOT_CONNECTED\`; RewirePerform does not provide those sources.
- No automatic effectiveness, causality, diagnosis or sport-performance claim.

No endpoint, migration, secret or Production connection is activated merely by
the presence of this contract package.
`;

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const files = new Map([
  ["README.md", readme],
  ["manifest.json", json(manifest)],
  ["schemas/system-health.schema.json", json(systemHealthSchema)],
  ["schemas/tracking-quality.schema.json", json(trackingQualitySchema)],
  ["schemas/feedback-status.schema.json", json(feedbackStatusSchema)],
  ["schemas/pilot-readiness.schema.json", json(pilotReadinessSchema)],
  ["schemas/pilot-catalog.schema.json", json(pilotCatalogSchema)],
  ["schemas/solo-readiness.schema.json", json(soloReadinessSchema)],
  ["schemas/evidence-status.schema.json", json(evidenceStatusSchema)],
  ["schemas/admin-overview.schema.json", json(adminOverviewSchema)],
  ["schemas/admin-teams.schema.json", json(adminTeamsSchema)],
  ["schemas/admin-comprehension.schema.json", json(adminComprehensionSchema)],
  ["schemas/admin-feedback-metadata.schema.json", json(adminFeedbackMetadataSchema)],
  ["schemas/admin-partner-requests.schema.json", json(adminPartnerRequestsSchema)],
  ["schemas/admin-activity-trends.schema.json", json(adminActivityTrendsSchema)],
  ["schemas/daily-brief.schema.json", json(dailyBriefSchema)],
  ["schemas/operations-request.schema.json", json(operationsRequestSchema)],
  ["schemas/operations-success.schema.json", json(operationsSuccessSchema)],
  ["schemas/error-response.schema.json", json(errorResponseSchema)],
  ["schemas/evidence-read-request.schema.json", json(evidenceReadRequestSchema)],
  ["schemas/evidence-read-success.schema.json", json(evidenceReadSuccessSchema)],
  ["golden/operations-requests.json", json([
    {},
    { view: "daily_brief" },
    { view: "system_health" },
    { view: "tracking_quality" },
    { view: "feedback_status" },
    { view: "pilot_readiness", program_run_id: runId },
    { view: "pilot_catalog" },
    { view: "solo_readiness" },
    { view: "evidence_status" },
    { view: "admin_overview" },
    { view: "admin_teams" },
    { view: "admin_comprehension" },
    { view: "admin_feedback_metadata" },
    { view: "admin_partner_requests" },
    { view: "admin_activity_trends" },
  ])],
  ["golden/evidence-read-requests.json", json([
    { lock_id: lockId },
    { scope_type: "program_run", program_run_id: runId },
    { scope_type: "solo_aggregate" },
    { scope_type: "solo_aggregate", sport_category: "combat_sport", sport_level: "competitive_amateur" },
  ])],
  ["golden/daily-brief.success.json", json(success("daily_brief", dailyBrief, 1))],
  ["golden/system-health.success.json", json(success("system_health", systemHealth, 2))],
  ["golden/tracking-quality.success.json", json(success("tracking_quality", trackingQuality, 3))],
  ["golden/feedback-status.success.json", json(success("feedback_status", feedbackStatus, 4))],
  ["golden/pilot-readiness.success.json", json(success("pilot_readiness", pilotReadiness, 5))],
  ["golden/pilot-catalog.success.json", json(success("pilot_catalog", pilotCatalog, 6))],
  ["golden/solo-readiness.success.json", json(success("solo_readiness", soloReadiness, 7))],
  ["golden/evidence-status.success.json", json(success("evidence_status", evidenceStatus, 8))],
  ["golden/admin-overview.success.json", json(success("admin_overview", adminOverview, 9))],
  ["golden/admin-teams.success.json", json(success("admin_teams", adminTeams, 10))],
  ["golden/admin-comprehension.success.json", json(success("admin_comprehension", adminComprehension, 11))],
  ["golden/admin-feedback-metadata.success.json", json(success("admin_feedback_metadata", adminFeedbackMetadata, 12))],
  ["golden/admin-partner-requests.success.json", json(success("admin_partner_requests", adminPartnerRequests, 13))],
  ["golden/admin-activity-trends.success.json", json(success("admin_activity_trends", adminActivityTrends, 14))],
  ["golden/evidence-read.success.json", json(evidenceResponse)],
  ["golden/error-responses.json", json([
    { error: "invalid_request", request_id: requestIdFor(31) },
    { error: "invalid_json" },
    { error: "unauthorized" },
    { error: "not_found", request_id: requestIdFor(32) },
    { error: "method_not_allowed" },
    { error: "request_too_large" },
    { error: "unsupported_media_type" },
    { error: "rate_limited", request_id: requestIdFor(33) },
    { error: "service_not_configured" },
    { error: "operations_read_unavailable", request_id: requestIdFor(34) },
    { error: "evidence_read_unavailable", request_id: requestIdFor(35) },
    { error: "checksum_mismatch", request_id: requestIdFor(36) },
  ])],
]);

const listFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const paths = [];
  for (const entry of entries) {
    const target = resolve(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await listFiles(target));
    else paths.push(target);
  }
  return paths;
};

let drift = false;
for (const existing of await listFiles(outputDir)) {
  const name = relative(outputDir, existing);
  if (files.has(name)) continue;
  if (checkOnly) {
    console.error(`Unexpected MahleOS contract artifact: ${name}`);
    drift = true;
  } else {
    await rm(existing);
    console.log(`Removed ${name}`);
  }
}

for (const [name, content] of files) {
  const target = resolve(outputDir, name);
  if (checkOnly) {
    const current = await readFile(target, "utf8").catch(() => "");
    if (current !== content) {
      console.error(`MahleOS contract artifact is out of date: ${name}`);
      drift = true;
    }
  } else {
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
    console.log(`Generated ${name}`);
  }
}

if (drift) process.exit(1);
