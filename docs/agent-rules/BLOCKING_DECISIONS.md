# Blocking Decisions

Diese Entscheidungen sind ungelöst. Agenten duerfen sie weder annehmen noch automatisch loesen.

## BD-01 - Supabase-Zuordnung

- Bekannt: `supabase/config.toml` nennt das eigene Projekt; CI und alte Doku nennen eine andere ID.
- Unsicher: heutige Production-, Staging- und historische Zuordnung.
- Betroffen: Build-Env, CLI-Link, Functions, Daten, Deploy.
- Erlaubt: read-only Codeanalyse, lokale UI/Tests mit klar benannter Env.
- Blockiert: jeder Production-/Supabase-Write, Env-Umstellung oder Deploy.
- Mahle liefert: verbindliche Zuordnung der Projekt-IDs.

## BD-02 - Migrationen vom 10. Juli

- Bekannt: Code und dokumentierter Staging-Test existieren.
- Unsicher: Production-Apply.
- Betroffen: Program Runs, atomarer Daily Save, NLZ Readiness/Evidence.
- Erlaubt: lokale Analyse, Tests und nicht-produktive Pläne.
- Blockiert: Production-Apply, darauf gestuetzte Live-Behauptung.
- Mahle liefert: verifizierter Production-Migrationsstand.

## BD-03 - Prioritaetsreihenfolge

- Bekannt: NLZ-Gates und Sprachumbau sind beide aktuell.
- Unsicher: unmittelbare Reihenfolge.
- Betroffen: naechster groesserer Produktblock.
- Erlaubt: Audits, Plaene, kleine unabhaengige R1/R2-Arbeit.
- Blockiert: eigenmaechtige Priorisierung oder grosser Scope.
- Mahle liefert: `zuerst NLZ-Gates` oder `zuerst Sprache Tag 1-7`.

## BD-04 - Account-Loeschung

- Status: am 14. Juli 2026 fuer die lokale Implementierung geklaert; Remote-Aktivierung bleibt blockiert.
- Entschieden: Self-Service in der App, erneute Authentifizierung, direkte Loeschung personenbezogener Quelldaten, Teamtransfer vor Coach-Loeschung und Erhalt ausschliesslich nicht rueckbeziehbarer consent-basierter Aggregate.
- Operative Verantwortung: automatisierter App-/Edge-Function-/Auth-Ablauf; kein Feedback- oder Supportformular als regulaerer Loeschweg.
- Source of Truth: `docs/ACCOUNT_DELETION_CONTRACT_2026-07-14.md`.
- Erlaubt: lokale UI-, Auth-, Function-, Migrations- und Testimplementierung gemaess dem Vertrag.
- Blockiert: Migration-Apply, Function-Deploy, echte Loeschung, finale Store-Aussage und Production-Claim bis `BD-01`, Backup-Konfiguration und rechtliche Endpruefung bestaetigt sind.

## BD-05 - Minderjaehrigen-Consent

- Bekannt: Zielgruppe umfasst minderjaehrige Vereinsathleten; freiwilliger Datenbeitrag existiert.
- Unsicher: Erziehungsberechtigten-, Vereins- und Rechtsgrundlage.
- Betroffen: Onboarding, Consent, Evidence, Pilot, Privacy-Texte.
- Erlaubt: read-only Analyse und Variantenentwurf ohne Rechtsbehauptung.
- Blockiert: automatische Einwilligungslogik, neue Minderjaehrigendaten, breiter Rollout.
- Mahle liefert: fachlich/rechtlich bestaetigte Einwilligungsregel.

## Gemeinsame Wirkung

Nicht blockiert: Read-only-Analyse, Dokumentation, lokale nicht-sensitive UI-Arbeit, lokale Tests, R1/R2-Vorbereitung, Content-Audits, Architekturberichte.

Blockiert: Production, Migrationen, Auth/RLS, Consent, Account-Loeschung, sensitive Coach-/Athletendaten, Deployments und App-Store-Einreichungen.
