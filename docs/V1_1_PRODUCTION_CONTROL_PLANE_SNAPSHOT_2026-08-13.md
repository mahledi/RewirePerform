# RewirePerform 1.1 – Production-Control-Plane-Snapshot

Stand: 13. August 2026

Status: sanitisiertes, read-only Metadatenbild. Dieser Snapshot autorisiert
keine Migration, kein Credential, keinen Edge-Deploy, keinen Datenread und
keine Runtime- oder App-Store-Aktivierung.

## Migration-History

- Production-Projekt: `bqsbxesmybthwtxmowfz`.
- Aktuelle Remote-History: 79 Migrationen.
- Letzte Remote-Version: `20260801104717`.
- Keine der 25 vorbereiteten V1.1-Migrationsversionen ist in Production
  vorhanden.
- Der persistente Apply-Plan erwartet nach erfolgreichem Lauf exakt 104
  geordnete Remote-Versionen.

Der spätere Rollback- und Apply-Operator prüft die History unmittelbar vor
seiner ersten SQL-Ausführung erneut. Dieser Snapshot ersetzt diesen frischen
fail-closed Preflight nicht.

## Edge Functions

- Aktuell aktive Functions: 14.
- `submit-organization-access-request` ist in Production nicht vorhanden.
- `mahleos-feedback-intelligence-production-read` ist in Production nicht
  vorhanden.

Damit sind öffentliche Organisationsannahme und der getrennte Production-
Feedback-Gateway nicht versehentlich vorgezogen. Ihre spätere Bereitstellung
bleibt jeweils ein eigener Gate nach dem Datenbank-Postdeploy-Nachweis.

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
