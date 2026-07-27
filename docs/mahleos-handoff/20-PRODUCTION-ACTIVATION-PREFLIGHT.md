# MahleOS Production Activation Preflight

Date: 2026-07-21

Status: `LOCAL_IMPLEMENTED_NOT_PRODUCTION_ACTIVATED`

This runbook separates reviewed producer code from a real Production release.
It is not an approval to modify Production, deploy an Edge Function, create a
secret, or enable the MahleOS consumer.

## Read-only Production observation

The Production audit performed on 2026-07-21 found:

- the project was healthy and reachable;
- nine active Production program instances belonged to nine distinct athletes;
- no athlete had multiple active Production instances;
- migration `20260721142328_preserve_legacy_team_instances_on_run_assignment`
  was already registered remotely;
- the repository did not yet contain that remote migration before this branch;
- the Operations migrations `20260721082355` and `20260721153000` were not
  registered remotely;
- neither `mahleos-read` nor `evidence-read` was deployed under its final
  machine-read contract.

No row, function, migration history entry, secret, or Edge deployment was
changed during this observation.

## Repository reconciliation

The file
`20260721142328_preserve_legacy_team_instances_on_run_assignment.sql` now
reconstructs the source used for the previously applied migration. Its function
body, volatility, security mode, comment and role grants were checked against
Production. A regression test and the executable PostgreSQL harness verify that
a matching active legacy cycle:

- keeps the same program-instance ID;
- receives the run reference in place;
- remains active;
- does not lose its existing tracking history;
- cannot be assigned by an unauthorised signed-in caller.

The forward-only migration
`20260721181524_harden_mahleos_readiness_statuses.sql` does not rewrite the
already applied migration. It fixes the privileged function search paths and
prevents incomplete operational coverage from being reported as `GREEN`.

## Required human-gated release order

1. Review and merge the producer branch after the complete repository gate is
   green.
2. Confirm that remote migration `20260721142328` matches the committed file.
   Do not execute it again.
3. Apply `20260721082355_add_mahleos_operational_read_contract.sql`.
4. Apply `20260721153000_extend_mahleos_operational_read_contract.sql`.
5. Apply `20260721181524_harden_mahleos_readiness_statuses.sql`.
6. Apply `20260723154047_mahleos_feedback_read_contract_v1.sql`.
7. Apply `20260723165153_harden_mahleos_feedback_and_telemetry_v1.sql`.
8. Apply `20260723172818_harden_mahleos_operational_telemetry_authority_v1.sql`.
9. Recheck function owners, grants, fixed `search_path`, append-only audit
   triggers, RLS and both Supabase advisor classes.
10. Create separate 256-bit machine keys outside the repository and store them
    only as Supabase Edge secrets and in the MahleOS macOS Keychain.
11. Deploy `mahleos-read`, `evidence-read` and `mahleos-feedback-read` from the
    reviewed commit.
12. Run the complete negative matrix: no key, wrong key, malformed key, expired
   rotation key, wrong method, wrong media type, oversized body, unknown field,
   unknown view, missing or malformed run ID, unknown run and rate limit. After
   successful machine authentication, malformed feedback reads must create only
   a generic payload-free audit row and must share the same 30/minute window as
   valid reads.
13. Run positive synthetic reads for every Operations view, one synthetic,
    locked Evidence payload and one marked synthetic feedback row. No real
    athlete payload is needed for activation.
14. Verify the existing daily 30-day app-event cleanup in Production. Schedule
    the service-only 90-day feedback-access-log cleanup only after a separate
    retention approval. Do not schedule deletion of resolved feedback until its
    retention period is explicitly approved.
15. Pin MahleOS to the reviewed producer commit and both manifest checksums.
16. Enable one synthetic MahleOS read. Human review remains required before any
    daily automation or external report is enabled.

## No-false-green acceptance rules

`tracking_quality` cannot be `GREEN` when there are no active Production
instances, when an active athlete has no activity in the last seven days, or
when an active instance has no current progress snapshot.

`pilot_readiness` cannot be `GREEN` when Day 1 is incomplete, an athlete is
inactive for seven days, a due transfer point is missing, or a due coach week
is missing. Future transfer points do not count early. Multiple reviews for the
same week count as one completed week.

## Advisor baseline

The read-only Production advisor snapshot contained existing informational and
warning findings. Relevant examples include the intentional authenticated
`SECURITY DEFINER` manager RPC, the `pg_net` extension in `public`, and disabled
leaked-password protection. The manager RPC retains its internal role/team
authorization and receives a fixed `pg_catalog` search path in this branch.

These existing advisor findings are not silently declared resolved by local
tests. They must be triaged again after the approved migration release. The
current branch introduces no new publicly callable MahleOS helper: all internal
read helpers remain revoked from `PUBLIC`, `anon`, `authenticated`, and
`service_role`; only the narrow audited feedback-read and invalid-request-audit
wrappers are granted to `service_role`.

## Dependency audit boundary

`npm audit --omit=dev` reported zero known Production dependency
vulnerabilities. The full development audit reports two high findings
(`vite`, transitive `fast-uri`) and one moderate transitive `esbuild` finding.
They concern development tooling and are not shipped in the built application,
but they remain real technical debt. The available automated Vite fix requires
a major upgrade and therefore belongs in a separate toolchain change with its
own browser, PWA and native regression gate. A public or network-exposed Vite
development server is not an acceptable workaround.

## Stop conditions

Stop the release immediately if migration history differs, a helper becomes
callable outside its intended role, a forbidden field appears in a response,
an invalid request is not audited, a synthetic response fails its strict JSON
Schema, or any incomplete source can still produce a green status.

The bounded feedback `app_version` is client-reported and non-authoritative. It
may be used to group technical reports by release, but it must not affect
Evidence, psychological interpretation, or impact claims.
