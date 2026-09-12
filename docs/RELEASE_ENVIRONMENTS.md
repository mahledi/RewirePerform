# Release environments

Last verified: 6 August 2026.

## Confirmed targets

| Purpose | Supabase project | Project ref | Evidence |
| --- | --- | --- | --- |
| Production | RewirePerform real | `bqsbxesmybthwtxmowfz` | The live Vercel asset served by `rewireperform.com` contains this URL; the Supabase CLI lists the project as healthy and migrations `20260714224000` and `20260715085749` are applied. |
| Staging | RewirePerform Staging | `zbeswjipayspgvcipzmx` | Mahle approved this new, isolated Free-plan project for synthetic testing on 6 August 2026; the Supabase project metadata reports `ACTIVE_HEALTHY` in `eu-central-1`. |
| CI | Synthetic only | `abcdefghijklmnopqrst` | GitHub Actions uses a non-live placeholder target and must never be treated as a deploy artifact. |

`towgvykgezrmkbyudjen` and `twceqincrbrenyuqukpj` are retired targets. They remain in historical reports and migration evidence but must not be used for new builds, tests, Functions, migrations, CI, TestFlight or App Store releases. Deleting a retired project is a separate destructive action and is not implied by this classification.

## Production backend status

- Production contains the repository migrations through `20260714104145_harden_internal_trigger_function_privileges`.
- `delete-account` Version 1 is active with JWT verification enabled and source parity against the repository.
- Mahle completed the destructive athlete-in-team deletion test on 14 July 2026. Auth deletion, failed re-login, zero pending requests and zero account-specific Auth/product residue were verified read-only; see `docs/ACCOUNT_DELETION_PRODUCTION_VERIFICATION_2026-07-14.md`.
- Destructive coach-transfer coverage, aggregate-preservation evidence and final provider-log/backup retention decisions remain open.

## Build rules

- `npm run app:build` is the production/App Store build. It fails unless `VITE_APP_ENV=production` and the confirmed Production URL, project ref and publishable key are loaded.
- `npm run web:build:staging` accepts only the confirmed Staging URL, ref and a runtime-supplied publishable key. It must never use Production, retired refs or committed credentials.
- Any future Staging bundle must not be synced into the Production iOS project. The current Xcode target uses the Production bundle ID `com.rewireperform.app`; a native Staging build requires a separately approved bundle ID and Xcode scheme first.
- Before opening or archiving the current iOS project, rerun `npm run app:build` so its embedded assets are freshly built and validated for Production.
- The repository helpers `npm run app:sync:ios` and `npm run app:open:ios` both force that Production build before syncing or opening Xcode.
- After every iOS sync, `app:verify:embedded` scans the embedded web assets, requires the Production ref and rejects retired refs.
- URL and project ref must always describe the same Supabase project.
- Keys are never committed. Vercel and local mode-specific files remain the value sources.
- A build passing CI is not deployment evidence because CI deliberately compiles against a synthetic target.

## Remaining dashboard check

The live artifact and response headers prove that `rewireperform.com` is served by Vercel and currently targets Production. Vercel dashboard access is still required once to verify that the Production scope carries the confirmed Production values and that Preview/Development neither use a retired project nor silently fall back to Production. Assigning the new Staging target to Vercel remains a separate deployment decision; project creation and database verification did not change any Vercel environment.
