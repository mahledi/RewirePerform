# RewirePerform 1.1 – App Store Connect Submission Draft

Stand: 11. August 2026
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

Nur bei tatsächlich aktivem strukturiertem Feedback ergänzen:

> An vier Punkten des Programms können Athleten freiwillig strukturiertes
> Feedback zur Verständlichkeit und Alltagstauglichkeit geben.

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
| Health | Yes | App Functionality; Analytics |
| Fitness | Yes | App Functionality; Product Personalization |
| Other User Content | Yes | App Functionality; Analytics |
| User ID | Yes | App Functionality; Analytics |
| Product Interaction | Yes | App Functionality; Analytics |
| Customer Support | Yes | App Functionality |
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
- Keine Crash Data, solange der finale Binary-/Network-Report keinen
  Crash-Collector zeigt.
- Keine Audio Data, solange RewirePerform keine Audiodatei überträgt oder
  speichert und die native Spracheingabe ausschließlich lokal in Text
  umwandelt.
- `Other Diagnostic Data` nur ergänzen, falls der finale Network-Report eine
  lesbar aufbewahrte technische Diagnostik bestätigt.

## Vor Eintragung zu verifizieren

- [ ] finaler aktivierter Feedback-/Kommentar-/Jarvis-Umfang;
- [ ] qualifizierte DE-Rechts-/Privacy-/Minor-Freigabe;
- [ ] Production-Turnstile und Organisationseingang;
- [ ] veröffentlichte Datenschutzerklärung entspricht dem realen Datenweg;
- [ ] Privacy Policy URL und Privacy Choices URL erreichbar;
- [ ] stabile synthetische Review-Konten physisch geprüft;
- [ ] „Neu in dieser Version“ von Mahle sprachlich freigegeben;
- [ ] finaler signierter Build `1.1 (5)` ausgewählt;
- [ ] iPhone- und iPad-Kernwege grün;
- [ ] App-Privacy-Antworten erst nach Freeze veröffentlicht;
- [ ] manuelle Veröffentlichung beibehalten.
