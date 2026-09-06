const RETIRED_PROJECT_REF = "towgvykgezrmkbyudjen";
const PRODUCTION_PROJECT_REF = "bqsbxesmybthwtxmowfz";
const APPROVED_STAGING_PROJECT_REF = "zbeswjipayspgvcipzmx";
const args = new Set(process.argv.slice(2));
const planOnly = args.has("--plan");
const execute = args.has("--execute");

if (planOnly === execute || args.size !== 1) {
  throw new Error(
    "Choose exactly one mode: --plan (no network access) or --execute (separately gated)",
  );
}

if (planOnly) {
  console.log(
    `TARGET: approved Supabase Staging project ${APPROVED_STAGING_PROJECT_REF}`,
  );
  console.log(`RETIRED PROJECT: ${RETIRED_PROJECT_REF} (execution blocked)`);
  console.log("NETWORK: disabled; no Supabase client is initialized");
  console.log("SCOPE: synthetic athlete, coach, admin and outsider scenarios");
  console.log("DAY CONTEXTS: training, rest and competition");
  console.log("CHECKS: auth, RLS, retries, privacy, consent and aggregate boundaries");
  console.log(
    "EXECUTION GATE: NLZ remote writes require their own explicit approval and harness review",
  );
  console.log("PRODUCTION: permanently blocked");
  process.exit(0);
}

const requestedUrl = process.env.NLZ_QA_SUPABASE_URL ?? "";
if (requestedUrl.includes(PRODUCTION_PROJECT_REF)) {
  throw new Error("Production is permanently blocked for synthetic staging E2E writes");
}
if (requestedUrl.includes(RETIRED_PROJECT_REF)) {
  throw new Error(`Retired Supabase project ${RETIRED_PROJECT_REF} is permanently blocked`);
}

throw new Error(
  "Remote NLZ staging E2E execution remains disabled outside the Feedback Intelligence approval",
);
