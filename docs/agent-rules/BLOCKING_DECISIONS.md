# Blocking Decisions

Diese Entscheidungen dokumentieren geklaerte Zuordnungen und weiterhin offene Gates. Agenten duerfen offene Punkte weder annehmen noch automatisch loesen.

## BD-01 - Supabase-Zuordnung

- Status: am 14. Juli 2026 durch Mahle verbindlich bestaetigt und ueber die Supabase-Projektmetadaten read-only verifiziert.
- Production: `bqsbxesmybthwtxmowfz` (`RewirePerform real`, `eu-central-1`).
- Staging/Nicht-Production: `towgvykgezrmkbyudjen` (`RewirePerform`, `eu-west-1`) gemaess `docs/RELEASE_ENVIRONMENTS.md`.
- CI: ausschliesslich synthetischer Ref `abcdefghijklmnopqrst`; der historische Lovable-Ref bleibt gesperrt.
- Die Projektzuordnung ist nicht mehr blockiert. Production-Writes, Migrationen, Function-Deploys und Env-Aenderungen benoetigen weiterhin ihre eigene konkrete Freigabe und Verifikation.

## BD-02 - Migrationen vom 10. Juli

- Status: der Production-Stand wurde am 14. Juli 2026 read-only bis `20260627120000_nlz_evidence_tracking_v1` verifiziert.
- Offen: die vier lokalen Migrationen `20260710120000`, `20260710130000`, `20260713140500` und `20260714084351` sind auf Production nicht angewendet.
- Betroffen: Program Runs, atomarer Daily Save, NLZ Readiness/Evidence.
- Erlaubt: lokale Analyse, Tests und nicht-produktive Pläne.
- Blockiert: Production-Apply, darauf gestuetzte Live-Behauptung.
- Naechstes Gate: vollstaendige Migrationskette zuerst gegen eine isolierte Nicht-Production-Datenbank ausfuehren, danach Schema-/Security-Pruefung und separater Production-Apply-Entscheid.

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
- Blockiert: Migration-Apply, Function-Deploy, echte Loeschung, finale Store-Aussage und Production-Claim bis ein verifizierbarer Backup-/Restore-Pfad, die vollstaendige Nicht-Production-Ausfuehrung, Sentry-Aufbewahrung und die rechtliche Endpruefung bestaetigt sind. Das aktive Supabase-Projekt laeuft auf Free; am 14. Juli 2026 waren kein PITR und keine verfuegbaren Plattform-Backups gelistet.

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
