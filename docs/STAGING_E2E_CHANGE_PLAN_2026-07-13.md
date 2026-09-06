# Staging Synthetic E2E Change Plan - 2026-07-13

Status: Retired on 14 July 2026. Not approved and no longer executable because the former target was declared obsolete.

## Target

- Former target `towgvykgezrmkbyudjen` is retired and permanently blocked by the script.
- No approved Supabase Staging project currently exists.
- Supabase Production `bqsbxesmybthwtxmowfz` is hard-blocked in the script.
- Vercel, the live app, App Store Connect and Production are outside this plan.

## Temporary writes

The approved run would create a synthetic, isolated cohort:

- one coach, one admin, one outsider and five athlete auth users;
- test-only profiles and roles;
- one test team, one program run and five program instances;
- training assignments for all athletes;
- rest-day and competition assignments for one athlete;
- synthetic check-ins, completion records and comprehension records;
- consent changes on synthetic users only to verify aggregate suppression.

All generated names use a unique `nlzqa-<timestamp>` prefix. Test profiles and the
team are marked as test data. No existing user, team, program run or tracking row is
selected for mutation.

## Verification

The script checks:

- coach, athlete, outsider and admin authorization boundaries;
- blocked direct mutations and athlete access to admin readiness data;
- atomic tracking saves, invalid pulse rollback and retry idempotency;
- separate training, rest-day and competition persistence;
- rejection of unsupported day contexts;
- consent-scoped evidence, minimum group size and aggregate suppression;
- exclusion of private reflection text from coach evidence;
- duplicate, orphan and completion-integrity indicators.

## Cleanup and residual risk

Cleanup runs in `finally` and removes the program data, assignments, memberships,
team and auth users created by the run. The main residual risk is an interrupted
network or backend failure during cleanup. The unique prefix and test markers make
any residual synthetic records identifiable for a manual cleanup audit.
Every cleanup response is checked. Any incomplete deletion produces a non-zero test
result and lists the affected cleanup step instead of reporting false success.

The service-role key is supplied only at runtime. It is never committed or printed.

## Technical gates

Planning is local and network-free:

```sh
npm run test:staging:plan
```

Execution requires all of the following at the same time:

1. Explicit user approval of this exact plan in the current task.
2. The `--execute` CLI mode used by `npm run test:staging:execute`.
3. Staging URL and Staging-only credentials supplied at runtime.
4. Exact environment token:
   `NLZ_QA_WRITE_APPROVAL=STAGING_SYNTHETIC_WRITE_APPROVED`.

No execution is allowed under this retired plan. A new target and a new explicit plan are required first.
