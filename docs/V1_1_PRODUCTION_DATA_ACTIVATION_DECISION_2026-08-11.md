# RewirePerform 1.1 – Production-Datenaktivierung

Stand: 11. August 2026
Status: empfohlener, lokal vorbereiteter Entscheidungsumfang; noch keine
Production-, Real-Data-, Credential-, Merge-, TestFlight- oder App-Store-
Freigabe

## Ziel B

RewirePerform 1.1 soll im Deutschland-Pilot strukturiertes Produktfeedback,
freiwillige Kommentare und einen eng begrenzten internen Jarvis-Auswertungspfad
nutzen, ohne private Athleteninhalte, direkte Identifikatoren oder Coachdaten in
den Analyseweg zu geben. Minderjährige dürfen nur innerhalb des aktuellen,
altersgerecht autorisierten und fachlich freigegebenen Scopes teilnehmen.

## Belegter Stand A

- Der sichtbare Feedbackvertrag v1.1.2, die Semantik v0.3.3 und der minimierte
  Export v0.2.1 sind lokal gepinnt und getestet.
- Die Registrymigration v1.1.2 ist in Staging angewendet und durch einen
  metadata-only Audit bestätigt.
- Ein frischer credentialloser Preflight bestätigte geschlossene Gates,
  abwesende Machine-Secrets und eine unprivilegierte Reader-Rolle ohne Passwort.
- Nach separater Freigabe wurde exakt ein synthetischer Jarvis-Request
  ausgeführt: HTTP 200, 825 Items, 55 Fragen, kein Retry und keine persistierte
  Rohresponse, kein Rohkommentar und keine persistierte `subject_reference`.
- Danach wurden alle temporären Secrets, das Reader-Passwort, der lokale
  Keychain-Eintrag und alle synthetischen Fixtures entfernt. Sämtliche
  Collection-, Minor-, Guardian-, Real-Data- und Production-Gates sind wieder
  geschlossen.
- Jarvis hat das vollständige Postread-Paket unabhängig byte- und
  semantikgenau akzeptiert. Dieser Nachweis beweist ausschließlich den
  synthetischen Datenweg.

Exakte Evidence-Pins:

- RewirePerform Producer: `98a884e875a88051175f83cde6aba82453d0c90f`
- Producer-Manifest: `981a72be3b86af34bf061ab1f08f453462a9984f234c062adcbe751d5ec0459f`
- Producer-Paket: `84f478970e9d4fddab5f2630482c46e970c81867df9aab43698cae7c72f9898c`
- Postread-Evidence: `d90157db8148705893417c48fa040e1fbbbaf60068fecfac2dc5c758096f960a`
- Jarvis Consumer: `b284ed8eaae5d78da7c0762502926183e42db73c`
- Consumer-Acceptance: `243ee7568846ce209ea84bc9e001fd8f892ecc4248921206fa3ec923bfadf2f4`

## Empfohlener V1.1-Production-Umfang

### 1. Strukturierte Feedback-Checkpoints

Aktiv an den Programmtagen 10, 24, 39 und 55. Die Teilnahme bleibt
freiwillig. Ein Ablehnen oder Schließen verändert weder das Programm noch den
Zugang. Gespeichert werden nur die versionierten Auswahlantworten und die für
den Checkpoint benötigten Vertrags- und Programmdaten.

### 2. Freiwillige Produktfeedback-Kommentare

Aktiv, aber ausschließlich nach der unmittelbar davor gezeigten, nicht
vorausgewählten Einwilligung. Ohne aktives Ja öffnet sich kein Kommentarfeld;
die strukturierte Antwort bleibt nutzbar. Unter 16 muss zusätzlich eine
aktuelle, exakt passende Guardian-Autorisierung vorliegen. Widerruf und
Kontolöschung entfernen Rohtext und personenbeziehbare Analyseableitungen.

### 3. Interner Jarvis-Auswertungspfad

Aktiv zunächst nur als manuell vom Verantwortlichen gestarteter, streng
begrenzter Read. Keine automatische Dauerverbindung und kein Zeitplan in der
ersten Production-Aktivierung. Jeder Lauf muss den aktuellen Consent-,
Guardian-, Contract- und Gate-Stand erneut fail-closed prüfen.

Jarvis darf verarbeiten:

- strukturierte Antworten der vier Feedback-Checkpoints;
- freiwillige Produktfeedback-Kommentare nur bei im Export erneut geprüfter,
  gültiger Athleteneinwilligung;
- bei unter 16 zusätzlich nur bei gültiger, exakt passender
  Guardian-Autorisierung;
- Programmtag sowie Fragebogen-, Inhalts-, Produkt- und Consent-Version;
- eine ausschließlich innerhalb derselben Programminstanz stabile,
  pseudonyme Referenz;
- minimierte Aktivitätszahlen: verfügbare und abgeschlossene Programmtage,
  Check-in-Anzahl, reine Journalanzahl, Aufgabenanzahl, Transfer-Pulse-Anzahl
  sowie grobe Rückkehr-/Fortsetzungs-Buckets.

Jarvis darf nicht erhalten oder verarbeiten:

- Namen, E-Mail-Adressen, Telefonnummern oder direkte Accountkennungen;
- Team-, Organisations- oder Coachkennungen;
- Journaltexte, private Reflexionen, Daily-Check-in-Freitexte,
  Supportnachrichten oder sonstige freie Athletentexte;
- einzelne Stimmung-, Energie- oder Fokuswerte;
- Coach-Freitexte oder individuelle Coachbewertungen;
- Daten für Werbung, Profiling, automatische Athletenentscheidungen,
  Personalisierung, Startelf-, Talent- oder Karriereentscheidungen;
- Daten eines nicht aktuell autorisierten Minderjährigen oder eines
  widerrufenen Scopes.

Der Jarvis-Consumer verarbeitet die Antwort im Arbeitsspeicher. Er speichert
keine zweite Rohtextkopie, keine Rohresponse und keine pseudonyme
`subject_reference`. Erhalten bleiben dürfen nur zusammengefasste
Produktentscheidungs- und Evidenzberichte mit dokumentierten Aussagegrenzen.

### 4. Team- und Organisationsanfragen

Die öffentliche Website darf die getrennte kurze Teamanfrage und ausführliche
Organisationsanfrage annehmen. Die native App öffnet denselben zentralen
Webweg. Cloudflare Turnstile dient ausschließlich dem Missbrauchsschutz. Eine
Anfrage erzeugt weder automatisch Coachrechte noch ein Team, einen Preis oder
einen Vertrag.

## Minderjährigen- und Rechtsgrenze

Die Produktentscheidung ist fest: 13- bis 15-Jährige nutzen den Unter-16-Weg
mit Guardian- und eigener Zustimmung; 16- bis 17-Jährige entscheiden im
altersgerechten eigenen Flow. Für optionale Feedbackkommentare besteht ein
zusätzlicher, getrennter Scope.

Die technische Umsetzung ersetzt jedoch keine qualifizierte deutsche Rechts-
und Privacy-Prüfung. Vor dem ersten realen minderjährigenbezogenen Write oder
Jarvis-Read müssen insbesondere Rechtsgrundlagen, Guardian-Verifikation,
sichtbare Texte, Aufbewahrung, Widerruf, Providerfristen und App-Store-Angaben
schriftlich gegen den finalen Stand bestätigt werden. Bis dahin bleiben
`minor_policy_ready`, Guardian-Feedback-Policy und Real-Data-Gates geschlossen.

## App-Store-Privacy-Folge

Wenn der empfohlene Umfang vollständig aktiviert wird, sind mindestens diese
feedbackbezogenen Angaben erforderlich:

| Apple-Datenart | Linked to User | Zwecke | Tracking |
| --- | --- | --- | --- |
| Product Interaction | Ja | App Functionality; Analytics | Nein |
| User ID | Ja | App Functionality; Analytics | Nein |
| Other User Content | Ja | App Functionality; Analytics | Nein |

Die Daten bleiben als `Linked to User` anzugeben, obwohl der Machine-Export
pseudonymisiert ist, weil sie im Producer vor Export einem Konto und einer
Programminstanz zugeordnet sind. Jarvis ist keine zusätzliche Apple-Datenart;
sein realer Processor-Pfad muss aber in Datenschutzerklärung und Review Notes
wahrheitsgemäß genannt werden.

Unabhängig davon bleiben Name, E-Mail-Adresse, Health, Fitness, User ID,
Product Interaction und private beziehungsweise freiwillige User-Inhalte nach
ihrem realen Appzweck anzugeben. Tracking, Werbung und Datenbroker-Nutzung
bleiben `Nein`.

## Aktivierungsreihenfolge

1. Qualifizierte DE-Rechts-/Privacy-/Minor-Prüfung dokumentieren und notwendige
   Textänderungen als neue Versionen und Hashes umsetzen.
2. Exakten Production-Migrationsplan mit Backup, Preflight, Rollback und
   einzeln angewendeten Migrationen freigeben; kein pauschales DB-Push.
3. Feedback-Collection und Guardian-/Consent-Policies zunächst ohne Jarvis
   aktivieren und strukturierten Erwachsenen-, 16/17- und Unter-16-Pfad in
   Production mit ausschließlich kontrollierten synthetischen Konten prüfen.
4. Öffentliche Team-/Organisationsanfrage mit Production-Turnstile aktivieren,
   einmal positiv testen und den synthetischen Antrag wieder löschen.
5. Eigenen Production-Reader, eigene Credentials und einen vom Staging-Pfad
   getrennten Production-Gateway bereitstellen; keine Wiederverwendung der
   Staging-Credentials.
6. Genau einen kontrollierten Production-Read erst nach erneuter
   Human-Freigabe und nur auf dem final freigegebenen Datenumfang ausführen;
   anschließend Credential-/Gate- und Datenzugriffs-Audit.
7. Datenschutzerklärung, App-Privacy-Antworten und Review Notes gegen den
   tatsächlich aktivierten Stand finalisieren und veröffentlichen.
8. Signierten V1.1-RC auf iPhone und iPad prüfen; danach erst Merge,
   Website-Production, TestFlight und App-Store-Einreichung.

## Noch erforderliche Mahle-Entscheidung

Vor der lokalen Production-Gateway-Implementierung und jeder echten
Aktivierung ist ausdrücklich zu bestätigen:

> Für RewirePerform 1.1 sollen strukturierte Feedbackantworten, separat
> consentierte Produktfeedback-Kommentare und der oben exakt begrenzte,
> zunächst manuell gestartete interne Jarvis-Auswertungspfad Teil des
> Deutschland-Piloten sein. Minderjährigendaten dürfen erst nach dokumentierter
> qualifizierter DE-Rechts-/Privacy-Freigabe in diesen Pfad gelangen.

Ohne diese Bestätigung bleiben Feedback-Client, Kommentare, Guardian-Policy,
Machine-Credentials, Real-Data- und Production-Gates geschlossen.
