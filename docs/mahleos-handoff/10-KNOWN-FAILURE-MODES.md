# Known Failure Modes

| ID | Fehlerbild | Ursache / Fruehwarnsignal | Verbindliche Praevention | Test |
|---|---|---|---|---|
| FM-01 | Safari zeigt nach Deploy alten Stand oder Chunk-Fehler | altes HTML/SW-Cache-Mix | kein App-Shell-Precache, revalidierbare HTML/SW-Header | iOS Reload nach Deploy |
| FM-02 | App laedt mehrfach beim Start | ueberlappende SW-/Reload-Mechanismen | eine minimale Registrierungsstrategie, keine doppelten Auto-Reloads | Start-/Focus-Smoke |
| FM-03 | Assessment crasht bei `items[u].text` | Index/Antwortzustand ausserhalb Array | aktuellen Itemzugriff guarden, Navigation blockieren | unvollstaendige Antworten/Resume |
| FM-04 | Nutzer erreicht Ende mit fehlenden Pflichtantworten | Validierung nur am Abschluss | pro Schritt blockieren und sichtbar erklaeren | alle Pflichtpfade |
| FM-05 | Richtige Antwort immer oben | deterministische Reihenfolge | Optionen pro Frage stabil zufaellig mischen | Positionsverteilung |
| FM-06 | Coach-Edge-Function erzeugt unbrauchbare Incident-Events | Transportfehler als Produktfehler behandelt | technische Transportfehler differenziert behandeln | Function offline/HTTP error |
| FM-07 | Daily Completion ohne Check-in | getrennte nicht-atomare Saves | `save_daily_tracking_v2`, Snapshot erst danach | RPC-Fehler/Retries |
| FM-08 | Doppelte Tagesdaten | Retry ohne eindeutige Identitaet | DB-Constraints, Lock, idempotentes Upsert | doppelter Submit |
| FM-09 | Coach sieht zu sensible Daten | UI-only Schutz oder breite Selects | serverseitige RLS/RPC-Aggregation, Privacy-Tests | Athlete/Coach/Admin JWT |
| FM-10 | Evidence vermischt alte oder andere Laeufe | fehlende Run-Grenze | `program_run_id`, keine automatische historische Zuordnung | Dossier mit Fremdinstanz |
| FM-11 | QA verunreinigt Production-Kennzahlen | Testflags nicht gefiltert | `include_test=false` Standard, klare Team-/Userflags | QA/Production Vergleich |
| FM-12 | Voice-Text geht beim Stoppen verloren | finaler Speech-Callback kommt spaeter | Zwischenresultat direkt ins Feld uebernehmen | sprechen, sofort stoppen |
| FM-13 | Mobile Flow landet in Seitenmitte | alter Scrollstand bleibt | bei Schrittwechsel sofort `scrollTo(0,0)` ohne Animation | iPhone Flow-Smoke |
| FM-14 | Button wirkt nicht gedrueckt | Save ohne Press-/Loading-Feedback | sofortiger visueller Zustand und Disable | langsames Netzwerk |
| FM-15 | UI wirkt billig/laut | zu viele Karten, Tipps, Graphen, wiederholte Copy | ruhige Hierarchie, direkte Zahlen, Text reduzieren | Desktop/Mobile Review |
| FM-16 | Spieler versteht Aufgabe nicht | Science Bite wird in abstrakte Kurzbegriffe komprimiert | Sprachstandard, Situation -> Handlung -> Nutzen | 16-jaehriger Einmal-Lese-Test |
| FM-17 | Neuer Host spricht mit falscher DB | Fallback oder falsche Env Vars | keine Production-Fallbacks, Projekt-ID validieren | Build-Env-Check |
| FM-18 | Manuelle Datenkorrektur erzeugt Folgefehler | SQL-Fix ohne Datenmodellverstaendnis | Ursache reproduzieren, Migration/Forward Fix, Backup | Dry-run und Rollback |
| FM-19 | Agent refactort ausserhalb Scope | Systemgroesse wird unterschaetzt | enges Diff, fremde Aenderungen bewahren | Diff Review |
| FM-20 | Agent behauptet externen Zustand aus Repo | Deployment/DB nicht live verifiziert | Code- und External-State getrennt kennzeichnen | Read-only Dashboard/CLI Check |

## Stop-Bedingungen

Agent soll stoppen und Mahle fragen bei unklarer produktiver Datenquelle, widerspruechlichen Projekt-IDs, moeglicher Privacy-Verletzung, destruktiver Migration, fehlendem Backup, veraenderter Claim-Bedeutung, unklarer Minderjaehrigen-Einwilligung oder wenn bestehende fremde Aenderungen nicht sicher integrierbar sind.
