# RewirePerform 1.1 – Production-Control-Plane-Snapshot

Stand: 13. August 2026

Status: historisches Predeploy-Metadatenbild. Der aktuelle Postdeploy-Stand ist
in den separat bytegepinnten Production-Postdeploy- und
Post-Edge-Preflight-Paketen dokumentiert. Dieser Snapshot autorisiert kein
Credential, keinen Datenread und keine Runtime- oder App-Store-Aktivierung.

## Migration-History

- Production-Projekt: `bqsbxesmybthwtxmowfz`.
- Dieser historische Snapshot sah 79 Migrationen bis `20260801104717`.
- Der kontrollierte Rollback-Dry-run lief danach grün, ohne persistente
  Mutation.
- Anschließend wurde der gepinnte Plan kontrolliert angewendet. Der aktuelle
  Postdeploy-Nachweis bestätigt exakt 104 geordnete Remote-Versionen mit dem
  Inventar-SHA `f20873d87cd352ceed9460bf995d20fdde4b7e984c660983f81a5277b312981b`.
- Die spätere finale Consent-/Guardian-Registrierungsmigration ist in diesem
  104er Inventar noch nicht enthalten und bleibt ein eigener fail-closed Gate.

Der spätere Rollback- und Apply-Operator prüft die History unmittelbar vor
seiner ersten SQL-Ausführung erneut. Dieser Snapshot ersetzt diesen frischen
fail-closed Preflight nicht.

## Edge Functions

- Beide für V1.1 benötigten Functions sind inzwischen credentiallos deployed:
  `submit-organization-access-request` als Version 2 und
  `mahleos-feedback-intelligence-production-read` als Version 1.
- Remote-Dateien und lokale Quellen sind im aktuellen Post-Edge-Paket
  bytegepinnt; beide Laufzeitpfade bleiben ohne Secrets und mit geschlossenen
  Gates fail-closed.

Damit ist die technische Bereitstellung abgeschlossen, aber weder die
öffentliche Organisationsannahme noch ein realer Feedback-/Jarvis-Read ist
aktiviert.

## Supabase Advisors

Aktueller Security-Advisor-Snapshot:

- 18 `INFO`-Hinweise `rls_enabled_no_policy`; die betroffenen Tabellen sind
  überwiegend bewusst server-only und durch RLS ohne Client-Policy
  fail-closed. Jeder neue Clientpfad muss weiterhin ausdrücklich ausgeschlossen
  oder einzeln autorisiert werden.
- 56 `WARN`-Hinweise: 54 aufrufbare `SECURITY DEFINER`-Funktionen, einmal
  `pg_net` im `public`-Schema und einmal nicht aktivierte
  Have-I-Been-Pwned-Passwortprüfung.
- Die geprüften schreibenden und privilegierten App-RPCs enthalten interne
  `auth.uid()`-, Admin-, Team- oder Eigentümerprüfungen und feste
  `search_path`-Grenzen. Der Advisor-Befund ist deshalb kein Beleg eines
  aktuellen unautorisierten Zugriffs, bleibt aber Teil des finalen
  Postdeploy-/Security-Audits.

Aktueller Performance-Advisor-Snapshot:

- 156 Hinweise: 21 unindexierte Foreign Keys, 98 RLS-Initplan-Hinweise,
  26 ungenutzte Indizes und 11 Mehrfach-Policy-Hinweise.
- Diese Punkte sind kein Blocker des geschlossenen V1.1-Migrationsgates, werden
  aber nicht fälschlich als optimiert bezeichnet. Performanceänderungen werden
  nicht in den sicherheitskritischen Release-Cutover gemischt.

## Privacy-Grenze

Es wurden ausschließlich Migration-, Edge- und Advisor-Metadaten sowie
Funktionsdefinitionen für die Berechtigungsprüfung gelesen. Keine Athleten-,
Team-, Organisations-, Guardian-, Feedback-, Journal- oder sonstige
Anwendungszeile wurde gelesen oder in diesem Dokument persistiert. Keine
externe Mutation wurde ausgeführt.
