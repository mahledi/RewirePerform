# Launch Operations V1

RewirePerform startet als kontrollierter Pilot mit 1-3 Teams. Ziel ist nicht, jeden Fehler unmöglich zu machen, sondern jeden kritischen Fehler schnell sichtbar, bewertbar und rollbackbar zu machen.

## Operating Principles

- Production bleibt ruhig: keine Experimente direkt mit echten Teams.
- Daten sind heilig: keine Migration ohne Backup-/Rollback-Gedanke.
- Logs sind technisch, nicht psychologisch: keine E-Mails, keine Journals, keine Freitexte, keine Rohantworten.
- Claims bleiben vorsichtig: interne Programmevaluation, beobachtete Entwicklung, keine Diagnose, keine medizinische Wirkung, keine Kausalaussage ohne Kontrollgruppe.

## Monitoring

Frontend-Fehler laufen über Sentry. Die App bevorzugt `VITE_SENTRY_DSN` und nutzt
für Lovable-Builds einen kontrollierten Public-DSN-Fallback in `src/lib/monitoring.ts`.
Der DSN ist kein Private Key; die Privacy-Sicherheit entsteht dadurch, dass keine
privaten Inhalte an Sentry übergeben werden.

Sentry darf enthalten:

- Route
- technische Rolle
- QA/Test-Flag
- App-Environment
- Release-SHA
- Stack Trace

Sentry darf nicht enthalten:

- E-Mail-Adressen
- Journaltexte
- freie Reflexionen
- Fragebogen-Rohantworten
- individuelle psychologische Scores
- Teamcodes

## App Event Log

`app_event_log` ist ein privacy-safe Incident-Log. Es ist nicht als Klicktracking
oder Aktivitätsanalyse gedacht.

Standard:

- technische Fehler werden geloggt
- normale erfolgreiche Nutzeraktivität wird in den Fach-Tabellen gemessen
- keine "jeder Klick"-Events
- keine erfolgreichen Daily-Events im Incident-Log

Erlaubte Fehler-Events:

- `auth_login`
- `auth_signup`
- `team_join_attempt`
- `team_join_success`
- `onboarding_completed`
- `assessment_saved`
- `deep_profile_saved`
- `daily_checkin_saved`
- `journal_saved`
- `pre_training_opened`
- `push_clicked`
- `coach_dashboard_loaded`
- `admin_export_downloaded`

Gespeichert werden nur technische Metadaten wie Route, Status, Rolle, Team-ID,
Fehlercode, Testflag und Zählwerte. Private Inhalte bleiben ausgeschlossen.

Normale Aktivität kommt aus bestehenden Quellen:

- `daily_checkins`
- `daily_journals`
- `assessments`
- `deep_profile_assessments`
- `questionnaire_responses`
- `notification_log`
- Study-/Presentation-Aggregate

## Bug Severity

P0: sofort stoppen oder rollbacken

- Login/Auth für viele Nutzer kaputt
- Datenverlust oder falsche Speicherung
- Coach sieht private Inhalte
- App lädt nicht
- falsche Team-/Rollen-Zuordnung

P1: schnell fixen, Pilot eng beobachten

- Daily Check-in, Journal, Assessment oder Teamcode bei Teilen der Nutzer kaputt
- Push-Reminder falsch oder nicht nachvollziehbar
- Admin/Study-Datenqualität nicht prüfbar
- wichtige mobile Flow-Probleme

P2: bündeln und geplant fixen

- Layout/Copy/Polish
- einzelne Edge Cases ohne Datenrisiko
- Export-Komfort

## Incident Process

1. Fehler klassifizieren: P0/P1/P2.
2. Betroffene Fläche bestimmen: Rolle, Route, Team, Browser, Zeitpunkt.
3. Sentry/App-Event/Admin-Systemstatus prüfen.
4. Bei P0: Feature deaktivieren, vorherigen Commit redeployen oder Hotfix-Branch erstellen.
5. Minimalen Fix bauen, lokal testen, PR mit CI.
6. Nach Deployment denselben Flow erneut aus Nutzerperspektive testen.
7. Kurz dokumentieren: Ursache, Fix, Zusatztest.

## Weekly Pilot Check

- Admin Systemstatus prüfen.
- Launch-Ops Fehler 24h/7d prüfen.
- Teams unter `n < 5` prüfen.
- Check-in/Journals/Assessments gegen Teamgröße plausibilisieren.
- Push sent/opened/failed prüfen.
- QA-Daten getrennt von Production lassen.
- Feedback-Liste sichten.

## Rollback Rule

Rollback ist richtig, wenn:

- private Daten gefährdet sind,
- mehrere Nutzer nicht mehr einloggen oder speichern können,
- eine Migration unerwartet Daten verändert,
- ein Fix mehr Risiko erzeugt als er löst.

Rollback ist nicht nötig bei:

- isoliertem UI-Polish,
- einem einzelnen fehlerhaften Export,
- nicht launch-blockierendem Push-Verhalten.

## Pilot Launch Checklist

- `npm run ci` ist grün.
- Sentry-DSN ist in Production gesetzt oder bewusst noch leer.
- `app_event_log` Migration ist im echten Backend.
- Admin Systemstatus lädt.
- Login, Teamcode, Check-in, Journal, Assessment, Push und Pre-Training erzeugen technische Events.
- Coach sieht weiterhin nur Aggregate und niemals private Texte.
- Backup-/Restore-Weg ist bekannt.
- Erster Pilot startet mit enger Beobachtung statt Massenrollout.
