# Account Deletion Contract

Status: von Mahle am 14. Juli 2026 fuer `bqsbxesmybthwtxmowfz` (`RewirePerform real`) freigegeben und remote aktiviert. Der destruktive Athlet-in-Team-Test wurde am selben Tag erfolgreich ausgefuehrt und read-only verifiziert; siehe `docs/ACCOUNT_DELETION_PRODUCTION_VERIFICATION_2026-07-14.md`.

## Produktentscheidung

- Die Loeschung wird als Self-Service in `Einstellungen -> Konto & Daten` gestartet und direkt in der App abgeschlossen.
- Vor der endgueltigen Loeschung bestaetigt der Nutzer seine Identitaet erneut mit dem aktuellen Passwort.
- Persoenliche Account-, Profil-, Programm-, Tracking-, Journal-, Assessment-, Kalender- und Benachrichtigungsdaten werden aus dem aktiven System geloescht.
- Andere Teammitglieder und deren Daten werden niemals durch die Loeschung eines Accounts entfernt.
- Ein Teamverantwortlicher muss jedes eigene Team vor der Loeschung an einen vorhandenen Co-Coach uebertragen.
- Bereits erzeugte, consent-basierte Aggregate duerfen nur bestehen bleiben, wenn sie keinen Nutzerbezug, keine Rohtexte und keine individuellen Verlaeufe enthalten und die aktive Mindestgruppengroesse von `n >= 5` eingehalten wurde.
- Personenbezogene Quellzeilen werden nicht lediglich pseudonymisiert, um sie fuer spaetere Analysen zu behalten.
- Personenbezogene technische Event- und Fehlerzeilen im aktiven Produktdatenmodell werden ebenfalls entfernt; sie sind keine Studien-Aggregate.
- Provider-seitige Sicherheitsprotokolle koennen den Loeschvorgang waehrend ihrer begrenzten Retention mit Nutzerkennung dokumentieren. Sie duerfen nicht fuer Produktanalyse, Tracking oder Studien verwendet werden und muessen im Privacy- und Auftragsverarbeitungsrahmen abgebildet sein.
- Etwaige technische Datenbank-Backups duerfen nicht fuer Nutzeranalyse oder Reidentifikation weiterverarbeitet werden und muessen einer verbindlichen Loeschfrist unterliegen. Vor dem Apply wurde ein verschluesselter, integritaetsgepruefter Export der Public-Daten und persistenten Auth-Daten erstellt; das aktive Free-Projekt besitzt weiterhin kein PITR oder Plattform-Backup.

## Technischer Ablauf

1. Die App laedt eine serverseitige Vorschau eigener Teamverantwortung.
2. Falls erforderlich, waehlt der Nutzer fuer jedes Team einen berechtigten Co-Coach.
3. Die App authentifiziert das aktuelle Passwort ueber Supabase Auth neu. Das Passwort wird nicht an die Loeschfunktion gesendet.
4. Die Edge Function verifiziert den Nutzer serverseitig und akzeptiert die Loeschung nur mit einem hoechstens fuenf Minuten alten Access Token.
5. Die Edge Function speichert den geprueften Transferplan und widerruft Refresh Tokens auf allen Geraeten.
6. `auth.admin.deleteUser` entfernt den Auth-Nutzer. Ein `BEFORE DELETE`-Trigger uebertraegt Teamverantwortung und entfernt die personenbezogenen Domain-Zeilen innerhalb derselben Datenbanktransaktion.
7. Consent-basierte Aggregate bleiben unveraendert; direkte Erstellerreferenzen werden auf `NULL` gesetzt.
8. Die App entfernt lokale Entwuerfe, Rollen-Caches, Reminder und die lokale Sitzung und zeigt eine dauerhafte Abschlussbestaetigung.

## Weiterhin nicht freigegeben

- Kein Agent loescht einen weiteren bestehenden Account ohne eine neue konkrete Freigabe. Der verifizierte Production-Test wurde von Mahle selbst ausgeloest.
- Weitere Supabase-Applies, Function-Deploys oder Production-Mutationen brauchen eine neue konkrete Freigabe; die bestaetigte Production-Zuordnung aus `BD-01` muss dabei erneut technisch abgeglichen werden.
- Vor der App-Store-Einreichung muessen Backup-Konfiguration, Privacy-Text und rechtliche Einordnung am realen Production-Projekt final verifiziert werden.
- Die reale Sentry-Aufbewahrung, die Backup-Loeschfrist, Provider-Log-Retention und der Umgang mit bereits vorhandenen stabilen Nutzer-IDs muessen vor der App-Store-Einreichung verifiziert oder rechtlich/technisch sauber abgebildet werden.

## Pflichtpruefungen vor App-Store-Freigabe

- [ ] Athlet ohne Team und mit vollstaendigem Trackingverlauf
- [x] Athlet in einem Team mit Programminstanz, Check-in und Fragebogenzeilen
- [ ] Coach mit einem Team und einem Co-Coach
- [ ] Coach mit mehreren Teams
- [ ] Coach ohne transferberechtigten Co-Coach
- [ ] falsches Passwort, abgelaufene Sitzung, Doppeltipp und Netzabbruch als destruktive Live-Faelle; automatisierte Abdeckung besteht
- [x] Nachweis, dass fuer den geloeschten Testaccount alle personenbezogenen Auth- und Produkttabellen leer sind
- [x] Nachweis, dass Teams bestehen bleiben und keine Referenz auf den geloeschten Testaccount verbleibt
- [ ] Nachweis an bestehenden Aggregaten; Production enthielt zum Testzeitpunkt keine Aggregat-Snapshots
- [x] Edge- und Postgres-Logs ohne accountbezogenen Fehler; Provider-Auth-Log-Retention ist als separates Privacy-Gate dokumentiert
