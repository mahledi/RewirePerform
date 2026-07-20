# Pilot-Datenschutz- und Datenerhebungs-Audit

Stand: 15. Juli 2026

Technische Nachtraege:

- 17. Juli 2026: Xcode-/Simulatorpfad lokal verifiziert; Rechts- und Minderjaehrigenstatus unveraendert.
- 18. Juli 2026: aktuelles `origin/main` mit Tracking/Evidence und E-Mail-Flows integriert getestet; Production-Function-Grants und Security Advisor read-only geprueft. Keine Rechts-, Minderjaehrigen- oder Production-Freigabe erteilt.
- 20. Juli 2026: lokaler Tracking-Hardening-Kandidat ersetzt den direkten
  Service-Role-Teamdatenpfad durch einen JWT-gebundenen Aggregat-RPC, wendet
  Consent-/Autorisierungsfilter vor `n >= 5` an und entzieht unsichere anonyme
  Function-Grants. SQL-Negativtests sind lokal gruen; Production ist weiterhin
  unveraendert. Der aktuelle V2-Minderjaehrigenstatus widerspricht Teilen dieser
  historischen Ist-Aufnahme und braucht vor einem Pilot eine konsistente
  fachlich-rechtliche Dokumentation.

Die Abschnitte 1 bis 9 darunter konservieren bewusst die Production-/Code-
Baseline vom 15. bis 18. Juli. Sie duerfen nicht als Beschreibung des lokalen
Hardening-Kandidaten gelesen werden. Dessen aktuelle technische Korrekturen und
verbleibende Gates stehen in
`docs/TRACKING_EVIDENCE_HARDENING_2026-07-20.md`.

Status: historische Production-Baseline plus lokaler Hardening-Nachtrag; Sentry
im Release-Kandidaten aus der App entfernt; keine Rechtsfreigabe, kein Apply der
neuen Tracking-Migrationen und keine Production-Freigabe des
Minderjaehrigen-Evidence-Pfads

Dieses Dokument ist die technische Ist-Aufnahme fuer den geplanten Mannschaftspilot. Es ist kein Rechtsgutachten. Aussagen zu Rechtsgrundlagen, Einwilligung, Forschung, Aufbewahrung und Verantwortlichkeiten muessen vor dem Pilot durch eine fuer Deutschland und den konkreten Vereinskontext qualifizierte Stelle bestaetigt werden.

## 1. Kurzurteil

RewirePerform besitzt bereits mehrere belastbare Schutzmechanismen: direkte Kontoloeschung, RLS/RPC-Grenzen, eine strikte `n >= 5`-Schwelle, deaktivierte AI-Funktionen fuer Fragebogen und Transformation Summary sowie einen technisch vorbereiteten, aber gesperrten Minderjaehrigen-Evidence-Pfad.

Der aktuelle Stand ist trotzdem noch nicht fuer einen Pilot mit 15-jaehrigen Athleten freigegeben. Die wichtigsten Gruende sind:

1. Registrierung und allgemeine Datenbeitrags-Einwilligung kennen aktuell weder Altersgruppe noch Guardian-Status.
2. Die Edge Function `team-mental-state` aggregiert sensible Check-in- und Fragebogenwerte aller zugeordneten Athleten ab fuenf Personen. Sie filtert weder auf die versprochene Datenbeitrags-Einwilligung noch auf eine altersgerechte Freigabe.
3. Aeltere Study-/Presentation-RPCs pruefen die allgemeine Datenbeitrags-Einwilligung, aber nicht durchgehend `evidence_participation_eligibility`.
4. Die sichtbare Datenschutzerklaerung enthaelt mehrere Aussagen, die der aktuelle Code nicht exakt erfuellt oder nicht vollstaendig beschreibt.
5. Verbindliche Fristen fuer Backups, interne Diagnose- und Provider-Logs sind
   noch nicht festgelegt. Der aktive Sentry-Datenstrom ist durch Entfernung von
   SDK, DSN und Capture-Pfad geschlossen; historische Events laufen innerhalb
   der verifizierten 30 Tage aus.
6. Zwolf `SECURITY DEFINER`-Funktionen sind in Production fuer `anon` ausfuehrbar. Bei drei Helpern fehlt eine ausreichende Aufruferbindung fuer Rollen- oder QA-Metadatenabfragen.

Bis diese Punkte geschlossen sind, duerfen 15-Jaehrige nicht allein durch ein eigenes Ja in sensible Teamaggregate, Evaluationen, Evidence-Berichte oder Forschungsnutzung gelangen.

## 2. Gepruefter Umfang

- Frontend-Registrierung, Questionnaire Intro, Konto-/Daten-Einstellungen und Datenschutzerklaerung
- allgemeine Datenbeitrags-Einwilligung `data_contribution_v2_2026_07`
- taegliche Check-ins, Journale, Assessments, Frageboegen und Programmlogik
- Coach- und Team-Sichten einschliesslich `team-mental-state`
- 56-Tage-Evidence-Migration, Eligibility-Gate, Transfer-Pulse und Coach-Evidence
- Study-, Presentation- und Evidence-RPCs
- Push-Subscriptions und `notification_log`
- ehemalige Sentry-Integration und aktives `app_event_log`
- Account-Loeschung und vorhandene Loeschvertraege
- Production-Function-Definitionen, Grants und Supabase Security Advisor
- Supabase Production `bqsbxesmybthwtxmowfz` ausschliesslich read-only

Bei der Production-Pruefung wurden nur Schema, Funktionen, Konfiguration und Zaehler betrachtet. Es wurden keine Antworten, Journale, Check-in-Werte oder sonstigen privaten Inhalte gelesen und keine Daten veraendert.

## 3. Verifizierte Schutzmechanismen

| Schutz | Ist-Zustand | Bewertung |
|---|---|---|
| Kontoloeschung | In-App-Pfad und Production-RPC sind aktiviert; personenbezogene Domain- und Diagnosezeilen werden geloescht | technisch verifiziert |
| Minderjaehrigen-Evidence | `minor_collection_enabled = false`; Guardian- und Assent-Versionen sind `NULL` | korrekt fail-closed |
| Evidence-Schreibpfad | `save_daily_tracking_v3` und Coach-Evidence pruefen serverseitig die Eligibility | belastbar fuer den neuen Evidence-Pfad |
| Journale/Freitexte | keine AI-Analyse; `team-mental-state` selektiert keine Reflection; alte AI-Edge-Functions antworten mit HTTP 410 | Code stuetzt die zentrale Journal-Zusage |
| Team-Kleingruppen | psychologische Teamwerte werden erst ab mindestens fuenf verschiedenen Athleten ausgegeben | Schwelle vorhanden, Teilnehmerfilter unvollstaendig |
| Externe Crash-Diagnose | Sentry-SDK, DSN, Initialisierung, Nutzerkontext und Runtime-Capture aus der App entfernt | technisch dekommissioniert; externes Projekt bleibt erhalten |
| Diagnose-Metadaten | Aufrufer uebergeben derzeit strukturierte technische Werte, keine Journal- oder Antworttexte | lokal geprueft |
| Evidence-Protokoll | versionierte Consent-Anforderung und eigenes Eligibility-Audit | gute Grundlage fuer kontrollierten Rollout |

## 4. Datenkarte

| Bereich | Konkrete Daten | Hauptspeicher/Quelle | Aktuelle Nutzung und Sichtbarkeit | Consent-/Altersgate | Aufbewahrung heute |
|---|---|---|---|---|---|
| Account/Auth | E-Mail, Auth-Credential beim Provider, Name, Rolle, Sportprofil | Supabase Auth, `profiles`, `user_roles` | Login, Profil, Rollensteuerung | kein Altersfeld; kein Guardian-Gate | bis Account-Loeschung; Provider-Logs separat |
| Teamzuordnung | Team, Mitgliedschaft, Teamcode-Nutzung, Coach-Zuordnung | `teams`, `team_members` | Teamprogramm und Coach-Zugriff | Rollen- und Teampruefung, kein Altersgate | bis Austritt/Loeschung; Frist nicht festgelegt |
| Programmsteuerung | Run, Instanz, Tag, Completion, Streak, Zuweisungen | `program_runs`, `program_instances`, `user_day_*`, Snapshots | Tageslogik, Fortschritt, operative Coach-Sicht | fuer Produktbetrieb, kein Altersgate | bis Account-Loeschung; keine Inaktivitaetsfrist |
| Check-ins | Mood, Energy, Focus, Wellbeing, Task-Status, Zeitpunkt | `daily_checkins` | Athletenverlauf; Teamaggregate in `team-mental-state`; Evidence bei Freigabe | Produkt-Save ohne Altersgate; Teamaggregation ohne Consent-/Altersfilter | bis Account-Loeschung; keine feste Frist |
| Journale | Journaltext, optionale Reflexion, Tag | `daily_journals` | nur eigener Rueckblick; keine AI-/Evidence-Auswertung | Auth/RLS, kein Altersgate | bis Account-Loeschung |
| Frageboegen/Assessments | Antworten, Scores, strukturierte Analyse, Messzeitpunkt | `questionnaire_responses`, `assessments`, `deep_profile_assessments` | persoenliche Auswertung, Team-/Study-Aggregate | allgemeiner Datenbeitrag teils geprueft; Altersgate nicht durchgehend | bis Account-Loeschung; Snapshots separat |
| Transfer-Evidence | strukturierter Pulse, Domain, Latenz, Messfenster | `athlete_transfer_observations`, Evidence-Protokolltabellen | versionierte Evaluation | allgemeiner Consent plus Eligibility; Minderjaehrige deaktiviert | noch keine verbindliche Evidence-Frist |
| Coach-Evidence | strukturierte Team-/Einzelbeobachtung | `coach_evidence_*`, `coach_journals` | Coach-Review und freigegebene Aggregate | neuer Pfad prueft Eligibility | Frist und Widerrufswirkung auf Snapshots offen |
| Study/Exports | Kohorten, Outcomes, Aggregate, Snapshots, Manifeste | `study_*`, RPCs | interne Auswertung, Praesentation, Export | allgemeiner Consent; Altersgate in aelteren RPCs nicht durchgehend | Snapshot-Loeschregel offen |
| Push | Subscription, Reminder-Zeit, Versand-/Oeffnungs-/Fehlerstatus, Ziel und Metadaten | `push_subscriptions`, `notification_log` | optionale Erinnerung und technische Zustellpruefung | Opt-in fuer Push; kein Altersgate | keine feste Log-Frist |
| Feedback/Support | Kategorie, Nachricht, Status, technische Metadaten | `feedback` | Support und Produktverbesserung | aktive Eingabe | keine feste Frist |
| App-Diagnose | Event, Status, Rolle, Team-ID, Route, Fehlercode, Teststatus, technische Metadaten | `app_event_log` | Incident- und Release-Diagnose | berechtigtes Interesse/Consent-Frage rechtlich zu bestaetigen | keine automatische Bereinigung |
| Historische Sentry-Daten | fruehere minimierte Diagnoseevents | behaltenes Sentry-Projekt | keine neue App-Erfassung nach Deployment | historische Verarbeitung dokumentiert | automatische Provider-Aufbewahrung maximal 30 Tage |
| Provider-Logs/Backups | IP-/Request-/Auth-/Function-Logs, DB-Backups | Supabase, Vercel und weitere Provider | Sicherheit, Betrieb, Wiederherstellung | Providerbetrieb | Supabase Free: kurze Logfenster, keine verwalteten Daily Backups; genaue Gesamtregel offen |
| Loeschnachweis | Request-ID, Status, Zeitpunkt, minimierter Fehlercode | `account_deletion_requests` | Support und Nachweis der Loeschung | serverseitig | verbindliche Frist noch festzulegen |

## 5. Abgleich Datenschutzerklaerung gegen Code

| Aussage in `src/pages/Privacy.tsx` | Technische Realitaet | Status |
|---|---|---|
| Journale und Freitexte werden nicht gelesen, analysiert oder in Aggregate einbezogen | aktuelle Produktpfade und 410-Stubs stuetzen das; Fehlerobjekte bleiben allgemein auf moegliche sensible Messages zu pruefen | weitgehend bestaetigt |
| Gruppierte Werte entstehen nur nach aktivem Ja | `team-mental-state` filtert aktuell nicht auf `data_contribution_consent` | widersprochen, Pilot-Blocker |
| Sensible Teamwerte ab fuenf freigegebenen Athleten | `n >= 5` gilt, aber die fuenf muessen technisch nicht freigegeben sein | teilweise falsch, Pilot-Blocker |
| Minderjaehrige koennen das normale Programm nutzen; nur Evidence bleibt gesperrt | Evidence ist gesperrt; fuer den normalen sensitiven Produktpfad fehlt jedoch Alters-/Guardian-Entscheidung | rechtlich und technisch unvollstaendig |
| Personalisierte Inhalte koennen AI-generierte Aufgaben sein | aktive Produktanalyse ist deterministisch; zwei ehemalige AI-Functions sind deaktiviert | veraltete/falsche Aussage |
| Push speichert nur Subscription und Reminder-Zeiten | `notification_log` speichert auch Versand, Oeffnung, Fehlerstatus, Ziel und Metadaten | unvollstaendige Aussage |
| Cloud-Anbieter werden allgemein beschrieben | Supabase und Vercel sowie Rollen, Regionen und Drittlandtransfer werden nicht konkret genannt | unvollstaendig |
| Die veroeffentlichte Seite nennt den Verantwortlichen und eine Anschrift | Verantwortlicher und physische Kontaktanschrift fehlen | Pflichtangabe offen, Pilot-Blocker |
| Der Text ist die finale veroeffentlichte Fassung | Die Seite sagt selbst, dass sie vor App-Store-Veroeffentlichung noch juristisch final geprueft wird | sichtbar als Entwurf markiert, Release-Blocker |
| Datenuebertragbarkeit ist verfuegbar | kein direkter In-App-Exportpfad gefunden; vermutlich manueller Request | Prozess und SLA fehlen |
| Loeschung entfernt aktive personenbezogene Daten | serverseitiger Vertrag und Realtest stuetzen die Aussage | bestaetigt, Backupfrist offen |
| Speicherdauer endet nach Zweckfortfall | keine verbindlichen Tabellen-, Log-, Snapshot- oder Backupperioden | nicht operationalisiert |

## 6. Serverpfade mit besonderem Risiko

### P0-01: `team-mental-state`

Die Function nutzt Service-Role-Zugriff und baut Teamwerte aus `daily_checkins` und `questionnaire_responses`. Team- und Coach-Berechtigung sowie `n >= 5` werden geprueft. Es fehlt aber die serverseitige Auswahl ausschliesslich aktuell freigegebener und altersgerecht autorisierter Athleten. Damit widerspricht der Pfad der sichtbaren Datenschutzerklaerung.

Erforderlich vor dem Minderjaehrigenpilot:

- freigegebene Population serverseitig bestimmen, nicht im Client;
- allgemeine Datenbeitrags-Version und Produkt-/Altersberechtigung transaktional pruefen;
- `n >= 5` erst nach allen Ausschluessen berechnen;
- nicht freigegebene Personen weder in Zaehler noch Mittelwerte einbeziehen;
- Negativtests fuer 4 freigegebene plus 1 nicht freigegebene Person sowie Guardian-Widerruf.

### P0-02: allgemeine Consent-Schreibpfade

`saveDataContributionConsent()` schreibt direkt in `profiles`. Questionnaire Intro und Konto-Einstellungen lassen jedes angemeldete Konto Ja oder Nein waehlen. Ein 15-jaehriger Nutzer kann dadurch aktuell formal dieselbe Version wie ein Erwachsener setzen.

Erforderlich:

- Produkt-Altersgruppe und Guardian-Status muessen vor einem positiven sensitiven Consent serverseitig geprueft werden;
- kein direkter Profil-Update als alleinige Autoritaet;
- getrennte, versionierte Receipts fuer Produktverarbeitung, optionalen Datenbeitrag und Evidence/Forschung;
- Widerruf muss alle nachgelagerten Populationen sofort ausschliessen.

### P0-03: aeltere Study-/Presentation-RPCs

Die Production-Pruefung zeigt, dass `get_admin_study_overview`, `get_admin_presentation_metrics`, `get_admin_nlz_evidence_dossier` und `get_nlz_evidence_dossier` die allgemeine Datenbeitrags-Einwilligung pruefen, aber nicht durchgehend `evidence_participation_eligibility`. Der neue Performance-Evidence-Pfad ist strenger als diese aelteren Auswertungen.

Erforderlich:

- gemeinsame serverseitige Eligibility-Funktion fuer alle Evaluationen und Exporte;
- keine parallelen Definitionen von „freigegeben“;
- SQL-Negativtests fuer Minderjaehrige, Widerruf, alte Consent-Version und Testkonten.

### P0-04: Rechtstext und Rechtsgrundlagen

Die App nennt bereits konkrete DSGVO-Artikel, obwohl Verantwortlichkeit, Vereinsrolle, besondere Datenkategorie und Minderjaehrigenregel noch nicht final geprueft sind. Diese Texte duerfen erst nach Fachpruefung als finale Rechtsgrundlage veroeffentlicht werden.

### P0-05: Production-Function-Grants

Die read-only Production-Pruefung vom 18. Juli zeigt zwoelf fuer `anon` ausfuehrbare `SECURITY DEFINER`-Funktionen. Interne Checks schuetzen mehrere Admin- und Team-Helper. `get_user_role(uuid)`, `has_role(uuid, app_role)` und `get_effective_today(uuid)` binden den abgefragten User im aktuellen Quelltext jedoch nicht ausreichend an den Aufrufer. Die beiden `handle_new_user*`-Funktionen sind Triggerpfade und brauchen keine direkte Client-Ausfuehrung.

Erforderlich:

- alle Function-Signaturen, Grants und RLS-Policy-Aufrufer inventarisieren;
- `anon` fuer alle nicht oeffentlich benoetigten Funktionen entziehen;
- direkte Trigger-Function-Ausfuehrung auch fuer `authenticated` entziehen;
- Self-/Admin-/Coach-Vertraege fuer ID-basierte Helper explizit machen;
- bestehende RLS-Policies vor und nach der Migration mit Positiv- und Negativtests pruefen;
- Production-Apply erst nach Review und separater Freigabe.

## 7. Priorisiertes Gap-Register

| ID | Prioritaet | Gate | Technischer Owner | Abschlussbeweis |
|---|---|---|---|---|
| G-01 | P0 | Produkt- und Evidence-Rechtsgrundlage fuer 15-Jaehrige bestaetigen | Legal/Privacy plus Product | unterschriebene, versionierte Entscheidung |
| G-02 | P0 | Altersgruppe, Guardian-Autorisierung und Jugend-Assent implementieren | App, Backend, Legal | End-to-End- und Replay-/Widerrufstests |
| G-03 | P0 | `team-mental-state` auf wirklich freigegebene Population begrenzen | Backend | SQL/Edge-Negativtests mit gemischter Gruppe |
| G-04 | P0 | alle Study-/Presentation-/Exportpfade auf ein Eligibility-Gate ziehen | Database | pgTAP/SQL-Harness fuer jede RPC |
| G-05 | P0 | Datenschutzerklaerung auf echten Code, Provider, Verantwortlichen, Anschrift und Pilotrollen abstimmen | Legal plus Product | final freigegebene Version und Code-Matrix ohne Widerspruch |
| G-06 | P0 | Aufbewahrungs- und Loeschplan fuer Tabellen, Snapshots, Logs und Backups festlegen | Privacy plus Operations | verbindliche Fristen und automatisierte Jobs |
| G-07 | technisch geschlossen | Sentry aus der App entfernen und Projekt behalten | Engineering/Product | SDK, DSN, Initialisierung und Capture-Pfad entfernt; rechtliche Altdatenpruefung bleibt separat |
| G-08 | P0 | Forschung/Evidence gegen Produktverbesserung trennen; Ethikbedarf klaeren | Study Lead plus Legal | dokumentierter Scope und gegebenenfalls Ethikvotum |
| G-09 | geschlossen | keine neuen besonderen Datenkategorien an Sentry uebermitteln | App | externer Runtime-Datenstrom technisch entfernt; statische Privacy-Invariante aktiv |
| G-10 | P1 | Datenexport-Prozess, Identitaetspruefung und SLA definieren | Operations | getesteter Betroffenen-Request |
| G-11 | P1 | Provider-Verzeichnis, DPA, Region und Transfermechanismus dokumentieren | Privacy | vollstaendiges Verzeichnis |
| G-12 | P1 | `app_event_log`, `notification_log`, Feedback und Loeschnachweis automatisch bereinigen | Database/Operations | Zeitlauf-Test und dokumentierte Ausnahmen |
| G-13 | P1 | Vite-/esbuild-Dev-Server-Advisories durch kontrolliertes Toolchain-Upgrade schliessen | Engineering | `npm audit` ohne Dev-Advisories plus kompletter CI-/iOS-Rebuild |
| G-14 | P0 | Signing, Archive, Privacy Report und echter iPhone-Test; Xcode/Simulator sind lokal gruen | Apple/Engineering | signierter Build und ausgefuellte `docs/TESTFLIGHT_DEVICE_QA_2026-07-13.md` |
| G-15 | P0 | anonyme `SECURITY DEFINER`-Grants und ID-basierte Helper haerten | Database/Security | vollstaendige Signaturmatrix, SQL-Negativtests und gepruefter Production-Advisor |

## 8. Datensparsamster Pilotweg

Der kleinste professionelle Zusatzaufwand fuer Nutzer ist ein einmaliger Gate vor der ersten sensitiven Datenerhebung:

1. Einmalige Altersgruppe `unter 16` oder `16 und aelter`; kein Geburtsdatum in der App.
2. Fuer `unter 16`: Guardian-Link oder kurzlebiger Code, kein eigener Guardian-Account.
3. Guardian sieht einen kurzen Layer und die vollstaendige Fassung, bestaetigt Identitaet/Verantwortung und den konkret versionierten Umfang.
4. Der Jugendliche bestaetigt separat in kurzer, verstaendlicher Sprache.
5. Danach keine taeglichen Consent-Prompts; nur erneute Entscheidung bei Zweck-/Versionswechsel oder Widerruf.
6. Der optionale Datenbeitrag und Evidence/Forschung bleiben getrennt vom normalen Programm und koennen ohne Programmnachteil abgelehnt werden.

Ob `16 und aelter` fuer jeden vorgesehenen Zweck ohne Guardian ausreicht, ist keine technische Annahme und muss fuer Pilotland, besondere Datenkategorie und Rechtsgrundlage bestaetigt werden.

## 9. Externe Betriebsgrenzen

- Supabase Production liegt nach Dashboard-/API-Pruefung in `eu-central-1`.
- Der aktuelle Free-Plan besitzt laut Supabase nur kurze Log-Aufbewahrung und keine verwalteten taeglichen Backups. Ein eigener verschluesselter Export-/Restore-Prozess braucht deshalb eine festgelegte Loeschfrist und einen dokumentierten Test.
- Sentry wurde am 18. Juli im echten Dashboard geprueft und gehaertet. Danach
  wurde der Dienst aus der App entfernt; das Projekt bleibt erhalten und
  historische Events laufen innerhalb von 30 Tagen aus. Details:
  `docs/SENTRY_DECOMMISSION_DECISION_2026-07-18.md`.
- Vercel-Plan, Log-Retention, Analytics-Konfiguration und DPA muessen im echten Projekt verifiziert werden.
- `npm audit --omit=dev` meldet keine Production-Dependency-Schwachstelle. Der volle Audit meldet eine moderate und eine hohe Advisory im lokalen Vite-/esbuild-Dev-Server; der von npm angebotene Fix ist ein Major-Upgrade und wird separat mit Build- und iOS-Regressionspruefung behandelt.
- Xcode 26.6, iOS SDK/Simulator 26.5, unsignierter Build sowie Installation und sichtbarer Start auf temporaerem iPhone 17 Pro Max und iPad Pro 13-inch M5 wurden lokal verifiziert. Das verifizierte Developer Team `F7A976G38N` ist inzwischen im Xcode-Projekt gesetzt; Distribution-Identitaet/Provisioning, Archive, Privacy Report, Upload und echter iPhone-Test bleiben objektiv offen.

## 10. Offizielle Ausgangsquellen

- Apple App Review Guidelines, insbesondere Datenschutz sowie Health/Research: https://developer.apple.com/app-store/review/guidelines/
- Apple Account Deletion: https://developer.apple.com/support/offering-account-deletion-in-your-app/
- DSGVO, insbesondere Art. 7, 8, 9, 12, 17 und 25: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- EDPB Statement 1/2025 on Age Assurance: https://www.edpb.europa.eu/our-work-tools/our-documents/statements/statement-12025-age-assurance_en
- Supabase Backups: https://supabase.com/docs/guides/platform/backups
- Supabase Pricing/Log Retention: https://supabase.com/pricing
- Supabase Password Security: https://supabase.com/docs/guides/auth/password-security
- Sentry GDPR Guidance: https://sentry.io/resources/gdpr/
- Sentry Data Storage Location: https://docs.sentry.io/organization/data-storage-location/
- Sentry Pricing: https://sentry.io/pricing/
- Sentry International Data Transfers: https://sentry.io/astro-assets/resources/legal/International-Data-Transfers-With-Sentry-2024-01-19.pdf

Die Quellen definieren Anforderungen und Prueffragen. Die finale Auslegung fuer RewirePerform, den Verein und 15-jaehrige Athleten bleibt eine Fachentscheidung.

Die konkret vorgeschlagenen Fristen und der Restore-Prozess stehen in `docs/RETENTION_AND_DELETION_DECISION_2026-07-15.md`.
