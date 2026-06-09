# App Store Privacy Checklist

Stand: 2026-06-08

Diese Checkliste hält fest, wie RewirePerform die App-Store-Privacy-Themen für Pilotbetrieb und spätere iOS/WebView-Veröffentlichung behandelt. Sie ersetzt keine finale Rechtsprüfung, ist aber die technische Produktlinie für Entwicklung, QA und App-Store-Antworten.

## Grundprinzip

RewirePerform nutzt Daten zur Programmdurchführung, Personalisierung, Fortschrittslogik, Erinnerungen, Coach-Übersicht und privacy-safe Wirkungs-/Pilotberichten. Es gibt kein Werbe-Tracking, keine Datenbroker, keine IDFA-Nutzung, kein Cross-App-Tracking und keine Marketing-Pixel.

## Pflichtdaten für das Produkt

Diese Daten sind produktnotwendig und gelten in App Store Connect voraussichtlich als mit dem Nutzer verknüpft:

- Accountdaten: Login-Identifier, Rollen, Teamzugehörigkeit.
- Programmfortschritt: Programminstanz, Tage, erledigte Aufgaben, Completion.
- Fragebogen- und Testdaten: Antworten, berechnete interne Scores, Pre/Mid/Post-Verfügbarkeit.
- Check-ins: tägliche Zustandsdaten für Flow und Fortschrittslogik.
- Journals: private Reflexionen für den Nutzerflow.
- Trainings-/Teamkalender und Reminder-Einstellungen.
- Push-Subscription-Daten für Erinnerungen.

## Optionaler Datenbeitrag

Nutzer werden vor dem Fragebogen gefragt, ob anonymisierte oder aggregierte Nutzungs- und Fortschrittsdaten auch zur Verbesserung von RewirePerform sowie für Pilotberichte, Präsentationen und Gespräche mit Teams genutzt werden dürfen.

Technische Verankerung:

- `profiles.data_contribution_consent`
- `profiles.data_contribution_consent_version`
- `profiles.data_contribution_consented_at`
- `profiles.data_contribution_updated_at`

Ohne aktive Zustimmung werden Nutzer in Präsentations- und Study-RPCs nicht gezählt:

- `get_admin_presentation_metrics`
- `get_admin_study_overview`
- `create_study_aggregate_snapshot`
- `compute_team_outcomes`

Die Zustimmung ist freiwillig und in den Einstellungen änderbar.

## Privacy Boundaries

Nicht identifizierbar in Coach-/Präsentations-/Study-Exports verwenden:

- Journaltexte
- freie Antworten
- rohe individuelle Check-in-Verläufe
- rohe Fragebogenantworten
- individuelle psychologische Scores
- identifizierende mentale Labels einzelner Spieler
- E-Mail-Adressen

Coach-Sicht individuell erlaubt:

- Teilnahme / letzte Nutzung
- erledigte Tage
- Check-in erledigt ja/nein
- Programmfortschritt
- Inaktivitätsrisiko

Coach-Sicht nicht erlaubt:

- Mood-Verlauf einzelner Spieler
- Journaltext
- freie Antworten
- Rohscores
- individuelle psychologische Labels

## Sentry / Diagnostik

Sentry bleibt diagnostic/error-only:

- `tracesSampleRate: 0`
- `sendDefaultPii: false`
- `beforeSend` entfernt Cookies/Headers und reduziert User auf `{ id }`
- keine Journaltexte, freien Antworten, E-Mails oder privaten psychologischen Inhalte

`app_event_log` bleibt error-only / incident-only. Normale Aktivität gehört nicht in das Incident-System.

## App Store Connect Vorbereitung

Vor finalem Submit erneut prüfen:

- App Privacy Details: Datenkategorien und "linked to user" korrekt beantworten.
- Keine Antwort als "tracking" markieren, solange keine Werbe-/Cross-App-/Datenbroker-Nutzung existiert.
- `PrivacyInfo.xcprivacy` für native iOS/WebView-App erstellen.
- Third-Party-SDK-Manifests prüfen, insbesondere Supabase, Sentry und Web-Push/PWA-Kontext.
- Datenschutz-URL und User-Privacy-Choices-URL final bereitstellen.
- Consent-Screen und Settings-Schalter auf iPhone testen.

## QA vor Pilot

- Neuer Spieler sieht Consent vor dem Fragebogen.
- Zustimmung speichert Version und Zeitpunkt.
- Ablehnung erlaubt Programmnutzung.
- Settings können Zustimmung aktivieren/deaktivieren.
- Admin-Präsentationsmetriken zählen nur zugestimmte Nutzer.
- Study-Snapshots enthalten `consent_scope` in den Metadaten.
- Der Fragebogen-Score bleibt eine interne Fortschrittsbaseline und wird Spielern nicht als Mental Score, Diagnose oder Ranking angezeigt.
