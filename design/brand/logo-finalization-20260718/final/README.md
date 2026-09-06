# RewirePerform locked logo kit

Status: **LOCKED — version 1.0.0 — 18 July 2026**

The official RewirePerform mark is **B2 Normal R**: an integrated `RP` monogram and split brain, with a conventional level R bowl. The geometry and palette in this package are the source of truth. Do not redraw or regenerate the mark.

## Source of truth

- Vector master: `master/rewireperform-symbol-v1.svg`
- Machine-readable decision: `brand-lock.json`
- Generated asset checksums: `manifest.json`
- Human/agent handoff: `AGENT_HANDOFF.md`

## Locked palette

| Role | Value |
| --- | --- |
| Rewire green | `#2EAD89` |
| Off-white | `#EEF0F2` |
| Midnight | `#0D0E12` |

## Usage map

| Surface | Asset |
| --- | --- |
| Apple App Store / iOS | `exports/app-store/rewireperform-app-icon-1024.png` |
| PWA / Android | `exports/pwa/rewireperform-app-icon-192.png` and `rewireperform-app-icon-512.png` |
| Website favicon | `exports/web/rewireperform-favicon-32.png` or `rewireperform-favicon-64.png` |
| Website on dark background | `master/rewireperform-symbol-v1.svg` |
| Website on light background | `master/rewireperform-symbol-light-background-v1.svg` |
| Email on light background | `exports/email/rewireperform-email-light-background-256.png` |
| Email on dark background | `exports/email/rewireperform-email-dark-background-256.png` |
| One-color print / merchandise | the appropriate one-color SVG in `master/` |

App Store source files remain square and have no pre-rounded corners. Apple applies the platform mask. The 1024 px App Store PNG must remain RGB with no alpha channel.

## Clear space and minimum size

- Keep clear space around the symbol of at least 10% of its visible height.
- Recommended digital minimum: 32 px. The symbol was also checked at 29 px.
- Do not place the two-tone dark-background version on a light background because its off-white half loses contrast; use the light-background SVG instead.

## Never do this

- Do not regenerate the logo with an image model.
- Do not edit the R bowl, brain folds, central fissure, spacing, proportions, or color split.
- Do not stretch, rotate, crop into the symbol, add text inside it, or add gradients, glow, shadows, outlines, bevels, or 3D effects.
- Do not shorten the public brand name to `Rewire`; use `RewirePerform` in accompanying text and metadata.

Run `python3 scripts/generate-brand-assets.py` from the repository root to reproduce the variants, PNG exports, app assets, iOS asset, preview sheet, manifest, and ZIP handoff package.
