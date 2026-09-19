# Internal Tester Privacy Boundary V1

Status: `ACTIVE_LIVE_PROVEN_SERVER_SIDE`

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

### Minor-Guard-Kompatibilität

Der Production-Rollback-Proof fand eine interne Testinstanz, deren synthetischer
Autorisierungszustand gewöhnliche Produktwrites korrekt blockiert. Migration
`20260907073744_allow_internal_test_classification_without_product_authorization.sql`
lässt diesen Guard bestehen und erlaubt ausschließlich eine
datenschutzschützende Wartungstransition: `is_test_instance` darf von `false`
auf `true` wechseln, wenn jede andere Spalte der Programminstanz unverändert
bleibt. Inserts, Rückstufungen, kombinierte Datenänderungen und jeder normale
unautorisierte Write bleiben fail-closed.

## Production-Aktivierung vom 7. September 2026

### Code-Provenienz

- Privacy-Grenze: PR `#194`, Merge
  `0dca54c73532741d26e4d9072f08012c3cf851d9`.
- Minor-Guard-Kompatibilität: PR `#195`, Merge
  `2f801028bfccee87fe641df0da6a99b1cdf53535`.
- GitHub CI für PR `#195`: `232/232` Testdateien und `1226/1226` Tests grün;
  Build, Typecheck, SQL-/Privacy-Validatoren und Vercel Preview grün.

### Production-Apply

- Ziel: `bqsbxesmybthwtxmowfz` (`RewirePerform real`, `eu-central-1`,
  `ACTIVE_HEALTHY`).
- Atomarer Rollback-Proof: `6` Migrationen, SQL SHA-256
  `660b1d5d87dac532fe750d373bcfd6285f717a3a5ce2813e62d2ddcb103f05b8`.
- Persistenter atomarer Apply: SQL SHA-256
  `8fa45f8e33f79a629fb0158cf257cb3e5e48ec9f2c7f25d2397526f8d225e6a0`.
- Angewandte Migrationen:
  `20260906133746`, `20260906135858`, `20260906135859`,
  `20260906135900`, `20260906135901`, `20260907073744`.
- Nach dem Apply: `3` Testteams, `11` interne Testprofile, `8`
  Test-Programminstanzen und `14` neue private Auditzeilen. Keine Accounts oder
  Trackingdaten wurden gelöscht.

### Live-Nachweis

Der read-only Production-Smoke mit echten Rollen- und Datenbankpfaden bestand
unter SHA-256
`1cb36ec7e7d7141bd47d77e98af903e13d1d9b51e57bec6e89fe4860c0fdecb7`:

- Coach-RLS, Profile und Rollen: `0` sichtbare interne Tester;
- Coach-Aktivität, Check-ins und Fragebogenstatus: jeweils `27` offizielle
  Athleten und `0` interne Tester;
- Program-Run: `27` offizielle Athleten, `27` Zuweisungen und `27` aktive
  offizielle Instanzen;
- Admin-Teamübersicht: genau `1` offizielles Team, `30` offizielle Mitglieder,
  `27` offizielle Athleten und `0` Testteams;
- Team Pulse, Coach Evidence, Admin-Systemzustand, Aktivitätstrends,
  Programmverständnis und strukturierte Feedback Intelligence antworteten ohne
  interne Testerkennung; `subject_reference` erschien nicht in der
  Feedback-Ausgabe;
- das interne Testkonto behielt seine eigene Profil-, Rollen- und Teamansicht;
- `anon` und `authenticated` können weder klassifizieren noch das private Audit
  lesen; `service_role` kann klassifizieren.

Der vollständig zurückgerollte Reminder-Smoke unter SHA-256
`78a63ab7894838c8948a5338fc61c3d6c5b9ba70b61cb9195afcfc1ebfdd7d26`
erzeugte für `27` offizielle Empfänger und `0` interne Tester einen
Test-Claim. Es blieb keine Notification-Zeile bestehen und es wurde keine Mail
oder Push-Nachricht versendet.

### Ehrliche Grenze

`LIVE_PROVEN_SERVER_SIDE` beweist die Production-Datenbank-, RLS-, RPC-,
Admin-/Jarvis- und Reminder-Auswahlgrenze. Ein physischer Coach-Browser-Smoke
und ein echter zugestellter Push sind nicht Teil dieses Nachweises und werden
nicht als bewiesen behauptet.
