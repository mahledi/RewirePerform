# RewirePerform Knowledge Pack - Executive Summary

Stand: 11. Juli 2026

## Statuslegende

- `CONFIRMED_FROM_CODE`: direkt in Code, Migration, Test oder aktiver Konfiguration belegt.
- `CONFIRMED_FROM_CHAT`: von Mahle im langjaehrigen Produktchat wiederholt oder eindeutig festgelegt.
- `CONFIRMED_FROM_BOTH`: durch Repository und Chat gemeinsam belegt.
- `INFERRED`: plausible Schlussfolgerung, die Mahle bestaetigen muss.
- `OUTDATED_OR_UNCERTAIN`: historischer oder nicht mehr sicher aktueller Stand.
- `CONFLICT`: Quellen widersprechen sich.

## Kurzurteil

RewirePerform ist eine produktionsnahe Mental-Performance-App fuer Athleten und Coaches mit einem strukturierten 56-Tage-Programm, taeglichen Check-ins, Journal, Verstaendnispruefungen, validierten Assessments, Development Index, Teamfunktionen, geschuetzten Coach-Aggregaten und einem Admin-/Evidence-System. Das Produkt ist als Vite/React-App mit Supabase-Backend, PWA und Capacitor-iOS-Shell aufgebaut.

Der aktuelle Git-Stand ist nicht `main`, sondern `agent/nlz-pilot-readiness`, lokal einen Commit vor dem Remote. Die juengste Arbeit haertet run-spezifisches Mannschaftstracking, NLZ-Pilot-Readiness, Evidence und Offline-Rueckmeldung. Diese Wissensextraktion veraendert diesen Stand nicht.

## Produktphase

- `CONFIRMED_FROM_BOTH` Kontrollierter Pilot und Launch-Haertung, nicht Massenrollout.
- `CONFIRMED_FROM_CODE` NLZ-Tracking V2 und Pilot-Readiness sind implementiert und laut juengstem Readiness-Bericht im Staging mit 21/21 Rollen-/RPC-Checks geprueft.
- `CONFIRMED_FROM_BOTH` Vor einem ernsthaften Mannschaftspilot bleiben mehrtaegiger Zeitlauf, echter iPhone/TestFlight-Test und separat freigegebener Production-Deploy Pflicht.
- `CONFIRMED_FROM_CHAT` Der aktuell wichtigste inhaltliche Qualitaetsblock ist die verstaendliche Sprache des 56-Tage-Programms fuer Athleten, insbesondere etwa 14- bis 22-Jaehrige ohne Mentaltraining-Vorwissen.
- `CONFLICT` Aktiver Branch und neueste Commits priorisieren NLZ-Pilot-Readiness; der letzte alte Chat priorisiert als naechsten Produktblock den Sprachumbau. Mahle muss die Reihenfolge bestaetigen.

## Unverhandelbare Leitplanken

- Keine Diagnose, Therapie-, Heil- oder medizinischen Wirkversprechen.
- Keine Kausalbehauptung ohne geeignetes Studiendesign und Vergleichsbedingung.
- Keine Ego-, Persoenlichkeits- oder Mentalstatus-Aussage ueber Einzelspieler aus indirekten Daten.
- Keine Journaltexte, Freitexte, Rohantworten oder individuellen psychologischen Scores fuer Coaches, Exporte, Sentry oder Incident-Logs.
- Sensible Teamaggregate erst ab mindestens fuenf unterschiedlichen Athleten; bei fuenf bis neun als niedrige Konfidenz behandeln.
- Produktnutzung bleibt auch bei abgelehntem freiwilligem Datenbeitrag moeglich.
- GitHub und versionierte Migrationen sind technische Source of Truth; externe Deployments und produktive Daten bleiben separat zu verifizieren.
- Keine produktive Migration, RLS-/Auth-Aenderung, Domainumschaltung, Datenoperation, Merge oder Deployment ohne Mahles Freigabe.

## Wichtigste offene Risiken

1. `CONFLICT` `supabase/config.toml` zeigt auf das eigene Projekt `bqsbxesmybthwtxmowfz`, waehrend CI und Teile von `docs/DEPLOYMENT.md` noch `twceqincrbrenyuqukpj` nennen.
2. `CONFLICT` Aeltere Migrations- und Outcome-Dokumente beschreiben Zustaende, die durch Program Runs und den Hosting-Cutover ueberholt sein koennen.
3. `CONFIRMED_FROM_CODE` Account-Loeschung ist als Anfrage/48-Stunden-Prozess beschrieben, aber kein vollstaendiger Self-Service-Loeschflow ist belegt.
4. `CONFIRMED_FROM_CODE` Native iOS-Push ist nicht gleich Web Push und bleibt fuer App Store V1 ein eigener Track.
5. `CONFIRMED_FROM_CODE` Ein grosser Build-Chunk und bestehende Hook-/Fast-Refresh-Warnungen bleiben technische Restschuld.
6. `CONFIRMED_FROM_CHAT` Die Programmsprache ist in vielen Tagen zu abstrakt; die Uebersetzung darf jedoch die fachliche Mechanik nicht veraendern.

## Sichere Uebergabe an MahleOS

Bereits sicher uebergebbar sind reine Repository-Analyse, Dokumentationspflege, UI-Polish mit bestehenden Mustern, Content-Audit ohne Bedeutungsveraenderung, Testausfuehrung und nicht-produktive Read-only-Diagnostik. Blockiert oder freigabepflichtig bleiben Datenbank-/RLS-/Auth-Aenderungen, produktive Deployments, sensible Datenfluesse, wissenschaftliche Endfreigaben, App-Store-Rechtsangaben und neue externe Integrationen.

## Erste Lesereihenfolge fuer neue Agenten

1. `REWIREFORM_CONTEXT_PACK.md`
2. `12-SOURCE-OF-TRUTH.md`
3. `13-CONFLICTS-AND-UNCERTAINTIES.md`
4. `14-RISK-MATRIX.md`
5. Die zum Task passende Fachdokumentation, insbesondere `docs/CONTENT_LANGUAGE_STANDARD.md`, `docs/NLZ_FINAL_READINESS_REPORT.md`, `docs/NLZ_PRIVACY_AUDIT.md`, `docs/DEPLOYMENT.md` und `docs/APP_STORE.md`

