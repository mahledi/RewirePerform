# Feedback Intelligence 1.1 – lokaler Release-Nachweis

Stand: 5. August 2026

## Bedeutung

Der lokale 1.1-Integrationskandidat verbindet den Feedback-Intelligence-Stand
mit dem isolierten Golden-Days-Content-Lab. Der einzige Quellkonflikt in
`src/App.tsx` wurde so aufgelöst, dass beide internen Preview-Routen und das
standardmäßig geschlossene Feedback-Checkpoint-Gate erhalten bleiben.

Dieser Nachweis bestätigt lokale technische Eigenschaften. Er bestätigt weder
eine rechtliche Freigabe noch ein Supabase-Deployment, einen echten
Jarvis-Read, einen signierten iOS-Build oder eine App-Store-Akzeptanz.

## Eingefrorene Quellen

- Feedback-/Guardian-Stand:
  `cc1b1caccbf5e1761f9db6a4eaa3cc3460430d3c`
- Golden-Days-Stand:
  `ebb013991712e57e807ba2ae86cb242b63c23ad7`
- gemeinsame Basis und aktuelles `origin/main`:
  `2535ade4ee021dffa19eb5c3bacd4144edeb7430`
- Deutschland bleibt der einzige 1.1-Jurisdiktionsscope.
- Alle Collection-, Machine-, KI- und Production-Gates bleiben geschlossen.

## Grüne lokale Prüfungen

Auf dem zusammengeführten Quellstand liefen erfolgreich:

- `npm run ci`;
- Production-Web-Build;
- TypeScript-Typecheck;
- 102 Vitest-Dateien mit 582 Tests;
- sämtliche Evidence-, Comprehension-, Minor-, Tracking-, Machine-, Access-,
  Deletion-, Feedback-Intelligence- und Guardian-SQL-Harnesses;
- Feedback-Semantikkatalog-Byteprüfung;
- statische App-Store-Readiness-Prüfung;
- `plutil -lint ios/App/App/PrivacyInfo.xcprivacy`;
- kombinierter Browser-Smoke-Test beider internen Preview-Routen bei 1280 px
  und 390 px ohne horizontalen Seitenüberlauf; der Feedback-Flow öffnet von
  der phasengerechten Tag-10-Einleitung bis zur ersten Frage;
- `git diff --check` und `git diff --cached --check`;
- ESLint mit null Fehlern und 16 bereits vorhandenen Warnungen in nicht von
  dieser Integration veränderten Dateien.

Die aktuellen Supabase-Hinweise zu `logs.all`, Extension-Version-Pinning und
dem gesperrten `realtime`-Schema betreffen diesen Block nicht: Der Stand nutzt
keinen dieser Pfade. Private Tabellen bleiben ohne direkte Runtime-Rechte;
privilegierte RPCs besitzen explizite Execute-Entzüge und werden durch lokale
Rollen-Negativtests abgesichert.

## Absichtlich noch geschlossen

Der Produktionsziel-Validator stoppt in diesem isolierten Worktree korrekt,
weil keine echten Production-Environment-Werte vorhanden sind. Deshalb kann
auch der daraus gespeiste Embedded-iOS-Check die Production-Projektreferenz
nicht bestätigen. Es wurden keine Secrets gesucht, kopiert oder ergänzt.

Vor einem echten Release bleiben damit separat offen:

1. qualifizierte deutsche Rechts-, Datenschutz- und Minderjährigenprüfung;
2. reale App-Store-Connect-Angaben und bewusste Altersfreigabe;
3. autorisierte Production-/Staging-Environment-Werte für den eingefrorenen
   Build;
4. signierter nativer Build und Gerätetest;
5. Deployment der Migrationen und Edge Functions bei weiterhin geschlossenen
   Collection-Gates;
6. Rollen-, Widerrufs-, Lösch- und Rollback-Nachweis in der Zielumgebung;
7. eigener synthetischer Machine-Read und erst danach ein gesondert
   freigegebener echter Jarvis-Read.

Push, Merge nach `main`, Supabase- oder Edge-Deployment, App-Store-Änderungen
und reale Datenzugriffe sind nicht Teil dieses lokalen Nachweises.

## Nachtrag vom 6. August 2026

Das inzwischen ausdrücklich freigegebene, getrennte Free-Staging-Projekt wurde
mit synthetischen Daten geprüft. Datenbankmigrationen, Rollen-Negativtests,
Minderjährigen-/Guardian-Scope, Widerruf und der echte Tag-10-RPC-Pfad sind
grün; das Projekt endete leer und mit vollständig geschlossenen Gates.

Dieser Nachtrag ersetzt keine Rechts-, App-Store-, Native-, Production- oder
Jarvis-Real-Read-Freigabe. Der vollständige Zielumgebungsnachweis steht in
[`STAGING_VERIFICATION_2026-08-06.md`](./STAGING_VERIFICATION_2026-08-06.md).
