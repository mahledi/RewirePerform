const RETIRED_PROJECT_REF = "towgvykgezrmkbyudjen";
const PRODUCTION_PROJECT_REF = "bqsbxesmybthwtxmowfz";
const args = new Set(process.argv.slice(2));
const planOnly = args.has("--plan");
const execute = args.has("--execute");

if (planOnly === execute || args.size !== 1) {
  throw new Error(
    "Choose exactly one mode: --plan (no network access) or --execute (disabled without approved Staging)",
  );
}

if (planOnly) {
  console.log("TARGET: no approved Supabase Staging project");
  console.log(`RETIRED PROJECT: ${RETIRED_PROJECT_REF} (execution blocked)`);
  console.log("NETWORK: disabled; no Supabase client is initialized");
  console.log("SCOPE: synthetic athlete, coach, admin and outsider scenarios");
  console.log("DAY CONTEXTS: training, rest and competition");
  console.log("CHECKS: auth, RLS, retries, privacy, consent and aggregate boundaries");
  console.log("EXECUTION GATE: new approved target and a new explicit change plan required");
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
  "Remote staging E2E execution is disabled because no approved Staging project exists",
);
