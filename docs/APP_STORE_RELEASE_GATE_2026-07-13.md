# App Store Release Gate - 13. Juli 2026

## Urteil

**Noch nicht einreichungsbereit.** Der Web-/Tracking-Kern ist stabiler als der native Releasepfad. Eine ehrliche App-Store-Freigabe braucht noch die roten Gates unten. Dieses Dokument trennt Code-Evidenz, lokale Maschinen-Evidenz und offene menschliche Entscheidungen.

## Gruene Gates

- Capacitor-iOS-Projekt mit Bundle-ID `com.rewireperform.app` vorhanden.
- App-Icon ist 1024 x 1024 Pixel gross und hat keinen Alpha-Kanal.
- Production-Build, Typecheck, 64 Tests und ESLint ohne Fehler bestanden.
- 16 von 16 oeffentlichen und synthetischen Browser-Flows bestanden: Chromium sowie WebKit auf iPhone hoch/quer und iPad, jeweils inklusive Overflow- und Page-Error-Pruefung.
- Der Production-Dependency-Audit meldet 0 bekannte Schwachstellen.
- Der Production-Release-Validator bindet den Store-Build an Supabase `bqsbxesmybthwtxmowfz`; der vollstaendige lokale Production-Build inklusive Capacitor-iOS-Sync ist bestanden.
- Staging ist separat als `towgvykgezrmkbyudjen` dokumentiert und besitzt einen eigenen Release-Validator. Der historische Lovable-Ref wird fuer neue Builds nicht mehr akzeptiert.
- Daily Check-in und Completion werden im vorgesehenen RPC atomar und idempotent gespeichert.
- Check-in, Journal und Questionnaire besitzen lokal wiederherstellbare, nutzer- und laufbezogene Entwuerfe.
- Coach-/Evidence-Tests pruefen private Datenfelder und die Aggregatgrenze ab n >= 5.
- Privacy Manifest ist als Target-Ressource eingebunden.
- Statisches Release-Gate `npm run app:verify` prueft App-ID, Bundle-ID, Berechtigungstexte, Privacy-Kategorien und Icon.
- Native lokale Erinnerungen sind fuer Check-in, Journal und Pre-Training implementiert. Die 56-Tage-Planung unterdrueckt bekannte Ruhetage und uebernimmt konkrete Wettkampf-/Trainingszeiten.
- Der vorbereitete synthetische Staging-E2E-Test prueft Athlete-/Coach-/Admin-/Outsider-Grenzen sowie Training, Ruhetag und Wettkampf. Plan-Modus ist netzwerkfrei; Ausfuehrung braucht einen expliziten Modus, einen exakten Freigabe-Token und lehnt Production immer ab. Er wurde in diesem Block nicht remote ausgefuehrt.

## Rote Gates vor TestFlight

1. **Xcode 26 fehlt auf dem Mac.** Nur Command Line Tools sind installiert. Simulator, Device-Build, Archive, Privacy Report und Upload konnten deshalb nicht ausgefuehrt werden.
2. **Production-Zuordnung ist geklaert (`BD-01`).** Mahle hat am 14. Juli 2026 `bqsbxesmybthwtxmowfz` (`RewirePerform real`) als aktives Production-Projekt bestaetigt; die Supabase-Projektmetadaten bestaetigen Namen, Ref und gesunden Status. Staging bleibt `towgvykgezrmkbyudjen`. Site URL, iOS-Redirect-URLs und die Vercel-Env-Scope-Zuordnung muessen vor Release weiterhin im jeweiligen Dashboard geprueft werden.
3. **Production-Migrationen sind offen (`BD-02`).** Der rein lesende Supabase-Vergleich zeigt auf Production nur Migrationen bis `20260627120000_nlz_evidence_tracking_v1`. Die vier lokalen Migrationen `20260710120000`, `20260710130000`, `20260713140500` und `20260714084351` fehlen. Der aktuelle Code setzt Teile dieser Tracking-, Evidence- und Account-Loeschungsstruktur voraus. Es wurde bewusst keine Remote-Migration ausgefuehrt.
4. **Zwei Remote-SQL-Functions sind fehlerhaft.** Der read-only Lint auf Staging bestaetigt Fehler in `get_team_stats` (`date >= text`) und `get_admin_nlz_evidence_dossier` (mehrdeutige `cohort_id`-Referenz). Eine additive Reparaturmigration samt Dry-Run und Rollback-Plan liegt lokal vor, wurde aber weder auf Staging noch Production ausgefuehrt. Echte PostgreSQL-Ausfuehrung, Post-Checks und Typgenerierung bleiben vor einer Evidenzfreigabe Pflicht.
5. **Account-Loeschung ist lokal gebaut, remote aber noch offen (`BD-04`).** Self-Service-UI, Reauthentifizierung, Teamtransfer, Edge Function, Loeschmigration und automatisierte Tests liegen im Draft-PR vor. Auf `RewirePerform real` sind weder `delete-account` noch die Migration aktiv. Die Organisation nutzt den Free-Plan; am 14. Juli 2026 meldete die CLI kein PITR und keine verfuegbaren Plattform-Backups. Vor Live-Aktivierung sind deshalb ein verifizierbarer Backup-/Restore-Pfad, ein vollstaendiger Nicht-Production-Loeschtest und die rechtliche Endpruefung Pflicht.
6. **Minderjaehrigen-/Research-Consent ist offen (`BD-05`).** Die Zielgruppe umfasst Minderjaehrige und das Produkt erhebt psychologisch sensible Verlaufsdaten. Altersgrenze, Erziehungsberechtigtenprozess, Forschungsabgrenzung und Rechtsgrundlage brauchen eine bestaetigte Regel.
7. **Native Reminder sind noch nicht auf einem iPhone verifiziert.** Die lokale iOS-Implementierung und ihre Unit-Tests sind vorhanden. Berechtigungsdialog, Scheduling, Zustellung, Tap-Routing, Kalender-Resync und Abmelden muessen mit Xcode und einem echten Geraet bestaetigt werden.
8. **Echter Geraetetest fehlt.** Login, E-Mail-Bestaetigung, Session-Restore, Voice, Offline/Retry, Check-in, Journal, Kalender, Coach-Rolle und App-Neustart muessen auf mindestens einem echten iPhone geprueft werden.
9. **Store-/Rechtsmaterial ist nur als Entwurf vorhanden.** Privacy Policy, Privacy Choices URL, Support URL, Altersfreigabe, Screenshots, Beschreibung, Keywords, Review Notes und drei funktionierende Review-Konten muessen final geprueft und in App Store Connect eingetragen werden.

## Gelbe Qualitaetsreste

- ESLint endet mit 0 Fehlern und 16 bereits vorhandenen Warnungen. Darunter sind Hook-Dependency-Warnungen in Auth-, Dashboard-, Coach- und Admin-Pfaden; sie brauchen vor der finalen Submission eine eigene Laufzeit-Triage, weil die authentifizierten Rollenfluesse lokal noch nicht vollstaendig getestet werden konnten.
- `npm audit --omit=dev` meldet 0 Schwachstellen. Der vollstaendige Audit meldet weiterhin zwei Dev-Tooling-Befunde ueber das alte Vite/esbuild-Setup. Der angebotene Fix erzwingt ein Major-Upgrade auf Vite 8 und sollte separat mit vollstaendiger Build-/PWA-Kompatibilitaetspruefung erfolgen; die betroffenen Pakete werden nicht in das App-Bundle ausgeliefert.
- Check-in und Journal sichern Entwuerfe lokal und behalten sie bei fehlgeschlagenem Server-Speichern. Eine automatische Offline-Synchronisation mit Supabase existiert nicht; der Nutzer muss nach stabiler Verbindung erneut speichern.

## Privacy-Label-Basis

Als mit dem Account verknuepft behandeln:

- Name, E-Mail und User-ID
- Health-Daten: Mood, Stress, Recovery, Schlaf/Readiness und Assessment-Angaben
- Fitness-Daten: Trainingsplan und Wettkampfkontext
- User Content: Journal, Reflexion, Fragebogenfreitext und Feedback
- Product Interaction: Programmfortschritt, Completion, Check-in- und Notification-Status
- Diagnostics: gefilterte Sentry-Fehler und incident-only Systemevents

Nicht als Apple-`Tracking` deklarieren, solange keine Daten mit Drittanbieter-Daten fuer Werbung/Werbemessung verknuepft oder an Datenbroker gegeben werden.

## Tracking-Evidenzgrenze bei iOS-Erinnerungen

- Der wissenschaftlich relevante Check-in-/Journal-/Completion-Pfad bleibt serverseitig und unveraendert.
- Web-Push besitzt weiterhin `notification_log` fuer Sendung, Oeffnung und Fehler.
- Lokale iOS-Erinnerungen werden auf dem Geraet geplant. Ohne APNs-/Backend-Erweiterung beweist `notification_log` deshalb weder ihre Zustellung noch ihre Oeffnung.
- Diese Luecke betrifft Reminder-Operationsdaten, nicht die atomare Speicherung der eigentlichen Tagesdaten. Sie darf in Evidence- oder Club-Unterlagen trotzdem nicht als gemessene Zustellung dargestellt werden.

## Verbindlicher Einreichungsweg

1. Blocking Decisions mit Mahle und bei BD-04/BD-05 mit passender rechtlicher/fachlicher Pruefung schliessen.
2. Xcode 26 installieren, Developer Team setzen und `npm run app:build` ausfuehren.
3. Xcode Privacy Report erzeugen und gegen Manifest sowie App Store Connect abgleichen.
4. Debug-Build im Simulator und Release-Build auf echtem iPhone testen.
5. Native Reminder auf Trainings-, Wettkampf- und Ruhetagen inklusive Abmelden und Kalenderaenderung testen.
6. Interne TestFlight-Gruppe mit synthetischen Athlete-/Coach-/Admin-Konten pruefen.
7. Mehrtaegigen Tracking-Zeitlauf und Production-Readiness-Checks abschliessen.
8. Erst danach Archive hochladen und mit vollstaendigen Review Notes einreichen.

## Offizielle Apple-Quellen

- https://developer.apple.com/app-store/submitting/
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/support/offering-account-deletion-in-your-app/
- https://developer.apple.com/app-store/app-privacy-details/
- https://developer.apple.com/support/third-party-SDK-requirements/
- https://developer.apple.com/documentation/bundleresources/privacy-manifest-files
