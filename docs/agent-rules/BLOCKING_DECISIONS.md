# Blocking Decisions

Diese Entscheidungen dokumentieren geklaerte Zuordnungen und weiterhin offene Gates. Agenten duerfen offene Punkte weder annehmen noch automatisch loesen.

## BD-01 - Supabase-Zuordnung

- Status: am 14. Juli 2026 durch Mahle verbindlich bestaetigt und ueber die Supabase-Projektmetadaten read-only verifiziert.
- Production: `bqsbxesmybthwtxmowfz` (`RewirePerform real`, `eu-central-1`).
- Staging/Nicht-Production: derzeit kein Projekt freigegeben. `towgvykgezrmkbyudjen` ist laut Mahle ein altes, stillgelegtes Projekt und darf nicht mehr verwendet werden.
- CI: ausschliesslich synthetischer Ref `abcdefghijklmnopqrst`; der historische Lovable-Ref bleibt gesperrt.
- Die Projektzuordnung ist nicht mehr blockiert. Production-Writes, Migrationen, Function-Deploys und Env-Aenderungen benoetigen weiterhin ihre eigene konkrete Freigabe und Verifikation.

## BD-02 - Migrationen vom 10. Juli

- Status: am 14. Juli 2026 durch Mahle nach informierter Production-Freigabe geschlossen.
- Auf Production angewendet: `20260710120000`, `20260710130000`, `20260713140500`, `20260714084351` und die Advisor-Haertung `20260714104145`.
- Verifiziert: exakte Remote-Migrationshistorie, Program-Run-/Evidence-Schema, erfolgreicher Team-Stats-Runtime-Smoke-Test, unveraenderte Bestandszahlen und gezielte Security-Advisors ohne neuen offenen Warnbefund aus diesem Block.
- Die fehlende Nicht-Production-Umgebung bleibt ein Infrastrukturrest, blockiert diese bereits ausgefuehrte Migrationskette aber nicht mehr. Zukuenftige Production-Migrationen brauchen erneut eine konkrete Freigabe und einen eigenen Rueckweg.

## BD-03 - Prioritaetsreihenfolge

- Bekannt: NLZ-Gates und Sprachumbau sind beide aktuell.
- Unsicher: unmittelbare Reihenfolge.
- Betroffen: naechster groesserer Produktblock.
- Erlaubt: Audits, Plaene, kleine unabhaengige R1/R2-Arbeit.
- Blockiert: eigenmaechtige Priorisierung oder grosser Scope.
- Mahle liefert: `zuerst NLZ-Gates` oder `zuerst Sprache Tag 1-7`.

## BD-04 - Account-Loeschung

- Status: am 14. Juli 2026 fuer Production aktiviert; der destruktive End-to-End-Test bleibt bei Mahle.
- Entschieden: Self-Service in der App, erneute Authentifizierung, direkte Loeschung personenbezogener Quelldaten, Teamtransfer vor Coach-Loeschung und Erhalt ausschliesslich nicht rueckbeziehbarer consent-basierter Aggregate.
- Operative Verantwortung: automatisierter App-/Edge-Function-/Auth-Ablauf; kein Feedback- oder Supportformular als regulaerer Loeschweg.
- Source of Truth: `docs/ACCOUNT_DELETION_CONTRACT_2026-07-14.md`.
- Live-Evidenz: Migration `20260714084351` ist angewendet; `delete-account` Version 1 ist `ACTIVE`, verlangt ein JWT und entspricht dem Repository-Quelltext. CORS antwortet mit `200`, fehlende oder ungueltige Authentifizierung mit `401`.
- Rueckweg: vor dem Apply wurde ein verschluesselter, integritaetsgepruefter Export von 33 Public-Tabellen und 11 persistenten Auth-Tabellen erstellt; der Schluessel liegt im macOS-Schluesselbund. Das Free-Projekt besitzt weiterhin kein PITR oder Plattform-Backup, und fuer den Export ist noch eine verbindliche Aufbewahrungs-/Loeschfrist festzulegen.
- Mahle hat klargestellt, dass sieben Accounts Testaccounts sind und ein Account real ist. Kein bestehender Account wurde waehrend des Deployments geloescht; Auth-, Profil- und Tracking-Bestandszahlen blieben unveraendert.
- Weiterhin blockiert: agentenseitige Loeschung eines bestehenden Accounts sowie die finale App-Store-Aussage, bis Mahle den Wegwerfaccount-Test durchgefuehrt und Sentry-Aufbewahrung, Backup-Loeschfrist, Privacy-Text und rechtliche Endpruefung bestaetigt hat.

## BD-05 - Minderjaehrigen-Consent

- Bekannt: Zielgruppe umfasst minderjaehrige Vereinsathleten; freiwilliger Datenbeitrag existiert.
- Unsicher: Erziehungsberechtigten-, Vereins- und Rechtsgrundlage.
- Betroffen: Onboarding, Consent, Evidence, Pilot, Privacy-Texte.
- Erlaubt: read-only Analyse und Variantenentwurf ohne Rechtsbehauptung.
- Blockiert: automatische Einwilligungslogik, neue Minderjaehrigendaten, breiter Rollout.
- Mahle liefert: fachlich/rechtlich bestaetigte Einwilligungsregel.

## Gemeinsame Wirkung

Nicht blockiert: Read-only-Analyse, Dokumentation, lokale nicht-sensitive UI-Arbeit, lokale Tests, R1/R2-Vorbereitung, Content-Audits, Architekturberichte sowie der jetzt freigegebene Account-Loeschungs-Codepfad.

Blockiert: nicht erneut freigegebene Production-/Auth-/RLS-Mutationen, agentenseitige Loeschung bestehender Accounts, offene Consent-/Minderjaehrigenentscheidungen, unfreigegebene sensitive Coach-/Athletendaten und die App-Store-Einreichung vor Abschluss der verbleibenden Gates.
