# RewirePerform social share images v2

Status: **APPROVED — 21 August 2026**

These three RGB PNG files are the canonical source for the public Open Graph
preview and the protected athlete/coach invitation previews:

- `og-image.png`: public website preview
- `og-team-invite.png`: athlete team invitation preview
- `og-coach-invite.png`: coach invitation preview

All files are 1200 x 630 pixels, use the locked B2 Normal R logo without
effects or geometry changes, and stay below 300 KB for reliable messenger
fetching. `scripts/generate-brand-assets.py` copies these approved source files
byte-for-byte into `public/`; it must not redraw them.
