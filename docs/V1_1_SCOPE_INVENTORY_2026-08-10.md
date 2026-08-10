# RewirePerform 1.1 – verbindliches Umfangs- und Readiness-Inventar

Stand: 10. August 2026

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

1. Frische Staging-Postdeploy-Evidence für Feedback v1.1.2 finalisieren und
   unabhängig durch Jarvis akzeptieren lassen.
2. Exakt einen synthetischen Jarvis-One-Shot mit temporären Staging-Credentials
   durchführen, vollständig bereinigen und erneut auditieren.
3. Den tatsächlich zu aktivierenden Production-Datenumfang festschreiben und
   Datenschutzseite, App-Store-Datentypen und Review Notes exakt daran binden.
4. Production-Migrationen und Edge-Functions einzeln kontrolliert aktivieren;
   kein pauschales Datenbank-Push.
5. Finalen RC erneut bauen und die release-relevanten Wege physisch auf iPhone
   und – solange iPad unterstützt wird – iPad prüfen.
6. Erst danach PR, Merge, Website-Production, TestFlight und V1.1-Einreichung.

## No-False-Green-Regel

„Im Code enthalten“ bedeutet nicht automatisch „in Production aktiv“.
„Staging-verifiziert“ bedeutet nicht „mit echten Pilotdaten bewiesen“.
„App-Store-ready“ wird erst gesetzt, wenn Code, aktivierter Datenweg,
Datenschutzangaben, finaler Native-Build und physischer Gerätetest denselben
exakten Release-Stand belegen.
