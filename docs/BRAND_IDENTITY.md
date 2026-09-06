# RewirePerform brand identity

Status: **LOCKED** by Mahle on 18 July 2026.

The official logo is the **B2 Normal R** integrated RP/brain symbol. Its source of truth is:

`design/brand/logo-finalization-20260718/final/`

Every agent working on the website, PWA, iOS/App Store, email, social, presentation, print, or merchandise must read that directory's `README.md` and `brand-lock.json` before using the logo. Use the mapped export for the target surface. Do not redraw, regenerate, recolor, distort, crop, or add effects.

Locked colors:

- Rewire green: `#2EAD89`
- Off-white: `#EEF0F2`
- Midnight: `#0D0E12`

Use the full public name `RewirePerform` in text and metadata. Do not shorten the brand to `Rewire`.

This lock governs visual implementation. It does not itself constitute a trademark registration or binding legal clearance.

## Product integration map

- React surfaces use `src/components/brand/BrandLogo.tsx`.
- Dark UI uses `public/brand/rewireperform-symbol-dark.svg`.
- Light surfaces use `public/brand/rewireperform-symbol-light.svg`.
- Auth email templates use `public/brand/rewireperform-email-dark-256.png` on a fixed midnight tile with a text fallback.
- PWA, Apple touch, favicon and App Store assets are generated from the locked master by `npm run brand:generate`.
- iOS launch assets and the social preview are generated from the same master; they are not edited by hand.

Run `npm run brand:verify` after every brand-related change. CI treats any geometry, palette, export or integration drift as a failure.
