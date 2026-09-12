# App Store Release Gate - Stand 18. Juli 2026

> Historical snapshot. Superseded by
> `docs/APP_STORE_RC1_STATUS_2026-07-23.md`. Do not use the red/green status in
> this document for current release decisions.

Technischer Nachtrag 20. Juli 2026: Fuer die Supabase-Grant-Haertung, den
serverseitigen Team-Aggregatpfad und atomare Progress-Snapshots existiert jetzt
ein lokal getesteter Integrationskandidat. Production wurde nicht veraendert.
Details: `docs/TRACKING_EVIDENCE_HARDENING_2026-07-20.md`.

## Urteil

**Noch nicht einreichungsbereit.** Web-/Tracking-Kern, E-Mail-Flows und nativer Releasepfad sind lokal belastbar; das verifizierte Apple-Team ist im Xcode-Projekt gesetzt. Distribution-Identitaet/Provisioning, signiertes Archive, echter Geraetetest, Privacy Report, Production-Aktivierung und -Nachpruefung der Supabase-Grant-Haertung sowie Produkt-/Rechtsentscheidungen bleiben offen. Dieses Dokument trennt Code-Evidenz, lokale Maschinen-Evidenz und offene menschliche Entscheidungen.

## Gruene Gates

- Capacitor-iOS-Projekt mit Bundle-ID `com.rewireperform.app` vorhanden.
- App-Icon ist 1024 x 1024 Pixel gross und hat keinen Alpha-Kanal.
- Production-Build, Typecheck, vollstaendige Testsuite und ESLint ohne Fehler bestanden.
- 41 oeffentliche, synthetische, Auth-, E-Mail-, Offline- und Evidence-Browser-Flows bestanden: Chromium sowie WebKit auf iPhone hoch/quer und iPad hoch/quer, jeweils inklusive Overflow- und Page-Error-Pruefung. Vier Service-Worker-Varianten werden auf WebKit bewusst uebersprungen; der echte Offlinefall wird in Chromium geprueft.
- Der Production-Dependency-Audit meldet 0 bekannte Schwachstellen.
- Der Production-Release-Validator bindet den Store-Build an Supabase `bqsbxesmybthwtxmowfz`; der vollstaendige lokale Production-Build inklusive Capacitor-iOS-Sync ist bestanden.
- Es existiert derzeit kein freigegebenes Staging-Projekt. Die beiden stillgelegten Refs `towgvykgezrmkbyudjen` und `twceqincrbrenyuqukpj` werden fuer neue Builds nicht akzeptiert.
- Daily Check-in und Completion werden im vorgesehenen RPC atomar und idempotent gespeichert.
- Check-in, Journal und Questionnaire besitzen lokal wiederherstellbare, nutzer- und laufbezogene Entwuerfe.
- Coach-/Evidence-Tests pruefen private Datenfelder und die Aggregatgrenze ab n >= 5.
- Privacy Manifest ist als Target-Ressource eingebunden.
- Statisches Release-Gate `npm run app:verify` prueft App-ID, Bundle-ID, Berechtigungstexte, Privacy-Kategorien und Icon.
- Native lokale Erinnerungen sind fuer Check-in, Journal und Pre-Training implementiert. Die 56-Tage-Planung unterdrueckt bekannte Ruhetage und uebernimmt konkrete Wettkampf-/Trainingszeiten.
- Der synthetische E2E-Testplan prueft Athlete-/Coach-/Admin-/Outsider-Grenzen sowie Training, Ruhetag und Wettkampf. Sein Plan-Modus bleibt netzwerkfrei; Remote-Ausfuehrung ist technisch gesperrt, bis ein neues Staging-Projekt explizit freigegeben und eingebunden ist.
- Die Production-Migrationshistorie enthaelt die Tracking-, Account-Loesch-, Advisor-, Performance-Evidence- und Index-Migrationen sowie `20260717091518_qa_evidence_parity_gate`. Schema-, Runtime- und Bestandspruefungen sind bestanden; bestehende Account- und Trackingdaten wurden durch den Evidence-Apply nicht veraendert.
- `delete-account` Version 1 ist auf Production `ACTIVE`, verlangt ein JWT und entspricht dem Repository-Quelltext. CORS antwortet mit `200`, fehlende oder ungueltige Authentifizierung mit `401`.
- Der destruktive Athlet-in-Team-Test bestand am 14. Juli 2026: Function und Auth meldeten erfolgreiche Loeschung, der erneute Login scheiterte, der Bestand fiel kontrolliert von 8 auf 7 Accounts/Profile und die accountbezogene Auth-, Produkt- und Referenzpruefung ergab jeweils 0 Restzeilen. Evidenz: `docs/ACCOUNT_DELETION_PRODUCTION_VERIFICATION_2026-07-14.md`.
- Vor dem Production-Apply wurde ein verschluesselter, integritaetsgepruefter Export von 33 Public-Tabellen und 11 persistenten Auth-Tabellen erstellt. Der Schluessel liegt ausschliesslich im macOS-Schluesselbund.
- Der integrierte 56-Tage-Evidence-Stand besteht Production-Build, 191 Unit-/Vertragstests, lokale PostgreSQL-Verhaltenspruefung inklusive QA-Paritaetsgate, 41 bestandene Browserfluesse und den Capacitor-iOS-Sync mit eingebettetem Production-Ziel.
- Die Live-Routen `https://rewireperform.com`, `/privacy` und `/support` rendern auf Desktop und Mobile per HTTPS ohne Page Error oder horizontalen Overflow; die Support-Mailadresse ist verlinkt.
- Xcode 26.6, iOS SDK 26.5 und die iOS-26.5-Simulator-Runtime sind installiert. Maschinen-Preflight, universeller unsignierter Simulator-Build sowie Installation, stabilisierte Screenshots und sichtbarer Start auf temporaerem iPhone 17 Pro Max und iPad Pro 13-inch sind bestanden.
- Auth-Sessions sind gegen verspätete Rollen-/Teststatusantworten eines vorherigen Accounts gehaertet; Wechsel- und Abmelde-Races sind automatisiert getestet.
- Der Web-Service-Worker speichert nur die statische datenfreie Offline-Fallback-Seite. Ein echter Offline-Navigationstest besteht, waehrend App-Chunks weiterhin bewusst nicht vorab gecacht werden.
- E-Mail-Bestaetigung, Passwort-Recovery und die begrenzten wesentlichen Transaktionsmails sind in Main integriert und in der Browsermatrix abgedeckt.

## Rote Gates vor TestFlight

1. **Supabase-Function-Grants muessen auf Production gehaertet und danach erneut geprueft werden.** Die read-only Production-Pruefung vom 18. Juli fand 12 fuer `anon` ausfuehrbare `SECURITY DEFINER`-Funktionen. Der lokale Kandidat `20260720080000_harden_tracking_runtime_permissions_and_snapshots.sql` entzieht die unnoetigen Grants, bindet ID-basierte Helper an Self/Admin und besteht SQL-Negativtests. Migration, vollstaendige Signaturmatrix und Security-Advisor-Nachpruefung auf Production bleiben separat freigabepflichtig.
2. **Apple-Signing ist konfiguriert, aber noch nicht Ende-zu-Ende verifiziert.** Xcode 26.6, iOS SDK/Simulator 26.5, unsignierter Build und Simulator-Start sind gruen. Das verifizierte Team `F7A976G38N` ist im Xcode-Projekt gesetzt. Eine gueltige Distribution-Identitaet samt Provisioning, signierter Device-Build, Archive, Privacy Report und Upload wurden noch nicht nachgewiesen.
3. **Production-Zuordnung ist geklaert, Staging fehlt (`BD-01`).** Mahle hat am 14. Juli 2026 `bqsbxesmybthwtxmowfz` (`RewirePerform real`) als aktives Production-Projekt bestaetigt; die Supabase-Projektmetadaten bestaetigen Namen, Ref und gesunden Status. `towgvykgezrmkbyudjen` ist ausdruecklich stillgelegt, ein neues Staging existiert noch nicht. Site URL, iOS-Redirect-URLs und die Vercel-Env-Scope-Zuordnung muessen vor Release weiterhin im jeweiligen Dashboard geprueft werden.
4. **Account-Loeschung ist fuer den Athlet-in-Team-Pfad live bestaetigt; Restfaelle und Retention bleiben offen (`BD-04`).** Der verifizierte Test entfernte Auth-, Profil-, Teammitgliedschafts-, Programm-, Check-in- und Fragebogendaten ohne Restreferenz. Ein destruktiver Coach-Transferfall und ein Fall mit bereits erzeugtem anonymem Aggregat sind noch nicht live ausgefuehrt. Sentry ist spaeter aus dem App-Kandidaten entfernt worden; Backup-Loeschfrist, Provider-Log-Retention, Privacy-Text und rechtliche Endpruefung bleiben vor der Store-Aussage offen.
5. **Minderjaehrigen-/Research-Consent bleibt als Fach- und Rechtsgate offen (`BD-05`).** Main enthaelt einen versionierten Guardian-/Assent-Flow und ein technisch aktiviertes V2-Evidence-Protokoll. Mahle hat am 20. Juli produktseitig entschieden, dass Minderjaehrige nur bei aktuellem freiwilligem Datenbeitrag und vollstaendiger altersgerechter Autorisierung in Evidence einfliessen duerfen. Rechtsgrundlage, Widerruf bereits gesperrter Data Locks und externe fachlich-rechtliche Pruefung bleiben vor einem realen Minderjaehrigenpilot offen.
6. **Native Reminder sind noch nicht auf einem iPhone verifiziert.** Die lokale iOS-Implementierung und ihre Unit-Tests sind vorhanden. Berechtigungsdialog, Scheduling, Zustellung, Tap-Routing, Kalender-Resync und Abmelden muessen mit Xcode und einem echten Geraet bestaetigt werden.
7. **Echter Geraetetest fehlt.** Login, E-Mail-Bestaetigung, Session-Restore, Voice, Offline/Retry, Check-in, Journal, Kalender, Coach-Rolle und App-Neustart muessen auf mindestens einem echten iPhone geprueft werden.
8. **Store-/Rechtsmaterial ist nur als Entwurf vorhanden.** Privacy- und Support-URL sind technisch live, aber Privacy Policy, Privacy Choices URL, Verantwortlicher/Anschrift, Altersfreigabe, Screenshots, Beschreibung, Keywords, Review Notes und drei funktionierende Review-Konten muessen final geprueft und in App Store Connect eingetragen werden.

## Gelbe Qualitaetsreste

- ESLint endet mit 0 Fehlern und 15 Warnungen. Die Auth-Session-Warnung wurde durch stabile Callbacks und Race-Tests geschlossen. Verbleibende Hook-Warnungen in Dashboard-, Coach-, Team- und Admin-Ladeeffekten wurden geprueft; blindes Hinzufuegen der Funktionsreferenzen wuerde erneute Abfragen oder Schleifen erzeugen. Fast-Refresh-Warnungen betreffen lokale Entwicklungsstruktur, nicht das Release-Bundle.
- `npm audit --omit=dev` meldet 0 Schwachstellen. Der vollstaendige Audit meldet weiterhin zwei Dev-Tooling-Befunde ueber das alte Vite/esbuild-Setup. Der angebotene Fix erzwingt ein Major-Upgrade auf Vite 8 und sollte separat mit vollstaendiger Build-/PWA-Kompatibilitaetspruefung erfolgen; die betroffenen Pakete werden nicht in das App-Bundle ausgeliefert.
- Check-in und Journal sichern Entwuerfe lokal und behalten sie bei fehlgeschlagenem Server-Speichern. Die statische Web-Offline-Seite ist jetzt reproduzierbar verfuegbar. Eine automatische Offline-Synchronisation mit Supabase existiert weiterhin nicht; der Nutzer muss nach stabiler Verbindung erneut speichern.

## Separates Gate vor einem Evidence-Pilot

- Die Migration `20260714224000_performance_evidence_56d_v1.sql`, die Index-Haertung `20260715085749_performance_evidence_fk_indexes.sql` und `20260717091518_qa_evidence_parity_gate.sql` sind auf Production angewendet; lokale und entfernte Migrationshistorie stimmen ueberein.
- Tabellenzugriff, RPC-Rechte, fester `search_path`, Protokoll und Mindestgruppengroesse wurden fuer den bisherigen Production-Stand geprueft. Der neue lokale Kandidat bindet Minderjaehrigen-Evidence an die aktuellen Guardian-/Assent-Receipts, ist aber noch nicht auf Production angewendet oder dort nachgeprueft.
- Vor einem realen Pilot bleiben ein kontrollierter End-to-End-Test mit eindeutigem Erwachsenen-Testaccount, ein Coach-Testlauf und die reale iPhone-Pruefung Pflicht. Fuer Minderjaehrige ist zusaetzlich die fachliche und rechtliche Freigabe des bereits implementierten Guardian-/Assent-Gates erforderlich.
- Das lokale QA-Paritaetsgate weist 16 von 16 vorgesehenen Messzeitpunkten, 5 von 5 synthetischen QA-Athleten, 8 von 8 Coach-Wochen und den Ausschluss der QA-Daten aus Production-Auswertungen nach. Das ist Testevidenz, kein Wirksamkeitsnachweis.

## Privacy-Label-Basis

Als mit dem Account verknuepft behandeln:

- Name, E-Mail und User-ID
- Health-Daten: Mood, Stress, Recovery, Schlaf/Readiness und Assessment-Angaben
- Fitness-Daten: Trainingsplan und Wettkampfkontext
- User Content: Journal, Reflexion, Fragebogenfreitext und Feedback
- Product Interaction: Programmfortschritt, Completion, Check-in- und Notification-Status
- Diagnostics: incident-only Systemevents mit normalisierten Fehlercodes und begrenzten technischen Metadaten

Nicht als Apple-`Tracking` deklarieren, solange keine Daten mit Drittanbieter-Daten fuer Werbung/Werbemessung verknuepft oder an Datenbroker gegeben werden.

## Tracking-Evidenzgrenze bei iOS-Erinnerungen

- Der wissenschaftlich relevante Check-in-/Journal-/Completion-Pfad bleibt serverseitig und unveraendert.
- Web-Push besitzt weiterhin `notification_log` fuer Sendung, Oeffnung und Fehler.
- Lokale iOS-Erinnerungen werden auf dem Geraet geplant. Ohne APNs-/Backend-Erweiterung beweist `notification_log` deshalb weder ihre Zustellung noch ihre Oeffnung.
- Diese Luecke betrifft Reminder-Operationsdaten, nicht die atomare Speicherung der eigentlichen Tagesdaten. Sie darf in Evidence- oder Club-Unterlagen trotzdem nicht als gemessene Zustellung dargestellt werden.

## Verbindlicher Einreichungsweg

1. Supabase-Function-Grants lokal haerten und mit RLS-/RPC-Negativtests verifizieren; Production-Apply separat freigeben.
2. Die offenen BD-04-Restfaelle und Retentionsthemen abschliessen und BD-05 mit passender rechtlicher/fachlicher Pruefung schliessen.
3. Gueltige Distribution-Identitaet und Provisioning fuer das bereits gesetzte Developer Team installieren beziehungsweise verifizieren.
4. `npm run app:build`, `npm run app:verify:xcode:build` und `npm run app:verify:simulator` fuer den finalen Kandidaten wiederholen.
5. Signiertes Archive und Xcode Privacy Report erzeugen und gegen Manifest sowie App Store Connect abgleichen.
6. Release-Build auf echtem iPhone testen; native Reminder auf Trainings-, Wettkampf- und Ruhetagen inklusive Abmelden und Kalenderaenderung pruefen.
7. Interne TestFlight-Gruppe mit synthetischen Athlete-/Coach-/Admin-Konten pruefen.
8. Mehrtaegigen Tracking-Zeitlauf und Production-Readiness-Checks abschliessen.
9. Erst danach Archive hochladen und mit vollstaendigen Review Notes einreichen.

## Offizielle Apple-Quellen

- https://developer.apple.com/app-store/submitting/
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/support/offering-account-deletion-in-your-app/
- https://developer.apple.com/app-store/app-privacy-details/
- https://developer.apple.com/support/third-party-SDK-requirements/
- https://developer.apple.com/documentation/bundleresources/privacy-manifest-files
- https://developer.apple.com/help/app-store-connect/release-notes/
