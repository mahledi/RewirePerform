# Golden Days V1.1 – Review-Handoff

Stand: 5. August 2026

## Bedeutung dieses Stands

Die Golden-Day-Redaktion ist als interne, interaktive Entscheidungs- und Testvorlage umgesetzt. Sie zeigt zehn bewusst unterschiedliche Programmtage mit der neuen Lernarchitektur, verändert aber noch keinen produktiven Tagesinhalt.

Die Vorlage dient dazu, Sprache, Tagesbelastung, Wiederholung, Transfer und Verbindungen zwischen Werkzeugen gemeinsam zu beurteilen, bevor die 56 Tage systematisch redigiert werden.

## Abgedeckte Golden Days

- Tag 1: Aufbau von „Zurück zur Aufgabe“ an einem Trainingstag
- Tag 2: kurzer Ruhetag ohne erfundene Anwendung und ohne Pre-Training
- Tag 4: Wechsel von Training zu Ruhetag nach dem Check-in
- Tag 6: maximal drei verpasste Kurzzusammenfassungen, ohne Nachhol-Aufgabe
- Tag 8: aktive Erinnerung vor dem Training
- Tag 10: Wettkampftag mit klarer, sicherer Anwendung
- Tag 15: Dankbarkeit ohne erzwungene positive Umdeutung
- Tag 28: Integration aller sieben Werkzeuge, geführt durch „Stabilität verbreitern“
- Tag 33: einfache Vertiefung von „Handeln vor Sicherheit“
- Tag 51: späte Integration von „Fehler nutzen“ und „Handeln vor Sicherheit“ bei nur einem sichtbaren Cue

## Verbindliche Qualitätsgrenzen

- genau ein sichtbarer Tagesanker;
- unterstützende Inhalte stärken den Anker und konkurrieren nicht mit ihm;
- eine Mission mit zwei bis drei zusammengehörigen Handlungsschritten;
- Science Bites kurz, sportneutral und in verständlicher Alltagssprache;
- keine Pseudo-Personalisierung nach Sportart, Position oder angenommener Lebenssituation;
- kein erfundener Transfer an Ruhetagen;
- Pre-Training als aktive Erinnerung, nicht bloßes erneutes Lesen;
- Journal als erneutes Durchgehen einer echten Szene, passend zum Tagesanker;
- Dankbarkeit als ein Block mit konkretem Mindesteintrag;
- maximal drei verpasste Kurzzusammenfassungen, ohne Parallelauftrag;
- keine Diagnose, keine Wirkungsbehauptung und keine Aussage, dass Veränderung im Gehirn bewiesen sei.

## Technische Isolation

Die Route `/internal/golden-days-preview` ist ausschließlich über das bestehende interne DEV-/Evidence-Gate erreichbar. Das Content-Lab:

- verwendet nur lokale Entwurfsdaten;
- schreibt nichts in Auth, Supabase, Tracking, Journal oder Assessment;
- verändert keine produktiven Inhalte aus `src/content/**`;
- verändert keine Minor-, Guardian-, Consent-, Privacy- oder Scoring-Logik;
- wird weder in den Production-Web-Build noch in das eingebettete iOS-Ziel aufgenommen.

## Verifikation

- 95 Testdateien und 536 Tests grün;
- fokussierter Golden-Day-Vertrag: 8 von 8 Tests grün;
- Typecheck, Diff-Check, Brand-, Privacy-, Minor-, Guardian-, Access-, Tracking-, Deletion- und App-Store-Gates grün;
- Production-Zielprüfung und eingebettete iOS-Zielprüfung grün;
- Byte-Prüfung: keine Golden-Day-Preview-Texte in `dist` oder `ios/App/App/public`;
- Browserprüfung auf 375×667, 390×844, 844×390, 1024×1366 und 1366×1024 ohne Seitenüberlauf oder Footer-Überdeckung;
- alle zehn Tage und alle sieben Ansichten von Tag 28 interaktiv geprüft;
- sichtbare Touch-Ziele im mobilen Test mindestens 44 Pixel hoch.

## Empirisch offen

Diese Prüfung belegt technische Stabilität, wahrheitsgetreue Produktgrenzen und eine plausible Lernarchitektur. Sie belegt noch nicht, dass die Texte bei Athleten besser verstanden, erinnert oder angewendet werden. Vor der vollständigen 56-Tage-Redaktion sollten die zehn Golden Days gezielt mit Athleten geprüft werden: Verständnis ohne Erklärung, erinnerter Cue, tatsächliche Anwendung, wahrgenommene Wiederholung und tägliche Belastung.

## Separater Dependency-Befund

Der unveränderte Lockfile-Baum meldet einen High-Hinweis in `brace-expansion` über `@capacitor/cli` → `rimraf`. Das ist ein Build-/CLI-Pfad und kein ausgelieferter Browsercode der Golden Days. Der Befund wurde in diesem Content-Branch bewusst nicht durch Package- oder Lockfile-Änderungen vermischt und muss in einer eigenen Dependency-Readiness-Runde geprüft und geschlossen werden. Die bereits bekannten React-Router-Hinweise bleiben davon getrennt.

## Nächster Freigabepunkt

Nach der Sicht- und Inhaltsfreigabe dieses Labs folgt nicht sofort ein unkontrollierter Rewrite. Zuerst wird aus den Golden Days ein verbindlicher Redaktionsvertrag abgeleitet. Danach können die 56 Tage blockweise redigiert, gegengeprüft und erst nach separater Freigabe in die Produktionsinhalte integriert werden.
