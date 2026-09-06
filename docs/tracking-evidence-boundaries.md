# Tracking & Wirkungsdaten Boundaries

Diese Regeln halten die Datenebene pilotfähig, präsentationsfähig und App-Store-gerecht.

## Spieler

- Spieler sehen keinen Mental Score, keine Diagnose und kein psychologisches Ranking.
- Der Fragebogen erzeugt intern eine Startprofil- und Fortschrittsbaseline für Aufgabenlogik, Messfenster und spätere aggregierte Auswertung.
- Private Inhalte bleiben privat: Journaltexte, freie Antworten und Reflexionen gehören nicht in Coach-Ansichten, Exporte oder Incident-Logs. Sentry ist aus der App entfernt.

## Coach

- Individuell sichtbar sind nur nicht-sensitive Produktdaten: letzte Nutzung, absolvierte Tage, Check-in erledigt ja/nein, Programmfortschritt und Inaktivitätsrisiko.
- Sensible Wirkungsdaten sind nur als Teamaggregate sichtbar und erst ab Mindest-n.
- Coach-Wirksamkeit beschreibt beobachtete Veränderung, nicht Ursache, Diagnose oder medizinische Wirkung.

## Admin

- Admin nutzt Daten für Datenqualität, Pilot-Readiness, Exportbereitschaft und technische Vollständigkeit.
- Präsentations- und Study-Auswertungen respektieren `data_contribution_consent`.
- QA-, Demo-, Pilot- und Production-Daten müssen unterscheidbar bleiben.

## Exporte

- Erlaubt: aggregierte Nutzung, Completion, Missingness, Messfenster-Readiness, Pre/Mid/Post-Verfügbarkeit und teamweite Scores ab Mindest-n.
- Nicht erlaubt: E-Mails, Rohantworten, freie Antworten, Journaltexte, private Einzelprofile und individuelle psychologische Scores.
- Export-Manifeste sollen `privacy_level`, `consent_scope`, `claim_boundary` und `privacy_exclusions` enthalten.
