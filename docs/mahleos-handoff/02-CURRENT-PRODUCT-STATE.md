# Aktueller Produktzustand

## Snapshot

| Bereich | Zustand | Source of Truth | Risiko / Autonomie |
|---|---|---|---|
| Frontend | Vite, React 18, TypeScript, Tailwind, shadcn/Radix, Framer Motion | `package.json`, `src/` | R2 UI lokal; R3 bei Kernflows |
| Backend | Supabase Auth, Postgres, RLS, RPCs, Edge Functions | `supabase/` | R4, Freigabe erforderlich |
| Rollen | `athlete`, `coach`, `admin` | `AuthContext`, `user_roles`, RLS | R4 |
| Hosting | Vercel-Konfiguration und eigene Domain im Repo dokumentiert | `vercel.json`, Deployment-Dokumente | externer Live-Stand muss verifiziert werden |
| PWA | eigener Service Worker, kein App-Shell-Precache, Web Push | `src/sw.ts`, `registerSW.ts` | R3 |
| iOS | Capacitor-Shell mit Bundle-ID `com.rewireperform.app` | `capacitor.config.ts`, `ios/` | R3/R4 vor Store-Release |
| Payments | nicht implementiert/belegt | Repository-Suche | R4 falls neu |

## Nutzerflaechen

- Oeffentlich: Landingpage, Demo, Praesentation/Coach-Pitch, Privacy, Support, Auth.
- Athlet: Fragebogen, Dashboard, taeglicher Check-in, Science Bite, Aufgaben, Verstaendnis-Check, Journal, Pre-Training, Assessments, Development Index, Fortschritt, Einstellungen.
- Coach: Teamverwaltung, Teamuebersicht, Aktivitaet, Teamzustand/Team Pulse, Training/Kalender, Toolkit, Evidence.
- Admin: Uebersicht, Wirkungs-/Presentation-/Study-Daten, Exporte, Systemstatus, Content-Browser, QA und NLZ Pilot Readiness.

## Aktive fachliche Systeme

- 56-Tage-Content in TypeScript-Dateien.
- Deterministische Tageszuweisung nach Programmstart und Kalenderkontext.
- Atomarer Daily-Tracking-RPC fuer Check-in, Completion und optionalen Verstaendnis-Check.
- Programminstanzen und run-spezifische `program_runs` fuer Mannschaftspiloten.
- Private Journale und Reflexionen.
- Zehn direkte Wohlbefinden-/Zustandsdimensionen im Daily Tracking.
- Validierte Instrumente CSAI-2R, SMTQ und Flow-Kurzskala sowie eigener Development Index.
- Consent-aware Study-/Evidence-Snapshots und NLZ-Dossier.
- Web-Push fuer Morgen, Abend, Vortraining und Programmstart.
- Sentry und privacy-safe `app_event_log` fuer technische Fehler.

## Bekannte Unfertigkeiten

- Mehrtaegiger Staging-Zeitlauf bis zu spaeten Programmtagen laut Readiness-Bericht offen.
- Echter TestFlight-/iPhone-Geraetetest offen.
- Native iOS Push-Implementierung nicht als abgeschlossen belegt.
- Self-Service-Account-Loeschung nicht implementiert; aktuell Anfrageprozess.
- Bundle-Chunk ueber 500 kB und einige Lint-Warnungen.
- Programmsprache ueber 56 Tage noch nicht vollstaendig nach dem neuen Sprachstandard ueberarbeitet.
- Externer Production-Stand kann nicht allein aus Git abgeleitet werden.

## Autonomiegrenze

Ein Agent darf selbststaendig lesen, analysieren, lokale Tests ausfuehren und freigegebene R1/R2-Dokumentations- oder UI-Arbeit umsetzen. Er darf keine produktiven Daten, RLS, Auth, Migrationen, Domains, Secrets, Push-Cronjobs, App-Store-Angaben oder wissenschaftlichen Claims ohne Mahles vorherige Freigabe veraendern.
