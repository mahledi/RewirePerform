#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = new Set(process.argv.slice(2));
const exampleOnly = args.has("--example-only");
const strictEdge = args.has("--strict-edge");

const root = process.cwd();
const envExamplePath = resolve(root, ".env.example");
const envPath = resolve(root, ".env");

const requiredClient = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PROJECT_ID",
];

const requiredEdge = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const optionalEdge = [
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
];

const optionalClient = [
  "VITE_SENTRY_DSN",
  "VITE_APP_ENV",
  "VITE_RELEASE_SHA",
];

const allowedAppEnvironments = new Set([
  "development",
  "staging",
  "production",
  "ci",
  "test",
]);

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const parsed = {};
  const lines = readFileSync(path, "utf8").split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }

  return parsed;
}

function mergeEnv(fileEnv) {
  return { ...fileEnv, ...process.env };
}

function fail(message) {
  console.error(`env validation failed: ${message}`);
  process.exitCode = 1;
}

const example = parseEnvFile(envExamplePath);
const local = exampleOnly ? example : mergeEnv(parseEnvFile(envPath));

if (!existsSync(envExamplePath)) {
  fail(".env.example is missing");
}

for (const key of requiredClient) {
  if (!(key in example)) fail(`.env.example must contain ${key}`);
}

if (!exampleOnly) {
  for (const key of requiredClient) {
    if (!local[key]) fail(`missing ${key} in .env or process environment`);
  }

  if (local.VITE_SUPABASE_URL && !/^https:\/\/.+\.supabase\.co$/.test(local.VITE_SUPABASE_URL)) {
    fail("VITE_SUPABASE_URL should look like https://<project-ref>.supabase.co");
  }

  if (local.VITE_SUPABASE_PROJECT_ID && !/^[a-z0-9]{20}$/.test(local.VITE_SUPABASE_PROJECT_ID)) {
    fail("VITE_SUPABASE_PROJECT_ID should be the 20-character Supabase project ref");
  }

  if (local.VITE_SUPABASE_URL && local.VITE_SUPABASE_PROJECT_ID) {
    const expectedUrl = `https://${local.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
    if (local.VITE_SUPABASE_URL !== expectedUrl) {
      fail("VITE_SUPABASE_URL must match VITE_SUPABASE_PROJECT_ID");
    }
  }

  if (
    local.VITE_APP_ENV &&
    !allowedAppEnvironments.has(local.VITE_APP_ENV)
  ) {
    fail("VITE_APP_ENV must be development, staging, production, ci or test");
  }
}

if (strictEdge) {
  for (const key of requiredEdge) {
    if (!local[key]) fail(`missing edge secret ${key}`);
  }
}

const documented = new Set(Object.keys(example));
for (const key of [...requiredEdge, ...optionalEdge]) {
  if (!documented.has(key)) fail(`.env.example should document ${key}`);
}

for (const key of optionalClient) {
  if (!documented.has(key)) fail(`.env.example should document ${key}`);
}

if (!process.exitCode) {
  const target = exampleOnly ? ".env.example" : ".env/process environment";
  console.log(`env validation passed for ${target}`);
}
