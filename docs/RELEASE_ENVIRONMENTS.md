# Release environments

Last verified: 13 July 2026.

## Confirmed targets

| Purpose | Supabase project | Project ref | Evidence |
| --- | --- | --- | --- |
| Production | RewirePerform real | `bqsbxesmybthwtxmowfz` | The live Vercel asset served by `rewireperform.com` contains this URL; the Supabase CLI lists the project as healthy. |
| Staging | RewirePerform | `towgvykgezrmkbyudjen` | The Supabase CLI lists the project as healthy; the NLZ staging verification was executed here. |
| CI | Synthetic only | `abcdefghijklmnopqrst` | GitHub Actions uses a non-live placeholder target and must never be treated as a deploy artifact. |

`twceqincrbrenyuqukpj` is the historical Lovable Cloud target. It remains in migration history but is not an accessible project in the current Supabase organization and must not be used for new CI, TestFlight or App Store builds.

## Build rules

- `npm run app:build` is the production/App Store build. It fails unless `VITE_APP_ENV=production` and the confirmed Production URL, project ref and publishable key are loaded.
- `npm run web:build:staging` is a web-only Staging QA build. It fails unless the equivalent Staging values are loaded through an untracked `.env.staging.local` or the process environment.
- Staging must not be synced into the Production iOS project. The current Xcode target uses the Production bundle ID `com.rewireperform.app`; a native Staging build requires a separately approved bundle ID and Xcode scheme first.
- Before opening or archiving the current iOS project, rerun `npm run app:build` so its embedded assets are freshly built and validated for Production.
- The repository helpers `npm run app:sync:ios` and `npm run app:open:ios` both force that Production build before syncing or opening Xcode.
- After every iOS sync, `app:verify:embedded` scans the embedded web assets, requires the Production ref and rejects Staging or historical refs.
- URL and project ref must always describe the same Supabase project.
- Keys are never committed. Vercel and local mode-specific files remain the value sources.
- A build passing CI is not deployment evidence because CI deliberately compiles against a synthetic target.

## Remaining dashboard check

The live artifact and response headers prove that `rewireperform.com` is served by Vercel and currently targets Production. Vercel dashboard access is still required once to verify that Production, Preview and Development environment scopes carry the intended values and that `VITE_APP_ENV` is `production` for the Production scope.
