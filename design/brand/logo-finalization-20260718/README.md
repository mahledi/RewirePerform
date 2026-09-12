# RewirePerform logo finalization

Status: **selection completed**. B2 Normal R was locked by Mahle on 18 July 2026. These raster concepts remain design references; production assets are in `final/`.

## Locked identity

- Integrated brain and `RP` monogram.
- Left half off-white `#EEF0F2`.
- Right half Rewire green `#2EAD89`.
- Midnight background `#0D0E12`.
- Compact, near-square silhouette for app icons and merchandise.
- No medical, generic AI, chain, infinity, or circuit-board styling.

## Candidates

| Candidate | Intent | Current assessment |
| --- | --- | --- |
| Baseline | User-approved two-tone reference | Strongest continuity and character; central curved fissure remains the main refinement question. |
| A Reduced | Maximum small-size clarity | Cleanest and simplest; brain meaning is less distinctive. |
| B Brain | Strongest explicit brain reading | Brain is immediate; highest risk of reading as tree or lungs. |
| B2 Normal R | B brain structure with corrected R geometry | **Selected and locked.** The R bowl is level, conventional, and clearer at small sizes. |
| C Balanced | Balance of brain, RP, and small-size clarity | Recommended direction for vector reconstruction. |

The original selection comparison is in `qa/candidate-small-size-comparison-horizontal.png`.
The focused B versus B2 comparison is in `qa/variant-b-r-correction-comparison.png`.

## Palette verification

The image generator did not reproduce the requested green exactly. The generated B2
preview has a median green near `#19A27B` and contains zero exact `#2EAD89` pixels.
`concepts/variant-b2-normal-r-brand-palette-preview.png` is a deterministic preview
normalized to the repository palette and contains solid `#2EAD89`, `#EEF0F2`, and
`#0D0E12` interiors. The side-by-side check is in
`qa/variant-b2-brand-green-comparison.png`.

## Locked implementation

Mahle selected B2 Normal R. The implementation package now:

1. reconstructs the selected geometry as a flat SVG master;
2. preserves the corrected R, counters, brain folds, fissure, and optical balance deterministically;
3. produces two-tone, one-color, reversed, App Store, PWA, web, email, and merchandise variants;
4. validates small and large raster outputs; and
5. replaces app and iOS icon assets locally through `scripts/generate-brand-assets.py`.

No push, merge, deploy, App Store upload, email send, publication, or trademark registration is included.
