# App Store Release Gate - 13. Juli 2026

## Urteil

**Noch nicht einreichungsbereit.** Der Web-/Tracking-Kern ist stabiler als der native Releasepfad. Eine ehrliche App-Store-Freigabe braucht noch die roten Gates unten. Dieses Dokument trennt Code-Evidenz, lokale Maschinen-Evidenz und offene menschliche Entscheidungen.

## Gruene Gates

- Capacitor-iOS-Projekt mit Bundle-ID `com.rewireperform.app` vorhanden.
- App-Icon ist 1024 x 1024 Pixel gross und hat keinen Alpha-Kanal.
- Production-Build, Typecheck, vollstaendige Testsuite und ESLint ohne Fehler bestanden.
- 16 von 16 oeffentlichen und synthetischen Browser-Flows bestanden: Chromium sowie WebKit auf iPhone hoch/quer und iPad, jeweils inklusive Overflow- und Page-Error-Pruefung.
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
- Die Production-Migrationshistorie enthaelt jetzt exakt `20260710120000`, `20260710130000`, `20260713140500`, `20260714084351` und die Advisor-Haertung `20260714104145`. Schema-, Runtime- und Bestandspruefungen sind bestanden; die vorhandenen Account- und Tracking-Zeilenzahlen blieben unveraendert.
- `delete-account` Version 1 ist auf Production `ACTIVE`, verlangt ein JWT und entspricht dem Repository-Quelltext. CORS antwortet mit `200`, fehlende oder ungueltige Authentifizierung mit `401`.
- Der destruktive Athlet-in-Team-Test bestand am 14. Juli 2026: Function und Auth meldeten erfolgreiche Loeschung, der erneute Login scheiterte, der Bestand fiel kontrolliert von 8 auf 7 Accounts/Profile und die accountbezogene Auth-, Produkt- und Referenzpruefung ergab jeweils 0 Restzeilen. Evidenz: `docs/ACCOUNT_DELETION_PRODUCTION_VERIFICATION_2026-07-14.md`.
- Vor dem Production-Apply wurde ein verschluesselter, integritaetsgepruefter Export von 33 Public-Tabellen und 11 persistenten Auth-Tabellen erstellt. Der Schluessel liegt ausschliesslich im macOS-Schluesselbund.

## Rote Gates vor TestFlight

1. **Xcode 26 fehlt auf dem Mac.** Nur Command Line Tools sind installiert. Simulator, Device-Build, Archive, Privacy Report und Upload konnten deshalb nicht ausgefuehrt werden.
2. **Production-Zuordnung ist geklaert, Staging fehlt (`BD-01`).** Mahle hat am 14. Juli 2026 `bqsbxesmybthwtxmowfz` (`RewirePerform real`) als aktives Production-Projekt bestaetigt; die Supabase-Projektmetadaten bestaetigen Namen, Ref und gesunden Status. `towgvykgezrmkbyudjen` ist ausdruecklich stillgelegt, ein neues Staging existiert noch nicht. Site URL, iOS-Redirect-URLs und die Vercel-Env-Scope-Zuordnung muessen vor Release weiterhin im jeweiligen Dashboard geprueft werden.
3. **Account-Loeschung ist fuer den Athlet-in-Team-Pfad live bestaetigt; Restfaelle und Retention bleiben offen (`BD-04`).** Der verifizierte Test entfernte Auth-, Profil-, Teammitgliedschafts-, Programm-, Check-in- und Fragebogendaten ohne Restreferenz. Ein destruktiver Coach-Transferfall und ein Fall mit bereits erzeugtem anonymem Aggregat sind noch nicht live ausgefuehrt. Sentry-Aufbewahrung, Backup-Loeschfrist, Provider-Log-Retention, Privacy-Text und rechtliche Endpruefung bleiben vor der Store-Aussage offen.
4. **Minderjaehrigen-/Research-Consent ist offen (`BD-05`).** Die Zielgruppe umfasst Minderjaehrige und das Produkt erhebt psychologisch sensible Verlaufsdaten. Altersgrenze, Erziehungsberechtigtenprozess, Forschungsabgrenzung und Rechtsgrundlage brauchen eine bestaetigte Regel.
5. **Native Reminder sind noch nicht auf einem iPhone verifiziert.** Die lokale iOS-Implementierung und ihre Unit-Tests sind vorhanden. Berechtigungsdialog, Scheduling, Zustellung, Tap-Routing, Kalender-Resync und Abmelden muessen mit Xcode und einem echten Geraet bestaetigt werden.
6. **Echter Geraetetest fehlt.** Login, E-Mail-Bestaetigung, Session-Restore, Voice, Offline/Retry, Check-in, Journal, Kalender, Coach-Rolle und App-Neustart muessen auf mindestens einem echten iPhone geprueft werden.
7. **Store-/Rechtsmaterial ist nur als Entwurf vorhanden.** Privacy Policy, Privacy Choices URL, Support URL, Altersfreigabe, Screenshots, Beschreibung, Keywords, Review Notes und drei funktionierende Review-Konten muessen final geprueft und in App Store Connect eingetragen werden.

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

1. Die offenen BD-04-Restfaelle und Retentionsthemen abschliessen und BD-05 mit passender rechtlicher/fachlicher Pruefung schliessen.
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
