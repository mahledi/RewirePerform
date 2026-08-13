#!/usr/bin/env node
import { loadEnv } from "vite";

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

const expected = readArg("--expected");
const mode = readArg("--mode", expected);
const targets = {
  staging: "zbeswjipayspgvcipzmx",
  production: "bqsbxesmybthwtxmowfz",
};
const retiredStagingRef = "towgvykgezrmkbyudjen";

if (!expected || !(expected in targets)) {
  console.error("release target validation failed: use --expected staging or production");
  process.exit(1);
}

const fileEnv = loadEnv(mode, process.cwd(), "");
const env = { ...fileEnv, ...process.env };
const expectedRef = targets[expected];
const expectedUrl = `https://${expectedRef}.supabase.co`;
const failures = [];
const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
const usesCurrentPublishableKey =
  publishableKey.startsWith("sb_publishable_") && publishableKey.length >= 40;
const jwtParts = publishableKey.split(".");
const usesLegacyAnonJwt =
  publishableKey.startsWith("eyJ") &&
  jwtParts.length === 3 &&
  jwtParts.every((part) => part.length > 10);

if (env.VITE_APP_ENV !== expected) {
  failures.push(`VITE_APP_ENV must be ${expected}`);
}
if (env.VITE_SUPABASE_PROJECT_ID !== expectedRef) {
  failures.push(`VITE_SUPABASE_PROJECT_ID must select the confirmed ${expected} project`);
}
if (env.VITE_SUPABASE_URL !== expectedUrl) {
  failures.push(`VITE_SUPABASE_URL must select the confirmed ${expected} project`);
}
if (
  expected === "production"
  && env.VITE_FEEDBACK_INTELLIGENCE_V1_ENABLED !== "true"
) {
  failures.push("VITE_FEEDBACK_INTELLIGENCE_V1_ENABLED must be true for the V1.1 production client");
}
if (env.VITE_SUPABASE_URL === `https://${retiredStagingRef}.supabase.co`) {
  failures.push(`retired Staging project ${retiredStagingRef} is permanently blocked`);
}
if (
  publishableKey.includes("placeholder") ||
  (!usesCurrentPublishableKey && !usesLegacyAnonJwt)
) {
  failures.push(
    "VITE_SUPABASE_PUBLISHABLE_KEY must use a valid Supabase publishable or legacy anon-key format",
  );
}

if (failures.length > 0) {
  console.error("release target validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`release target validation passed: ${expected} (${expectedRef})`);
