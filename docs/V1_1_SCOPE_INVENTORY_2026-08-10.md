# RewirePerform 1.1 – verbindliches Umfangs- und Readiness-Inventar

Stand: 13. August 2026

Exakt getesteter lokaler Code- und Buildstand: `74fd4ee`

## Ziel B

Eine pilotfähige iOS-Version 1.1 mit einem verständlichen Einstieg für Athleten
und Coaches, dem echten finalen 56-Tage-System, sicheren Feedback- und
Minderjährigenwegen, professionellen Team-/Coach-Verbindungen, einer aktuellen
öffentlichen Website und einem kontrollierten internen Jarvis-Auswertungspfad.

## 1. Im V1.1-Releasekandidaten enthalten und lokal beziehungsweise physisch getestet

### Einstieg und Rollen

- Öffentliche Rollenwahl **Athlet** oder **Coach** vor der Anmeldung.
- Der Athletenweg zeigt den freigegebenen zehnteiligen Athleten-Flug und führt
  danach zu Solo-Registrierung oder Athleten-Teambeitritt.
- Der Coachweg zeigt einen eigenen zehnteiligen, wahrheitsgetreuen Coach-Flug.
- Bestehende Coaches gelangen zum Login; ein neuer Team-/Organisationsstart
  führt zur persönlichen Anfrage; ein Co-Coach-Beitritt erfolgt ausschließlich
  über eine persönliche, E-Mail-gebundene Einladung.
- Die visuelle Rollenwahl vergibt keine technische Rolle. Rollen und Zugriffe
  bleiben serverseitig geprüft.
- Der vollständige neue Rollen-/Coach-Einstieg wurde auf dem iPhone vom Product
  Owner physisch als vollständig grün freigegeben.

### Athletenprogramm

- Der finale 56-Tage-Inhalt läuft im echten Daily-Flow-Pfad.
- Der tägliche Team-Puls mit zehn Fragen bleibt vorgelagert und unverändert.
- Training, Wettkampf und Ruhetag werden deterministisch aus dem realen
  Tageskontext aufgelöst.
- Ein klarer Tagesanker und eine Mission statt künstlich aufgeblähter Aufgaben.
- Pre-Training mit aktivem Erinnern vor dem sichtbaren Satz des Tages.
- Kontext- und tagspezifisches privates Journal; Dankbarkeit, optionale private
  Reflexion, VoiceInput, Draft, Persistenz und Retry bleiben erhalten.
- Rest Days: zwei Minuten ruhige 4/6-Atmung, danach drei klare
  Visualisierungsschritte, dezenter Ton, optionale Haptik, Wake-Lock-Fallback,
  Pflichtdurchlauf und anschließende Rückkehr zum Dashboard.
- Keine zusätzliche Verständnisfrage direkt nach der Visualisierung.

### Feedback, Minderjährige und Datenschutzarchitektur

- Strukturierte Feedback-Checkpoints an Tag 10, 24, 39 und 55.
- Pro Checkpoint zwei organisch eingeordnete Fragen zur Ruhetag-Visualisierung,
  mit progressiver Tiefe und der nicht bewerteten Option „Noch nicht genutzt“.
- Sichtbare Terminologie einheitlich **Visualisierung**.
- Feedback-Consent, Widerruf, Löschung und Under-16-Guardian-Scope sind
  fail-closed implementiert und getestet.
- 13- bis 15-Jährige verwenden den bestehenden Unter-16-Guardian-Weg;
  16- bis 17-Jährige entscheiden im vorgesehenen eigenen Flow.
- Coaches sehen keine Journaltexte, privaten Reflexionen, Rohkommentare oder
  individuellen psychologischen Werte.
- Teamaggregate bleiben unter fünf Antworten unterdrückt.

### Teams, Organisationen, Admin und Verbindungen

- Kurze Anfrage für ein einzelnes Team und ausführlichere Anfrage für Verein
  oder Organisation sind getrennt.
- Keine automatische Coach-Rolle, Teamfreigabe, Preis- oder Vertragsentscheidung.
- Co-Coach-Einladungen sind einmalig, sieben Tage gültig und an die bestätigte
  E-Mail-Adresse gebunden.
- Aktive Teamverwaltung ist auf Admins oder aktive Lead-Coach-Mitgliedschaften
  begrenzt; bestehende legitime Coach-Zugriffe wurden migriert.
- Founder Command Center priorisiert Anfragen, Teams und operative Freigaben;
  tiefe Daten und Exporte bleiben nachgeordnet verfügbar.
- Professionelle, getrennte Athleten- und Coach-Share-Texte und Social Previews.
- Web-Fallback, App-Store-Banner und iOS-Universal-Link-Verträge einschließlich
  persönlicher Coach-Einladung sind im Kandidaten enthalten.

### Website und öffentliche Darstellung

- Website-Wissenschaftssektion in der freigegebenen Richtung
  „Wissenschaftliche Prinzipien. Praktisch übersetzt.“
- Veraltete oder zu absolute Aussagen zu Gehirnumbau, garantierter Wirkung und
  vollständiger Individualisierung wurden entfernt.
- Demo zeigt den tatsächlichen V1.1-Ablauf und keine erfundenen
  psychologischen Wirkungswerte.
- Öffentlicher Kernbegriff **Neurokognitives Performance-System** bleibt als
  Produktpositionierung erhalten, ohne daraus eine bewiesene Wirkung abzuleiten.

## 2. Fertig gebaut und getestet, aber vor dem V1.1-Release noch bewusst geschlossen

Diese Punkte gehören zum Zielumfang von V1.1, sind aber noch nicht live:

- Feedback-Feature-Flag im finalen Production-Build.
- Production-Migrationen für Feedback, Consent/Guardian, Transfer-Pulse,
  Organisationen, Rollen und Aufbewahrung.
- Production-Edge-Functions und deren exakte Secrets/Origins.
- Öffentliche Production-Annahme von Team- und Organisationsanfragen.
- Realer Jarvis-Lesezugang. Semantik, minimierter Export und Gateway sind lokal
  bytegenau akzeptiert; Credentials und echte Reads bleiben getrennte Gates.
- Optionale Feedback-Kommentare, bis Consent-, Guardian-, Privacy- und
  Jarvis-Kombination auf dem finalen Production-Stand erneut bestätigt ist.
- Aktuelle Website, Social Previews, Smart-App-Banner und neue AASA-Pfade,
  solange der V1.1-Webstand noch nicht nach Production deployt wurde.
- App-Store-Privacy-Angaben, Review Notes und „Neu in dieser Version“ bis zum
  final festgelegten realen Aktivierungsumfang.
- Finaler signierter iOS-Releasebuild, TestFlight und V1.1-Einreichung.

## 3. Bewusst nicht Teil von iOS V1.1

Diese Ideen sind nicht vergessen, sondern absichtlich spätere Produktarbeit:

- Google-Play-Veröffentlichung; sie läuft als eigener Android-Releaseblock.
- Bezahlpläne, In-App-Käufe, Basic/Club/Enterprise-Tariflogik und automatische
  Preis- oder Vertragsentscheidung.
- Tiefe Vereinsindividualisierung mit Farben, eigener Sprache und vollständig
  organisationsspezifischen Inhalten.
- Wearables wie Whoop, Fitbit oder Apple Health und ein eigener Readiness Score.
- Vollautomatische Leistungs-, Startelf-, Talent- oder Karriereempfehlungen.
- Behauptung oder Nachweis einer kausalen sportlichen Leistungswirkung; dieser
  benötigt echte Pilotdaten und ein eigenes wissenschaftliches Design.
- Externe KI-Anbieter für Athletenfeedback. Der geplante V1.1-Pfad ist der
  kontrollierte interne Jarvis-Pfad.
- Eine vollständige Neuentwicklung jedes Coach-/Admin-Analysebildschirms über
  das bereits integrierte Command Center und die realen Coach-Funktionen hinaus.

## Aktuelle Differenz Delta

1. Den vorbereiteten Production-Rollback-Dry-run exakt einmal mit dem erst bei
   Ausführung eingegebenen Production-Datenbankpasswort durchführen. Der Lauf
   verwendet eine echte Transaktion und endet mit `ROLLBACK`; er darf nichts
   dauerhaft anwenden und besitzt keinen Retry.
2. Nur nach grünem Rollback-Nachweis, aktuellem Backup-/Recovery-Nachweis und
   eigener Freigabe die 25 gepinnten Production-Migrationsschritte über den
   kontrollierten Apply-Operator anwenden. Ein pauschales `supabase db push`
   bleibt verboten.
3. Danach ausschließlich die wirklich benötigten Edge Functions, Origins,
   Feature- und Datengates sequenziert aktivieren und jeden Pfad negativ sowie
   positiv prüfen. Jarvis-Production-Credential und echter Datenread bleiben
   davon getrennte Gates.
4. Den dann real aktivierten Datenweg endgültig mit Datenschutzerklärung,
   App-Store-Datentypen und Review Notes abgleichen sowie die qualifizierte
   DE-Rechts-/Privacy-/Minor-Prüfung des Consent-/Guardian-Umfangs festhalten.
5. Exakten finalen RC erneut bauen und die release-relevanten Wege physisch auf
   iPhone und – solange iPad unterstützt wird – iPad prüfen.
6. Erst danach PR, Merge, Website-Production, TestFlight und
   V1.1-App-Store-Einreichung.

Bereits geschlossen sind die Feedback-v1.1.2-Registrymigration auf Staging,
der nachgelagerte metadata-only Postdeploy-Audit und dessen unabhängige
Jarvis-v0.3.3-Abnahme. Ebenso abgeschlossen ist ein positiver synthetischer
Organisationsanfrage-Smoke mit echtem Turnstile, vollständiger Bereinigung und
erneut geschlossenem Staging-Gate. Der anschließend erzeugte credentiallose
Presence-only-Preflight belegt zusätzlich fünf abwesende Gateway-Secrets,
`PASSWORD NULL` für die Reader-Rolle und vollständig geschlossene
Credential-/Read-/Minor-/Guardian-/Production-Gates; Jarvis hat ihn unabhängig
akzeptiert.

Der danach separat freigegebene synthetische Jarvis-One-Shot ist ebenfalls
abgeschlossen: exakt ein HTTP-200-Request mit 825 Items und 55 Fragen, kein
Retry und keine persistierte Rohresponse. Alle temporären Secrets, Reader-
Credentials, Keychain-Einträge und synthetischen Fixtures wurden anschließend
entfernt; sämtliche Gates sind wieder geschlossen. Jarvis hat das vollständige
Postread-Paket unabhängig mit 21 von 21 Dateien und 1.472 von 1.472 Tests
akzeptiert. Dieser Nachweis autorisiert keine echten Daten oder Production.

Der ausdrücklich freigegebene, aber noch nicht aktivierte Production-Umfang
steht in
`docs/V1_1_PRODUCTION_DATA_ACTIVATION_DECISION_2026-08-11.md`.

Der dafür getrennte Production-Gateway ist lokal vorbereitet: eigener
Production-Endpoint, eigene Reader-Rolle, eigene Secret-Namen und getrennte
Machine-/Real-Data-Gates. Rolle und Gates bleiben credentiallos und
geschlossen; es gab keine Migration, keinen Deploy und keinen echten Read.

### Aktueller Production- und Native-Nachweis

Der Production-Migrationsvertrag wurde an den belegten Hosted-Supabase-
PostgreSQL-17-Rollenvertrag angepasst, ohne historische Migrationsdateien zu
verändern. Der Rollback-Operator prüft vor dem Verbindungsaufbau alle
Quell-Hashes und die exakte Remote-Historie, verwendet eine direkte
TLS-verifizierte Session, genau einen Query-Versuch und eine nachgelagerte
frische Audit-Session. Der persistente Apply-Operator ist separat vorbereitet,
bleibt aber durch vier explizite Gates geschlossen: Apply-Freigabe,
Credential-Freigabe, grüner Rollback-Nachweis und aktueller
Backup-/Recovery-Nachweis. Die synthetische Staging-Gate-Migration wird in
Production nie ausgeführt, sondern ausschließlich als nicht ausgeführter
History-Schritt behandelt.

Die zentrale Release-Wahrheit bestätigt inzwischen Feedback-Semantik v0.3.3,
den aktuellen Gateway, das metadata-only Staging-Postdeploy, den
credentiallosen Preflight und genau einen bereinigten synthetischen One-Shot.
Sie bestätigt ausdrücklich keinen echten oder Production-Datenread.

Auf `74fd4ee` lief der vollständige native Production-Build am 13. August grün:
151 von 151 Testdateien und 854 von 854 Tests, sämtliche SQL-, Privacy-,
Minor-, Guardian-, Security- und App-Store-Gates, Production-Webbuild,
Production-Target `bqsbxesmybthwtxmowfz`, Capacitor-iOS-Sync und eingebettetes
iOS-Production-Ziel. `npm audit --omit=dev` meldet null Befunde. Der Build ist
ein lokaler technischer Nachweis; finaler signierter Build, letzter physischer
Gerätetest und Live-Aktivierung bleiben offen.

## No-False-Green-Regel

„Im Code enthalten“ bedeutet nicht automatisch „in Production aktiv“.
„Staging-verifiziert“ bedeutet nicht „mit echten Pilotdaten bewiesen“.
„App-Store-ready“ wird erst gesetzt, wenn Code, aktivierter Datenweg,
Datenschutzangaben, finaler Native-Build und physischer Gerätetest denselben
exakten Release-Stand belegen.
