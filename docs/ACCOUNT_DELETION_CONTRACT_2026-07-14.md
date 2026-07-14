# Account Deletion Contract

Status: von Mahle am 14. Juli 2026 fuer die lokale Implementierung freigegeben.

## Produktentscheidung

- Die Loeschung wird als Self-Service in `Einstellungen -> Konto & Daten` gestartet und direkt in der App abgeschlossen.
- Vor der endgueltigen Loeschung bestaetigt der Nutzer seine Identitaet erneut mit dem aktuellen Passwort.
- Persoenliche Account-, Profil-, Programm-, Tracking-, Journal-, Assessment-, Kalender- und Benachrichtigungsdaten werden aus dem aktiven System geloescht.
- Andere Teammitglieder und deren Daten werden niemals durch die Loeschung eines Accounts entfernt.
- Ein Teamverantwortlicher muss jedes eigene Team vor der Loeschung an einen vorhandenen Co-Coach uebertragen.
- Bereits erzeugte, consent-basierte Aggregate duerfen nur bestehen bleiben, wenn sie keinen Nutzerbezug, keine Rohtexte und keine individuellen Verlaeufe enthalten und die aktive Mindestgruppengroesse von `n >= 5` eingehalten wurde.
- Personenbezogene Quellzeilen werden nicht lediglich pseudonymisiert, um sie fuer spaetere Analysen zu behalten.
- Personenbezogene technische Event- und Fehlerzeilen werden ebenfalls entfernt; sie sind keine Studien-Aggregate.
- Technische Datenbank-Backups werden nicht aktiv weiterverarbeitet und laufen innerhalb einer maximal kommunizierten Aufbewahrungsfrist von 30 Tagen aus.

## Technischer Ablauf

1. Die App laedt eine serverseitige Vorschau eigener Teamverantwortung.
2. Falls erforderlich, waehlt der Nutzer fuer jedes Team einen berechtigten Co-Coach.
3. Die App authentifiziert das aktuelle Passwort ueber Supabase Auth neu. Das Passwort wird nicht an die Loeschfunktion gesendet.
4. Die Edge Function verifiziert den Nutzer serverseitig und akzeptiert die Loeschung nur mit einem hoechstens fuenf Minuten alten Access Token.
5. Die Edge Function speichert den geprueften Transferplan und widerruft Refresh Tokens auf allen Geraeten.
6. `auth.admin.deleteUser` entfernt den Auth-Nutzer. Ein `BEFORE DELETE`-Trigger uebertraegt Teamverantwortung und entfernt die personenbezogenen Domain-Zeilen innerhalb derselben Datenbanktransaktion.
7. Consent-basierte Aggregate bleiben unveraendert; direkte Erstellerreferenzen werden auf `NULL` gesetzt.
8. Die App entfernt lokale Entwuerfe, Rollen-Caches, Reminder und die lokale Sitzung und zeigt eine dauerhafte Abschlussbestaetigung.

## Nicht freigegeben

- Kein Supabase-Apply, Function-Deploy, Production-Test oder App-Store-Claim ohne separate Freigabe.
- Die reale Projektzuordnung aus `BD-01` muss vor jedem Remote-Schritt bestaetigt werden.
- Vor der App-Store-Einreichung muessen Backup-Konfiguration, Privacy-Text und rechtliche Einordnung am realen Production-Projekt final verifiziert werden.
- Die reale Sentry-Aufbewahrung und der Umgang mit bereits vorhandenen stabilen Nutzer-IDs muessen vor Live-Aktivierung verifiziert oder technisch bereinigt werden.

## Pflichtpruefungen vor Live-Aktivierung

- Athlet ohne Team und mit vollstaendigem Trackingverlauf
- Athlet in einem Team
- Coach mit einem Team und einem Co-Coach
- Coach mit mehreren Teams
- Coach ohne transferberechtigten Co-Coach
- falsches Passwort, abgelaufene Sitzung, Doppeltipp und Netzabbruch
- Nachweis, dass alle personenbezogenen Tabellen leer sind
- Nachweis, dass fremde Teamdaten unveraendert bleiben
- Nachweis, dass bestehende Aggregate keine Nutzerkennung oder Rohinhalte enthalten
- Auth-, Postgres- und Edge-Function-Logs ohne personenbezogene Inhalte
