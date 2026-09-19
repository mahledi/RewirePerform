# Coach / Enterprise Onboarding V1.1 — Local Checkpoint

Status: **IN ARBEIT — NICHT INTEGRATIONS- ODER PRODUCTION-READY**

## Verbindliche Freigabe

Mahle hat am 7. August 2026 den Coach-/Enterprise-Block vor NLZ-Gates und Sprache Tag 1–7 priorisiert und die lokale R4-Umsetzung von Anfrage, Organisations-/Teammitgliedschaften, Co-Coach, Rollen/RLS und draft-only Migration freigegeben.

Explizit geschlossen bleiben: Production, echter Jarvis-Read, Zahlung, Push, Merge und Deployment.

## Exakter Arbeitsstand

- Worktree: `/Users/NeuroRewiremahle/Social Media/RewirePerform/worktrees/coach-enterprise-onboarding-v1-1-20260807`
- Branch: `codex/coach-enterprise-onboarding-v1-1-20260807`
- Basis: `3af92f1799e3ceb496fd753591652c7303db93c1`
- Supabase-Migration: `20260807092005_coach_enterprise_onboarding_v1_1.sql`
- Supabase CLI für die Migrationserstellung: `2.111.0`
- Production-/Staging-Mutation: keine

## Lokal umgesetzt

1. Gemeinsame responsive Route `/team-access` mit dreistufiger Organisationsanfrage.
2. Fail-closed öffentliche Edge Function `submit-organization-access-request`:
   - expliziter Aktivierungs-Flag;
   - Allowlist für Origins;
   - begrenzter Request Body;
   - Turnstile-Verifikation;
   - Honeypot;
   - serverseitige Feld-/Enum-Prüfung;
   - keine direkte Tabellenfreigabe an `anon` oder `authenticated`.
3. Draft-only Datenmodell für:
   - Organisationsanfragen und Audit-Ereignisse;
   - Organisationen und Organisationsmitgliedschaften;
   - explizite Team-Staff-Rollen;
   - einmalige, gehashte und ablaufende Einladungen.
4. Admin-RPCs für Anfrageübersicht, Statuswechsel und persönliche Freigabe.
5. Sichere Einladungsannahme mit bestätigter E-Mail und Schutz bestehender Athletenaccounts.
6. Co-Coach-Einladung in der Teamverwaltung.
7. Neuer Admin-Einstieg als Founder Command Center:
   - Entscheidungen und Partneranfragen zuerst;
   - schwere Daten-/Exportbereiche sekundär;
   - kein automatischer Komplett-Ladevorgang beim ersten Öffnen.
8. Private, vollständig ungrantete Jarvis-View für spätere kontrollierte Vorrecherche.

## Bereits geprüft

- `npm run typecheck`: grün.
- `git diff --check`: grün.
- Branch/Worktree und Basis-SHA verifiziert.
- Supabase Changelog vom 7. August geprüft; relevante Data-API-/RLS-Änderungen berücksichtigt.

## Als Nächstes zwingend

1. Migration strukturell prüfen und SQL-Harness für RLS/RPC/Token-/Rollen-Grenzen ergänzen.
2. UI-/Vertragstests für `/team-access`, Admin Command Center, Anfrageverwaltung und Einladung ergänzen.
3. Bestehende Coach-Berechtigungspfade gegen Co-Coach vollständig abgleichen:
   - Teamübersicht;
   - Teamzustand;
   - Kalender;
   - Programmstart;
   - Evidence Review;
   - Account-Löschung/Teamtransfer.
4. Supabase-Typen kontrolliert aktualisieren, sobald die lokale Schemaform final ist.
5. Lint, fokussierte Tests und vollständiges `npm run ci` ausführen.
6. Browser-QA für kleine iPhones, iPad Hoch-/Querformat und Desktop.
7. Erst danach separater Staging-Plan; keine Aktivierung ohne neue Freigabe.

## Separater V1.1-Integrationsinput

Der final freigegebene Rest-Day-/Visualisierungsblock liegt separat auf:

- Branch: `codex/content-architecture-v1-1-20260805`
- SHA: `bd647c1b4e709cc0285c6438639e1e9b42ef6128`

Er bleibt bis zum unabhängigen Diff-/Privacy-/Native-/Gerätereview unintegriert.

## Gesammelter Geräte-/UX-Korrekturblock

Nicht vergessen und nicht mit diesem R4-Block vermischen:

- Settings basiert visuell noch auf der alten Oberfläche.
- Kalenderhinweis lädt unnötig; direkter Kalender-Button gewünscht.
- lange Themenüberschriften brechen/werden abgeschnitten.
- Daily-Flow-Schritt `Reflexion` ist für einen vorausblickenden optionalen Check missverständlich.
- Visualisierungsbuttons wirken in verschachtelten Rahmen zu klein.
- Rest-Day-Visualisierung braucht einfache, alltägliche Sportszenen und klare Anleitung.
- Die Formulierung `innerer Kampf` an Tag 33 ist zu ersetzen.
- Atmung, Übergang in die Visualisierung, Timer-Ton, Haptik und visueller Abschluss werden durch den separaten finalen Visualisierungs-SHA abgedeckt und müssen physisch geprüft werden.

## Kontrollgrenze

Dieser Checkpoint ist bewusst ein lokaler Entwicklungsstand. Er ist keine Freigabe für echte Anfragen, Coach-Rollen, Jarvis-Lesezugriffe, E-Mails, Zahlungen, Staging, Production, TestFlight oder App Store.
