# Internal Tester Privacy Boundary V1

Status: `TESTED_LOCAL_PRODUCTION_ROLLBACK_PROVEN`

## Was diese Grenze garantiert

Interne Tester dürfen den vollständigen Athletenablauf auch in einem echten
Team verwenden. Ihre operativen Testdaten bleiben für den Tester selbst und für
autorisierte Administration erhalten, werden aber serverseitig ausgeschlossen
aus:

- Coach-Mitglieder-, Aktivitäts-, Fragebogen-, Check-in- und Evidence-Ansichten;
- Coach-Erinnerungen;
- offiziellen Team- und Teilnehmerzahlen;
- Admin-/Jarvis-Teamübersichten und System-Health-Zählungen;
- Team Pulse, Feedback Intelligence, Trends und Evidence-Aggregaten, die bereits
  die kanonischen Testflags auswerten.

Die dauerhafte Logik verwendet ausschließlich `profiles.is_test_user`,
`teams.is_test_team` und `program_instances.is_test_instance`. Namen und
E-Mail-Adressen sind keine Laufzeitregel.

## Sicherheitsvertrag

- Klassifizierung ist nur über private, `service_role`-beschränkte Funktionen
  möglich und wird in `app_private` protokolliert.
- Browserrollen können das Klassifizierungs-Audit weder lesen noch schreiben.
- Ein gesetztes Testflag kann über normale Profil-, Team- oder Instanzupdates
  nicht zurückgesetzt werden.
- Neue oder geänderte Programminstanzen erben den Teststatus automatisch vom
  Nutzer oder Team.
- Bestehende Self-Service- und Admin-Sicht bleibt erhalten; Staff-/Coach-Sicht
  wird vor der Zeilenausgabe gefiltert.
- Es werden keine Accounts oder Trackingdaten gelöscht.

## Abnahme

- Lokaler Postgres-Lauf: echter Teamkontext mit Admin/Coach, echtem Athleten und
  internem Tester; Self-Service erlaubt, alle offiziellen/Coach-Wege ohne Tester.
- Reminder-Negativtest: kein Log und kein Empfänger für den Tester.
- Persistenztest: Profil-, Team- und Instanzflags bleiben trotz Downgrade-Versuch
  gesetzt.
- Gesamtsuite: `231/231` Testdateien und `1224/1224` Tests grün.
- Production-Schema-Dry-Run: alle fünf Migrationen in einer einzigen
  Transaktion kompiliert, Invarianten geprüft und vollständig zurückgerollt.

## Production-Gate

Die Aktivierung muss alle Migrationen und die einmalige Klassifizierung in einer
einzigen Transaktion anwenden. Vor dem Commit gelten folgende Fail-closed-
Invarianten:

1. genau ein Admin-Akteur ist vorhanden;
2. genau ein realer Pilotteam-Kontext ist eindeutig ableitbar;
3. alle übrigen Teams sind Testkontexte;
4. die erwartete Menge interner Tester ist eindeutig;
5. nach Klassifizierung ist kein interner Tester in einem unmarkierten
   Programminstanzpfad vorhanden;
6. die echte Pilotgruppe bleibt unverändert und alle Coach-/Jarvis-Smokes geben
   ausschließlich offizielle Zählwerte aus.

Wenn eine Invariante nicht erfüllt ist, wird die gesamte Transaktion
zurückgerollt.
