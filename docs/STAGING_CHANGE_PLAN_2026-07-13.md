# Staging change plan - backend function repairs

Status: prepared locally, dry-run verified, not applied.

## Target and boundary

- Target after explicit approval: Supabase Staging `towgvykgezrmkbyudjen` (`RewirePerform`).
- Production `bqsbxesmybthwtxmowfz`, Vercel, the live website and real user data are out of scope.
- Only migration `20260713140500_app_store_backend_function_repairs.sql` is pending on Staging.
- The Supabase dry-run confirms that no other migration would be applied.

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
- `supabase db push --linked --dry-run` lists only the repair migration.
- Static regression tests assert both corrections and explicit function privileges.
- A source-fidelity test proves that the 499-line evidence dossier body is unchanged
  after positional parameters are normalized back to the original names.

## Apply gate

The migration may be applied only after Mahle explicitly approves this exact Staging change plan. The apply command must target the already verified Staging link and must not use `--include-all`.

## Verification after approval

1. Run `supabase migration list --linked` and confirm only the repair is pending.
2. Apply the single migration to Staging.
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
