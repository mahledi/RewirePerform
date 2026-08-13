# RewirePerform 1.1 – App Store Connect Submission Draft

Stand: 13. August 2026
Status: lokal vorbereitet; Platzhalter und bedingte Abschnitte vor Eintragung
gegen den final aktivierten Production-Stand bestätigen

## Feste Versionsdaten

- App: RewirePerform
- Apple App ID: `6795463263`
- Bundle ID: `com.rewireperform.app`
- Version: `1.1`
- Build: `5`
- Verfügbarkeit: Deutschland
- Preis: kostenlos
- Release: manuell
- Altersrating: bestehender öffentlicher Stand 13+; keine Kids Category

## Neu in dieser Version

Freigabeentwurf:

> RewirePerform 1.1 führt Athleten und Coaches jetzt mit eigenen Einführungen
> durch die für sie relevanten Bereiche.
>
> Neu sind außerdem der überarbeitete 56-Tage-Ablauf, klarere Tagesinhalte,
> ein verbessertes Pre-Training und eine geführte Atmungs- und
> Visualisierungseinheit an Ruhetagen. Professionelle Team- und
> Coach-Einladungen sowie ein zentraler Anfrageweg erleichtern den Start mit
> Teams und Organisationen.
>
> Zusätzlich wurden Navigation, Ladezustände, Einstellungen und die
> Bedienbarkeit auf iPhone und iPad weiter verbessert.

Nur bei im eingereichten Production-RC tatsächlich aktivem strukturiertem
Feedback ergänzen:

> An vier Punkten des Programms können Athleten freiwillig strukturiertes
> Feedback zur Verständlichkeit und Alltagstauglichkeit geben.

Der Text behauptet keine diagnostische, medizinische oder garantierte
Leistungswirkung. Mahles sprachliche Freigabe bleibt vor Eintragung nötig.

## App Review Notes

Die Zugangsdaten werden erst nach Erstellung und physischer Prüfung stabiler,
synthetischer Review-Konten eingesetzt. Keine echten Athleten- oder
Guardian-Daten in dieses Dokument eintragen.

```text
RewirePerform 1.1 ist eine nichtmedizinische Mental-Performance- und
Routine-App für Athleten und Coaches. Sie stellt keine Diagnose, Behandlung
oder garantierte Leistungswirkung bereit. Es gibt keine In-App-Käufe.

Review-Zugänge
Athlet: [SYNTHETISCHE ATHLETEN-E-MAIL]
Passwort: [PASSWORT]

Coach: [SYNTHETISCHE COACH-E-MAIL]
Passwort: [PASSWORT]

Alle bereitgestellten Konten, Teams und Werte sind synthetisch.

Rollen und Einstieg
Beim ersten Start wird vor der Anmeldung ausschließlich die gewünschte
Einführung „Athlet“ oder „Coach“ gewählt. Diese Auswahl vergibt keine
technische Rolle.

Der Athleten-Einstieg zeigt die zehnteilige Produkteinführung und führt danach
zur Solo-Registrierung oder zum Athleten-Teambeitritt. Ein vorhandener
Teamcode bleibt erhalten.

Der Coach-Einstieg zeigt ausschließlich reale Coach-Funktionen. Ein bestehender
Coach-Zugang führt zum Login. Der Start eines Teams oder einer Organisation
führt zur persönlichen Zugangsanfrage. Ein Beitritt als Co-Coach ist nur über
eine persönliche, E-Mail-gebundene Einladung möglich. Eine öffentliche
Registrierung erzeugt niemals automatisch eine Coach-Rolle; Rollen und
Teamzugriffe werden serverseitig geprüft.

Team- und Organisationsanfragen
Die App öffnet hierfür den zentralen RewirePerform-Webweg:
https://rewireperform.com/team-access
Eine Anfrage erzeugt weder automatisch einen Zugang noch einen Preis oder
Vertrag. Jede Freigabe erfolgt persönlich.

Minderjährige
RewirePerform speichert nur die selbst gewählte Altersgruppe, kein Geburtsdatum
und kein Ausweisdokument. Bei 13- bis 15-Jährigen werden datenabhängige
Programmfunktionen erst nach der Entscheidung einer sorgeberechtigten Person
und der eigenen Zustimmung des Athleten freigeschaltet. Der persönliche
Guardian-Link ist 48 Stunden gültig. Mit 16 oder 17 erfolgt eine eigene
altersgerechte Entscheidung. Trainer und Vereine sehen weder die
Guardian-E-Mail noch die Entscheidung.

Datenschutzgrenzen
Coaches sehen operative Teilnahmeinformationen und Teamaggregate erst ab
mindestens fünf freigegebenen Antworten. Sie sehen keine Journaltexte,
privaten Reflexionen, einzelnen Check-in-Antworten,
Produktfeedback-Kommentare oder individuellen psychologischen Werte.

Die Kontolöschung ist in der App unter
„Mehr → Konto & Daten → Account löschen“ erreichbar.
```

Nur bei tatsächlich aktivem strukturiertem Feedback ergänzen:

```text
Strukturierte Produktfeedback-Checkpoints erscheinen deterministisch an den
Programmtagen 10, 24, 39 und 55. Sie bleiben ohne optionalen Kommentar
vollständig nutzbar.

Testkonto am aktiven Checkpoint:
[SYNTHETISCHE CHECKPOINT-E-MAIL]
Passwort: [PASSWORT]
```

Nur bei tatsächlich aktiven optionalen Kommentaren ergänzen:

```text
Ein Kommentarfeld öffnet sich ausschließlich nach einer separaten, nicht
vorausgewählten Einwilligung. Ein Nein verändert weder Programm noch
strukturierte Antworten. Erteilte Freigaben können unter
„Mehr → Konto & Daten → Freiwillige Feedback-Kommentare“ widerrufen werden.
Von 13 bis einschließlich 15 Jahren ist zusätzlich die exakt passende
Guardian-Freigabe erforderlich. Ohne Kommentar bleibt der strukturierte
Feedback-Checkpoint vollständig nutzbar.
```

Nur bei tatsächlich aktivem realen Jarvis-Processor ergänzen:

```text
Freigegebene Feedbackdaten können über einen minimierten,
zugriffsbeschränkten Export im intern betriebenen Jarvis-System ausgewertet
werden. Der Export enthält keine Namen, E-Mail-Adressen oder direkten
Nutzerkennungen. Private Journale, Reflexionen, Supporttexte, Teamdaten und
Coachdaten sind ausgeschlossen. Kein externer KI-Anbieter erhält diese Daten;
Jarvis speichert keine zweite Rohtextkopie.
```

## Reviewer-Konten – harte Anforderungen

- Beide Zugänge sind synthetisch und nicht ablaufend.
- Der Athletenzugang ist einem kontrollierten Programmtag zugeordnet.
- Der Coachzugang ist bereits einer synthetischen Organisation und einem Team
  zugeordnet; ein sieben Tage gültiger Einladungslink ist nicht der einzige
  Coachzugang.
- Ein optionales drittes Athletenkonto steht an einem aktiven Feedback-
  Checkpoint.
- Passwörter und Einladungslinks werden ausschließlich in App Store Connect
  eingetragen, nicht im Repository committed.
- Alle Konten werden unmittelbar vor Einreichung im finalen signierten Build
  auf iPhone und iPad geprüft.

## App-Privacy-Antworten bei vollständigem empfohlenem V1.1-Umfang

Alle genannten Typen: `Tracking = No`.

| Datenart | Linked | Zwecke |
| --- | --- | --- |
| Name | Yes | App Functionality |
| Email Address | Yes | App Functionality |
| Phone Number | Yes | App Functionality |
| Health | Yes | App Functionality; Product Personalization; Analytics |
| Fitness | Yes | App Functionality; Product Personalization |
| Other User Content | Yes | App Functionality; Analytics |
| User ID | Yes | App Functionality; Analytics |
| Product Interaction | Yes | App Functionality; Analytics |
| Customer Support | Yes | App Functionality |
| Other Diagnostic Data | Yes | App Functionality |
| Other Data Types | Yes | App Functionality |

Erläuterung:

- `Other User Content` deckt private Journale/Reflexionen, freiwillige
  Anfragehinweise und – falls aktiv – separat consentierte
  Produktfeedback-Kommentare ab.
- `Other Data Types` deckt die gespeicherte Altersgruppe ab.
- `Phone Number` ist konservativ enthalten, weil die aus der App erreichbare
  ausführliche Organisationsanfrage sie optional erheben kann.
- `Health` umfasst freiwillige Tages-Pulse und Assessment-Selbstauskünfte.
- `Fitness` umfasst Trainings-/Wettkampf-/Ruhetagskontext und Kalender.
- `Product Interaction` umfasst Programm- und Aufgabenfortschritt,
  Checkpoint-Antworten und minimierte Aktivitätszählungen.
- `Other Diagnostic Data` umfasst pseudonymisierte operative Fehlerereignisse
  mit Fehlercode und Route; keine Crash-Dumps oder freien Fehlertexte.
- Keine Crash Data, solange der finale Binary-/Network-Report keinen
  Crash-Collector zeigt.
- Keine Audio Data, solange RewirePerform keine Audiodatei überträgt oder
  speichert und die native Spracheingabe ausschließlich lokal in Text
  umwandelt.

### Exaktes Feedback-/Jarvis-Delta

| Aktivierter Stand | Änderung gegenüber dem Basisprodukt |
| --- | --- |
| Strukturierte Feedbackfragen aktiv, Kommentare aus | `Product Interaction` umfasst zusätzlich strukturierte Antworten, Inhalts-/Fragebogenversion, Programmtag und minimierte Aktivitätszählungen; Zwecke `App Functionality` und `Analytics`; linked `Yes`; Tracking `No`. |
| Freiwillige Kommentare aktiv | `Other User Content` umfasst zusätzlich bewusst abgegebene Produktfeedback-Kommentare; Zwecke `App Functionality` und `Analytics`; linked `Yes` bis Widerruf/Löschung oder echte Anonymisierung; Tracking `No`. |
| Interner Jarvis-Read aktiv | Kein zusätzlicher Apple-Datentyp, sofern ausschließlich dieselben bereits deklarierten Daten verarbeitet werden. Privacy Policy und Review Notes müssen den internen Empfänger, den minimierten Export, die fehlenden direkten Kennungen und die Löschgrenze nennen. Tracking bleibt `No`. |
| Feedback/Jarvis fail-closed | Feedbackspezifische Analytics-Zwecke und Review-Notes-Absätze nicht als aktive Funktion behaupten. Andere bereits real erhobene Journale, Interaktionen oder Kennungen bleiben unabhängig davon zu deklarieren. |

Die Aktivierung von Jarvis ist keine Erlaubnis, neue private Datenquellen zu
lesen. Journale, private Reflexionen, Supporttexte, Coach- und Teamdaten bleiben
außerhalb des Feedbackexports.

## Aktueller technischer Wahrheitsstand vor dem finalen RC

- Production-Datenbank: 104 Migrationen verifiziert.
- Beide neuen Edge Functions sind credentiallos und fail-closed deployed.
- Feedback-Request bei geschlossenem Gate: `503`.
- Organisationsanfrage: erlaubter Origin `503`, fremder Origin `403`.
- Der neue finale 13+-Consent-/Guardian-Vertrag ist auf diesem lokalen Stand
  nur als additive, weiterhin geschlossene Registrierung vorbereitet.
- Es gibt dadurch noch keine aktivierte Feedback-Collection, keine aktive
  Guardian-Feedback-Policy, kein Production-Credential und keinen echten
  Jarvis-Read.

## Vor Eintragung zu verifizieren

- [ ] Production-Rollback-Dry-run exakt einmal grün, ohne persistente Änderung;
- [ ] aktueller Backup-/Recovery-Nachweis und kontrollierter 25-Schritt-Apply;
- [ ] Postdeploy-Evidence bestätigt exakt 104 Migrationen, geschlossene
      Runtime-Gates, fünf geprüfte Production-Secret-Namen und beide erwarteten
      Edge-Slugs mit SHA-Provenienz;
- [ ] finaler aktivierter Feedback-/Kommentar-/Jarvis-Umfang;
- [ ] qualifizierte DE-Rechts-/Privacy-/Minor-Freigabe;
- [ ] Production-Turnstile und Organisationseingang;
- [ ] veröffentlichte Datenschutzerklärung entspricht dem realen Datenweg;
- [ ] Privacy Policy URL erreichbar;
- [ ] optionales Privacy-Choices-Feld leer lassen, solange keine eigene
      öffentliche Privacy-Choices-Seite existiert;
- [ ] stabile synthetische Review-Konten physisch geprüft;
- [ ] „Neu in dieser Version“ von Mahle sprachlich freigegeben;
- [ ] finaler signierter Build `1.1 (5)` ausgewählt;
- [ ] iPhone- und iPad-Kernwege grün;
- [ ] App-Privacy-Antworten erst nach Freeze veröffentlicht;
- [ ] manuelle Veröffentlichung beibehalten.

## Sichere Fortsetzung ohne Mac-Zugriff

Solange Mahle nicht am Mac ist, bleiben Production-Passwort, persistenter
Apply, Edge-Deploy, Feature-Gates, TestFlight und App-Store-Eintragung
geschlossen. Lokal können Code, Build, Tests, Verträge, Store-Texte und
Review-Evidence vollständig vorbereitet werden. Beim nächsten Mac-Zugriff ist
der erste externe Schritt ausschließlich der bereits gepinnte Rollback-
Dry-run mit einer einmaligen unsichtbaren Passworteingabe. Das Passwort wird
nicht gespeichert. Ein grüner Dry-run autorisiert den persistenten Apply nicht
automatisch; dieser bleibt ein nachgelagerter, getrennt freizugebender Schritt.
