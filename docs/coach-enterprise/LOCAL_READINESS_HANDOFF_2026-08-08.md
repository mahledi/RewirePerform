# Coach / Enterprise Onboarding V1.1 — Local Readiness Handoff

Status: **LOKAL GRÜN — EXTERNE GATES GESCHLOSSEN**

## Fester Stand

- Branch: `codex/coach-enterprise-onboarding-v1-1-20260807`
- Basis: `3af92f1799e3ceb496fd753591652c7303db93c1`
- Checkpoint: `ed80b678d5c8ae9ecb8b8ee2ec6eac7ab6cc45df`
- Implementierung: `be760e3fdc6be8b246a0561e11e3a00e3967078f`
- Kein Push, Merge, Deploy, Staging, Production, TestFlight oder App-Store-Schritt.

## Lokal abgeschlossen

1. Öffentliche, responsive Organisationsanfrage unter `/team-access` mit drei klaren Schritten.
2. Keine Budgetabfrage, keine automatische Preisentscheidung und kein Coach-Self-Service.
3. Fail-closed Edge-Eingang mit Aktivierungsflag, Origin-Allowlist, Turnstile, Honeypot, Body-Limit und serverseitiger Validierung.
4. Atomare service-only Speicherung von Anfrage und unveränderlichem Submit-Ereignis.
5. Organisations-, Owner-/Admin-/Coach- und Lead-/Co-Coach-Rollen mit RLS und zweckgebundenen RPCs.
6. Team-Erstellung nur innerhalb einer persönlich freigegebenen, aktiven Organisation.
7. Einmalige, an die bestätigte E-Mail gebundene, gehashte und sieben Tage gültige Einladungen.
8. Dedizierter Organisations-Signup ohne Athletenfragebogen; bestehende Athleten mit Programmdaten werden nicht still zu Coaches umgewandelt.
9. Bestehende Coaches können einem weiteren Team beitreten, ohne durch die alte gemeinsame Team-Tabelle fälschlich als Athlet blockiert zu werden.
10. Coach-Übersicht nutzt nur bestehende, zweckgebundene Aggregate; kein direkter Zugriff auf Assessments, Tages-Check-ins, Profile, Journale oder Freitexte.
11. Founder Command Center priorisiert Entscheidungen, Partneranfragen und Teams; schwere Daten-/Exportbereiche laden erst beim bewussten Öffnen.
12. Jarvis-Vertrag bleibt privat und vollständig ohne Grant; keine echte Machine-Ausführung möglich.

## Verifikation

- `npm run ci`: grün.
- 115/115 Testdateien und 662/662 Tests grün.
- TypeScript, Production-Web-Build, Brand-, Mailtemplate- und MahleOS-Vertrag grün.
- Alle SQL-Gates für Evidence, Verständnis, Minderjährige, Tracking, MahleOS, Access, Löschung, Feedback und Guardian grün.
- Statische App-Store-Readiness grün.
- `npm run app:build` mit bestätigtem Production-Ziel `bqsbxesmybthwtxmowfz` grün; Capacitor-Sync und eingebettetes iOS-Ziel grün.
- Browser-QA des Anfragewegs: Desktop sowie 375x667, 390x844, 1024x1366 und 1366x1024 ohne horizontalen Überlauf oder überdeckte Controls.
- Kompletter Drei-Schritt-Weg mit synthetischen Geschäftsdaten geprüft; die echte Absendeaktion blieb erwartungsgemäß deaktiviert.
- `git diff --check`: grün.

## Bewusst offene Gates

### Produktentscheidung vor Integration

Wenn der einzige Organisations-Owner sein Konto löscht, muss das Account-Deletion-Recht erhalten bleiben, ohne eine aktive Organisation herrenlos weiterlaufen zu lassen.

Empfehlung: persönliches Konto vollständig löschen, Organisation automatisch pausieren und eine neue Owner-Zuweisung ausschließlich durch Admin-Freigabe erlauben. Alternative: vor Löschung verpflichtende Übergabe an einen anderen Coach. Bis zur Mahle-Entscheidung keine Production-Integration.

### Technische externe Gates

1. Draft-Migration in einem isolierten Staging-Projekt anwenden und echte RLS-/RPC-Negativtests ausführen.
2. Danach Supabase-Typen aus exakt diesem Staging-Schema aktualisieren.
3. Sicheren Anfrageempfang mit Turnstile-Key, Origin-Allowlist und Aktivierungsflag vorbereiten; noch nicht aktivieren.
4. Positiven Einladungsweg mit echter Testmail in Staging prüfen.
5. iPhone-/iPad-Gerätetest für Anfrage, Organisations-Signup, Einladung, Lead-/Co-Coach und Konto-Löschrandfall.
6. Erst nach getrenntem Review Integrationsentscheidung; Production und echter Jarvis bleiben geschlossen.

### Separater Dependency-Block

`npm audit --omit=dev --package-lock-only` meldet 1 high und 2 moderate Befunde:

- `nanoid < 3.3.17` über die Build-Abhängigkeit PostCSS; ein kleiner transitive Lock-Fix ist verfügbar.
- React Router / React Router DOM 6.30.4; die gemeldeten externen Redirect-Pfade sind im Produkt durch `safeInternalRoute`, Backslash-/Encoded-Separator-Tests und feste Notification-Allowlist begrenzt. Der angebotene vollständige Fix ist ein Major-Upgrade auf Router 7 und gehört in einen eigenen Migrationsbranch.

Diese Abhängigkeiten wurden bewusst nicht mit dem Coach-/Enterprise-Diff vermischt.

## Separater Content-/Visualisierungsstand

Der vollständig freigegebene Rest-Day-/Visualisierungsblock bleibt separat:

- Branch: `codex/content-architecture-v1-1-20260805`
- SHA: `950b260be994be5515a3193cf5e7cc3a677c76be`

Er wurde nicht in diesen Organisationsbranch übernommen.

## Kontrollgrenze

Dieser Stand ist ein lokaler, getesteter Integrationskandidat. Er ist keine Freigabe für echte Organisationsanfragen, Rollen, E-Mails, Jarvis-Lesezugriffe, Zahlungen, Staging, Production, TestFlight oder App Store.
