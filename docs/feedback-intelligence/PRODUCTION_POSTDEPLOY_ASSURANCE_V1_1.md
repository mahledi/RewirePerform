# RewirePerform 1.1 – Production-Postdeploy-Assurance-Vertrag

Stand: 13. August 2026

Status: lokal vorbereitet. Keine Production-Migration, kein Edge-Deploy, kein
Credential und kein Datenread wird durch dieses Dokument ausgeführt oder
freigegeben.

## Zweck

Der Vertrag definiert den kleinsten zulässigen Nachweis unmittelbar nach einem
später separat freigegebenen Production-Migrationslauf. Er verhindert, dass ein
erfolgreicher Terminalstatus ohne exakte Migration-History, geschlossene
Runtime-Gates und eine frische Control-Plane-Prüfung als Production-Freigabe
interpretiert wird.

## Zulässige Evidence

- der strikt validierte, sanitierte Rückgabestatus des persistenten Operators;
- Hash und Anzahl der 25 angewendeten beziehungsweise history-only behandelten
  V1.1-Migrationsversionen;
- die vollständige finale Migration-History nur als Anzahl und SHA-256;
- der fest definierte metadata-only Target-Audit-Status;
- Presence-only-Aussagen zu den exakt gepinnten Edge-Slugs
  `mahleos-feedback-intelligence-production-read` und
  `submit-organization-access-request`;
- Presence-only-Aussagen zu den exakt fünf gepinnten Production-Secret-Namen;
- `PASSWORD NULL` für den weiterhin credentiallosen Production-Reader;
- SHA-256 und feste Quellenkennung jeder Control-Plane-Beobachtung sowie des
  kombinierten Audits;
- ehrliche Trennung des bereits freigegebenen, einmaligen Migrationsreads aus
  `public.teams(id, created_by)` und `public.user_roles(user_id, role)` vom
  nachgelagerten metadata-only Audit, der keine Anwendungszeile liest;
- Bestätigung, dass keine Anwendungswerte, Credentials oder Rohfehler in der
  Evidence persistiert wurden.

Nicht zulässig sind Namen, E-Mails, Teamkennungen, Athleten-, Feedback-,
Guardian-, Journal- oder sonstige Anwendungswerte, Secret-Werte, Passwörter,
Rohresponses und nicht sanitierte Fehlermeldungen.

## Harte Grenze

Ein grüner Production-Migrationsnachweis aktiviert keine Laufzeitfunktion. Die
öffentliche Organisationsanfrage, Feedback-Collection, optionale Kommentare,
Minderjährigenverarbeitung, Jarvis, Edge Functions, Secrets und App-Store-
Einreichung bleiben jeweils eigene nachgelagerte Gates. Bis zu einem realen
Apply existiert nur der erwartete, bytegepinnte Prüfvertrag; es darf kein
Postdeploy-Ergebnis vorgetäuscht werden.
