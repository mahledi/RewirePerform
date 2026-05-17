# Codex Status

## Repository
- Remote: https://github.com/mahledi/RewirePerform.git
- Base branch: main
- Active branch: codex/critical-flow-fixes

## Current Goal
Stabilize the core RewirePerform system so GitHub/Lovable can receive high-quality changes without spending Lovable credits on implementation work.

## First Fix Branch: critical-flow-fixes
Priority fixes:
1. Calendar setup must not start a 56-day program from only 7 manually selected days unless the missing days are intentionally auto-filled.
2. Check-in persistence must not write completion/progress if the check-in save fails.
3. Admin/client role handling must not trust localStorage for privileged access.
4. Dashboard program-date logic must avoid races between real today and QA/effective today.
5. Co-coach UI access and Edge Function authorization must agree.
6. `.env` should not remain part of future Git commits; use `.env.example` for documentation.

## Later Branches
- codex/system-ux-optimization: daily ritual clarity, missed-day re-entry, coach rituals, identity progression.
- codex/content-program-optimization: if-then behavior anchors, week identity, content consistency.
- codex/measurement-study-layer: evidence exports, study readiness, data quality.
- codex/local-ai-layer: controlled local/hybrid AI layer over the deterministic 56-day system.

## Validation Notes
- `npm install` completed.
- `npm run build` passes.
- `npm test` passes.
- `npm run lint` currently fails on pre-existing broad lint debt (`any`, hook dependencies, generated UI constraints). Treat as a separate cleanup branch unless a fix touches a listed critical path.
- `gh` CLI is not installed; use `git push` directly unless GitHub CLI becomes available.
