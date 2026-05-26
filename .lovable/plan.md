# Fragebogen Mobile UX – kompaktes Layout

## Problem
Auf dem Handy muss man im Fragebogen oft scrollen, um den Weiter-Button unten zu erreichen, und der Pause-Button oben verschwindet. Vor allem bei Single-/Multi-Choice-Fragen mit vielen Antwortoptionen. 1–10-Skalen passen meist schon.

## Ursache
- `QuestionnaireFlow.tsx`: Content-Bereich nutzt `py-12 px-6` und `items-center` → großer Leerraum oben/unten, Sticky-Header und Sticky-Footer fressen zusätzlich Höhe.
- `QuestionCard.tsx`: große Margins (`mb-8`, `mt-8`, `mt-6`), Optionen mit `p-4` + `space-y-3`, Headline `text-2xl md:text-3xl` mit `mb-3` + Subtext `mb-8`.
- Top-Bar nutzt `py-4` + interne `mb-3` → doppelt hoch.
- Bottom-Nav `py-4` mit Buttons `py-3` → ca. 76 px Höhe.

## Lösung (nur Mobile, Desktop bleibt großzügig)

### `QuestionnaireFlow.tsx`
- Top-Bar: `py-4` → `py-2.5 md:py-4`, internes `mb-3` → `mb-2 md:mb-3`.
- Content-Wrapper: `px-6 py-12` → `px-5 py-5 md:py-12`, `items-center` → `items-start md:items-center` (verhindert künstliche Zentrierung, die Inhalte nach unten drückt).
- Bottom-Nav: `py-4` → `py-2.5 md:py-4`, Buttons `py-3` → `py-2.5 md:py-3`.
- Pause-Button-Label auf Mobile kürzer: nur „Pause" sichtbar, der Zusatz „& später fortsetzen" hidden md:inline (mehr Platz für SaveIndicator, kein Umbruch).

### `QuestionCard.tsx`
- Headline: `text-2xl md:text-3xl mb-3` → `text-xl md:text-3xl mb-2 md:mb-3`, `leading-tight` bleibt.
- Subtext: `mb-8` → `mb-4 md:mb-8`, Textgröße `text-sm md:text-base`.
- Depth-Badge: `mb-4` → `mb-3 md:mb-4`.
- Scale-Block: `mt-8` → `mt-4 md:mt-8`, Buttons `h-12` → `h-10 md:h-12`, Labels-Abstand `mb-3` → `mb-2 md:mb-3`.
- Single-Choice (`choice`): `mt-6 space-y-3` → `mt-3 md:mt-6 space-y-2 md:space-y-3`, Buttons `p-4` → `p-3 md:p-4`.
- Multi-Choice: identisch zu Single-Choice anpassen.
- Text-Frage: `mt-6 space-y-3` → `mt-4 md:mt-6 space-y-2 md:space-y-3`, Textarea `rows={5}` → `rows={4}`, `p-5` → `p-4 md:p-5`.

### Nicht ändern
- Datenfluss, Validierung, Save-Logik, Reihenfolge der Fragen, CategoryIntro-Inhalte, Desktop-Look (alle Änderungen via `md:`-Breakpoints rückwärts kompatibel).

## Erfolgskriterium
Bei iPhone-Viewport (375×667 bis 414×896) ist bei einer typischen 4–6-Optionen-Choice-Frage sowohl der Pause-Button oben als auch der Weiter-Button unten ohne Scrollen sichtbar. 1–10-Skalen bleiben weiterhin auf einen Blick erfassbar.
