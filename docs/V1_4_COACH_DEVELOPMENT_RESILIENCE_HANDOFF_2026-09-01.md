# V1.4 Coach-Entwicklung Resilienz — lokales Handoff

Status: **TESTED_LOCAL / NICHT LIVE**
Basis: `origin/main@88b6ed2b872a88028596112319331cf07980e1d1`

## Implementierter Scope

- `Coach > Entwicklung` führt bei Fetch- und 5xx-Fehlern genau einen stillen Retry aus.
- 4xx-, Auth-, Permission- und RLS-Fehler werden nicht automatisch wiederholt.
- Ein bestehender transienter Fehler wird beim erneuten Öffnen von `Entwicklung` sowie bei `online` oder Window-Focus erneut geladen; erfolgreiche Zustände lösen dabei keinen Request aus.
- Gleichzeitige Recovery-Signale werden auf einen laufenden Request begrenzt.
- Erfolgreich geladene Daten und offene Formeingaben bleiben bei einem Hintergrundfehler sichtbar.
- Die Team-Ebene bleibt bei `teamEligible = false` gesperrt; die zulässige Einzelbeobachtung bleibt aktiv.
- Event-Listener werden beim Unmount entfernt; der Fix verwendet keine Timer.

## Lokale Verifikation

- neue Resilienztests: 8/8 grün;
- fokussierte Coach-/Evidence-Suite: 41/41 grün;
- vollständige Vitest-Suite: 219/219 Dateien, 1175/1175 Tests grün;
- Typecheck grün;
- Production-Build grün;
- scoped ESLint: 0 Fehler; ein bereits vorhandener `fetchTeams`-Dependency-Warnhinweis in `Coach.tsx` bleibt unverändert;
- `git diff --check` grün.

## Separater offener First-Run-Block

Der visuelle und inhaltliche First-Run-Umbau ist **nicht** Teil der Implementierung. Sein Produkt- und QA-Vertrag steht in
[`V1_4_FIRST_RUN_PARITY_DENSITY_TODO_2026-09-01.md`](./V1_4_FIRST_RUN_PARITY_DENSITY_TODO_2026-09-01.md).

Kernpunkte: maximal sieben Szenen pro Rolle, aktuelle Heute-/7-Tage-/Reminder-Begriffe, korrekte Team-Eligibility, der aktuelle vierstufige Athleten-Daily-Flow, reale Science-/Mission-/Pre-Training-/Journal-Szenen, klar markierte Beispielwerte und Mobile-Abnahme auf `390 × 844` sowie `320 × 568`.

## Nicht ausgeführt

Kein Push, Merge, Deploy, Supabase-Write, Production-Schritt, TestFlight- oder Store-Schritt.
