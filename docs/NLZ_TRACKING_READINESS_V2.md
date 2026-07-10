# NLZ Tracking Readiness V2

## Implementierter Stand

Die V2-Schicht führt eine eindeutige Pilot-Einheit `program_runs` ein. Ein Run verbindet Team, Startdatum, Status und die Programminstanzen aller Athleten. Alle neuen Pilot-Auswertungen sind auf diese Instanzen begrenzt.

Die finale Tagesaktion wird über `save_daily_tracking_v2` atomar gespeichert:

1. Programminstanz und Assignment werden validiert.
2. Check-in wird idempotent eingefügt oder aktualisiert.
3. Tagesabschluss wird in derselben Transaktion gespeichert.
4. Optionaler Verständnis-Check wird in derselben Transaktion gespeichert.
5. Erst nach erfolgreichem RPC wird der Progress Snapshot aktualisiert.

Ein fehlgeschlagener Check-in kann deshalb keine falsche Completion erzeugen. Wiederholtes Speichern verwendet dieselbe Identität aus Nutzer, Instanz und Datum. `completed_at` bleibt bei bereits abgeschlossenen Tagen stabil.

## Neue operative Funktionen

- `create_team_program_run`
- `activate_team_program_run`
- `assign_team_members_to_program_run`
- `get_active_team_program_run`
- `get_team_program_run_status`
- `save_daily_tracking_v2`
- `get_nlz_pilot_readiness`
- `get_nlz_evidence_dossier`
- `create_nlz_program_run_snapshot`

## Readiness Gate

`RED`:

- kein aktiver Run oder kein Startdatum
- fehlende oder falsche Programminstanzen
- Trackingdaten ohne Instanz
- Completion ohne Check-in
- Duplikate
- mehrere aktive Instanzen
- Testnutzer in Production

`YELLOW`:

- weniger als fünf Athleten
- Consent nicht vollständig
- Pre-Messungen nicht vollständig
- Development Index Pre nicht vollständig

`GREEN`:

- aktiver Run
- alle Athleten korrekt zugeordnet
- keine erkannten Integritätsfehler
- mindestens fünf Athleten
- Consent und beide Pre-Messbasen vollständig

## Evidence

Das Dossier enthält Run-Metadaten, Stichprobe, Consent, Day-1/7/14/28/56-Nutzung, Adhärenz, Team Pulse, Pre/Mid/Post-Missingness, consentierte Veränderungsaggregate und Datenqualität.

Psychologische Werte und Veränderungen werden bei `n < 5` auf `null` gesetzt. Bei `5 <= n < 10` wird `low_confidence` gesetzt. Freie Texte, E-Mails, Rohantworten, Einzel-Scores und Einzelverläufe werden nicht selektiert.

## Noch nicht als erledigt zu behaupten

- Die neuen Migrationen wurden erfolgreich gegen das ausgewiesene Staging-Projekt `towgvykgezrmkbyudjen` ausgefuehrt.
- Die Staging-Matrix mit echten Athlete-, Coach- und Admin-JWTs hat 21 von 21 Checks bestanden.
- Die temporaere QA-Kohorte wurde nach dem Test vollstaendig entfernt.
- Kein Deployment und keine produktive Datenmigration wurde ausgeführt.
- Historische Development-Index-Daten besitzen keine nachträgliche Run-Zuordnung und bleiben aus run-spezifischen Dossiers ausgeschlossen.
- Wissenschaftliche Wirksamkeit ist nicht bewiesen. Das System erzeugt eine belastbare Pilot- und Beobachtungsgrundlage.

## Freigabeweg

1. SQL-Checks aus `docs/sql/nlz-pilot-readiness-checks.sql` vor jedem Pilotstart ausführen.
2. Tag 2, 7, 14, 28 und 56 im mehrtaegigen Staging-Zeitlauf simulieren.
3. Admin Pilot Readiness und Coach Pulse auf einem echten iPhone/TestFlight-Build prüfen.
4. Erst danach produktive Migration, Pilotstart und externe Vorstellung freigeben.
