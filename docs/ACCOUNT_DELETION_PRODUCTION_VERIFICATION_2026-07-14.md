# Account Deletion Production Verification

Date: 14 July 2026

Status: **PASS for the athlete-in-team Production path.** Mahle performed the destructive action in the live app. The agent only performed read-only verification afterward. No real-user account was used.

## Environment

- App: `https://rewireperform.com`
- Supabase Production: `bqsbxesmybthwtxmowfz` (`RewirePerform real`)
- Edge Function: `delete-account`, Version 1, JWT verification enabled
- Test target: one account designated by Mahle as a test account; identifiers are intentionally omitted from this repository evidence

## Verified timeline

All times are CEST on 14 July 2026.

- `21:40:43`: password login succeeded for reauthentication.
- `21:40:52`: first authenticated `delete-account` invocation returned HTTP `200`; based on request order, this was the inspection call.
- `21:41:15`: final password reauthentication succeeded.
- `21:41:16`: second `delete-account` invocation returned HTTP `200`; Supabase Auth recorded `user_deleted` with HTTP `200` and global logout with HTTP `204` in the same second.
- `21:41:27` and `21:41:29`: subsequent password login attempts failed with HTTP `400` and `invalid_credentials`.

## Database verification

The decisive check used the deleted account ID only inside a read-only Production query and returned:

- remaining Auth users: `7`
- remaining profiles: `7`
- pending deletion requests: `0`
- deleted-account rows across Auth persistence tables: `0`
- deleted-account rows across all personal source tables covered by the deletion contract: `0`
- retained rows still referencing the deleted account as creator/operator: `0`
- deletion trigger enabled: `true`

The last verified baseline before the test and the post-test snapshot also showed the expected directional changes:

| Table | Before | After |
| --- | ---: | ---: |
| `auth.users` | 8 | 7 |
| `profiles` | 8 | 7 |
| `team_members` | 7 | 6 |
| `program_instances` | 9 | 8 |
| `daily_checkins` | 14 | 13 |
| `daily_journals` | 4 | 4 |
| `questionnaire_responses` | 14 | 12 |
| `teams` | 2 | 2 |

The baseline was not captured in the same second as deletion, so these aggregate deltas are supporting evidence. The account-specific zero-residue query is the authoritative deletion check.

No PostgreSQL error was present around the deletion window. The Edge Function invocation log contains status and timing metadata but no request body or account identifier.

## Provider-log boundary

Supabase Auth's provider-managed server log retains the security event for the account deletion and includes the deleted account's user ID and email. This is not an active Auth account, app row, tracking row or study record, and it must never be used for product analysis. It remains personal data under provider-controlled security-log retention.

Supabase documents that log retention depends on the pricing plan. The current Free-plan comparison lists one hour for Auth Audit Logs and one day for API/database log retention. The exact retention classification of the Auth server event and its legal disclosure remain part of the Privacy review:

- https://supabase.com/docs/guides/telemetry/logs
- https://supabase.com/pricing

## Boundaries still open

- A destructive live coach test with ownership transfer to an eligible co-coach was not performed.
- Athlete-without-team, multiple-team coach, no-successor, network interruption and repeated-submit paths remain automated-test evidence rather than destructive Production evidence.
- Production currently has no aggregate or evidence snapshot rows, so preservation of already de-identified aggregate snapshots was not exercised by this test.
- Backup deletion deadline, Sentry retention, provider-log disclosure, final Privacy/legal review and minors consent remain separate release gates.
