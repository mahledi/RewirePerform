# App Store Privacy Checklist

Stand: 2026-07-18

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

Ohne aktuelle Zustimmung und, bei Minderjaehrigen, ohne aktuelle Guardian- plus
Athletenfreigabe werden Nutzer in dynamischen Evidence-Aggregaten und Data Locks
nicht gezaehlt. Der lokale aktuelle Vertrag nutzt:

- `evidence_eligibility_reason`
- `get_program_run_development_evidence`
- `get_solo_development_evidence_summary`
- `get_team_mental_state_aggregate`
- `create_evidence_data_lock`

Aeltere Study-/NLZ-Snapshot-Builder bleiben historisch vorhanden, besitzen im
lokalen Hardening-Kandidaten aber kein Ausfuehrungsrecht fuer App-Nutzer.

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

## Diagnostik

Sentry ist aus dem ausgelieferten App-Code entfernt; das externe Projekt bleibt
erhalten. `app_event_log` bleibt error-only / incident-only. Es speichert nur
normalisierte Fehlercodes, bereinigte Routen und allow-listete technische
Metadaten. Normale Aktivität gehört nicht in das Incident-System.

## App Store Connect Vorbereitung

Vor finalem Submit erneut prüfen:

- App Privacy Details: Datenkategorien und "linked to user" korrekt beantworten.
- Keine Antwort als "tracking" markieren, solange keine Werbe-/Cross-App-/Datenbroker-Nutzung existiert.
- Vorhandene und im iOS-Target eingebundene `PrivacyInfo.xcprivacy` gegen die reale Runtime-Datenkarte und die App-Store-Connect-Antworten abgleichen.
- Third-Party-SDK-Manifeste und Required-Reason-APIs im finalen Xcode Privacy Report prüfen, insbesondere Supabase und Web-Push/PWA-Kontext; Sentry darf dort nicht mehr als eingebundenes SDK erscheinen.
- Datenschutz-URL und User-Privacy-Choices-URL final bereitstellen.
- Consent-Screen und Settings-Schalter auf iPhone testen.

Aktuelle Release-Blocker nach lokalem Hardening:

- Production-Aktivierung und reale RLS-/Grant-/JWT-Nachpruefung der lokalen
  Alters-, Consent- und Aggregat-Haertung;
- fachlich-rechtliche Freigabe des Minderjaehrigen-/Evidence-Vertrags und eine
  verbindliche Widerrufs-/Aufbewahrungsregel fuer Data Locks;
- finaler Abgleich des Privacy-Texts mit realen Provider-, Log-, Backup- und
  Aufbewahrungsprozessen;
- verifizierter finaler Build ohne Sentry-SDK, DSN oder Runtime-Capture;
- Abgleich von Manifest, Xcode Privacy Report und App Store Connect auf dem final signierten Build.

## QA vor Pilot

- Neuer Spieler sieht Consent vor dem Fragebogen.
- Zustimmung speichert Version und Zeitpunkt.
- Ablehnung erlaubt Programmnutzung.
- Settings können Zustimmung aktivieren/deaktivieren.
- Admin-Präsentationsmetriken zählen nur zugestimmte Nutzer.
- Study-Snapshots enthalten `consent_scope` in den Metadaten.
- Der Fragebogen-Score bleibt eine interne Fortschrittsbaseline und wird Spielern nicht als Mental Score, Diagnose oder Ranking angezeigt.
