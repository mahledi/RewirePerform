# Staging change plan - backend function repairs

Status: **retired on 14 July 2026; never execute this plan.** Mahle confirmed that its target is an old project. The original repair was not applied.

## Target and boundary

- Former target: `towgvykgezrmkbyudjen` (`RewirePerform`). It is retired and must not receive migrations, Functions, tests or new data.
- Production `bqsbxesmybthwtxmowfz`, Vercel, the live website and real user data are out of scope.
- A final read-only dry-run before retirement listed two pending migrations: `20260713140500_app_store_backend_function_repairs.sql` and `20260714084351_account_deletion_self_service.sql`. This is historical evidence only.

## Exact changes

1. `get_team_stats(uuid)`
   - Replace the invalid `date >= text` comparison with a date-to-date comparison.
   - Keep the existing team-owner authorization check.
   - Revoke invocation from `PUBLIC` and `anon`; grant it explicitly to `authenticated`.
2. `get_admin_nlz_evidence_dossier(boolean, uuid)`
   - Replace ambiguous references to the PL/pgSQL parameters with positional references.
   - Keep the existing admin-role check, consent filter, minimum aggregate boundary and privacy exclusions unchanged.
   - Reassert authenticated-only execution.

No tables, columns, rows, RLS policies, consent values, accounts, journal entries, check-ins or program assignments are modified.

## Expected user impact

- No visual or navigation change.
- Existing successful flows remain unchanged.
- Team statistics and the admin evidence dossier should stop failing at SQL execution time.
- Anonymous callers remain unable to execute either function.

## Risks

- The evidence function is large. A compilation issue would keep the admin evidence view unavailable, but would not alter user data.
- Tightening `get_team_stats` execution could expose an undocumented anonymous dependency. The application currently treats this as an authenticated coach function, so such a dependency would be a defect rather than supported behavior.
- Staging schema drift could surface a function-signature or dependency conflict during real PostgreSQL execution. The migration is transactional, so an error should roll back the complete migration.

## Pre-apply evidence

- Both Production and Staging `plpgsql_check` report the same two errors.
- Staging migration history matches local history through `20260710130000`.
- The original dry-run listed only the repair migration. That evidence is stale; the 14 July dry-run lists the repair and account-deletion migrations.
- Static regression tests assert both corrections and explicit function privileges.
- A source-fidelity test proves that the 499-line evidence dossier body is unchanged
  after positional parameters are normalized back to the original names.

## Apply gate

No migration may be applied under this retired plan. A new plan requires a newly approved non-Production target, the coordinated migration and Function scope, destructive synthetic-account tests, and Mahle's separate approval.

## Verification after approval

1. Replace this superseded plan and rerun `supabase migration list --linked` plus `supabase db push --linked --dry-run`.
2. Apply only the migration set named in the newly approved plan.
3. Run `supabase db lint --linked --schema public --level warning --fail-on error` and require zero errors.
4. Execute authenticated coach/admin permission checks with synthetic accounts.
5. Execute the NLZ staging E2E suite and require complete cleanup.
6. Regenerate Supabase TypeScript types from Staging and inspect the diff.
7. Produce a second review report before any Production proposal.

## Rollback

- The migration is wrapped in one transaction; execution errors roll back automatically.
- It changes function definitions only and performs no data migration.
- If a post-deploy behavioral regression is found, restore the two previous definitions from their source migrations with `CREATE OR REPLACE FUNCTION`. This intentionally restores the old failing behavior while preserving all data.
- Do not run a rollback or any Production command without a separate approval and a captured schema diff.
