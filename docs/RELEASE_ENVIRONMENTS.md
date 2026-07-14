# Release environments

Last verified: 14 July 2026.

## Confirmed targets

| Purpose | Supabase project | Project ref | Evidence |
| --- | --- | --- | --- |
| Production | RewirePerform real | `bqsbxesmybthwtxmowfz` | The live Vercel asset served by `rewireperform.com` contains this URL; the Supabase CLI lists the project as healthy. |
| Staging | None approved | - | Mahle confirmed that the former target `towgvykgezrmkbyudjen` is an old project and must no longer be used. |
| CI | Synthetic only | `abcdefghijklmnopqrst` | GitHub Actions uses a non-live placeholder target and must never be treated as a deploy artifact. |

`towgvykgezrmkbyudjen` and `twceqincrbrenyuqukpj` are retired targets. They remain in historical reports and migration evidence but must not be used for new builds, tests, Functions, migrations, CI, TestFlight or App Store releases. Deleting a retired project is a separate destructive action and is not implied by this classification.

## Build rules

- `npm run app:build` is the production/App Store build. It fails unless `VITE_APP_ENV=production` and the confirmed Production URL, project ref and publishable key are loaded.
- `npm run web:build:staging` intentionally fails while no approved Staging project exists. Re-enabling it requires a new target decision, isolated credentials and updated safeguards.
- Any future Staging bundle must not be synced into the Production iOS project. The current Xcode target uses the Production bundle ID `com.rewireperform.app`; a native Staging build requires a separately approved bundle ID and Xcode scheme first.
- Before opening or archiving the current iOS project, rerun `npm run app:build` so its embedded assets are freshly built and validated for Production.
- The repository helpers `npm run app:sync:ios` and `npm run app:open:ios` both force that Production build before syncing or opening Xcode.
- After every iOS sync, `app:verify:embedded` scans the embedded web assets, requires the Production ref and rejects retired refs.
- URL and project ref must always describe the same Supabase project.
- Keys are never committed. Vercel and local mode-specific files remain the value sources.
- A build passing CI is not deployment evidence because CI deliberately compiles against a synthetic target.

## Remaining dashboard check

The live artifact and response headers prove that `rewireperform.com` is served by Vercel and currently targets Production. Vercel dashboard access is still required once to verify that the Production scope carries the confirmed Production values and that Preview/Development neither use a retired project nor silently fall back to Production while no approved Staging target exists.
