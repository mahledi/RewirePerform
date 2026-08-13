# RewirePerform 1.1 – App Store Connect Delta

Status: vorbereitet, aber noch nicht in App Store Connect eingetragen oder
veröffentlicht. Dieses Dokument beschreibt den heute belegten Unterschied zur
öffentlichen Version 1.0. Es autorisiert weder Privacy-Publishing noch Build-
Upload, Review-Einreichung oder Release.

## 1. Feste Release-Identität

- App: RewirePerform
- Bundle ID: `com.rewireperform.app`
- Apple App ID: `6795463263`
- Version: `1.1`
- Build: `5`
- Verteilung: Deutschland
- Preis: kostenlos
- Veröffentlichungsmodus: manuell

Version und Build sind im Xcode-Projekt gepinnt und statisch getestet. Der
finale signierte Archive-Nachweis steht noch aus.

## 2. Warum die Privacy-Antworten noch nicht vorzeitig veröffentlicht werden

Apple verlangt, dass die App-Privacy-Antworten die tatsächlich im aktuell
öffentlichen App-Build erhobenen Daten widerspiegeln und auch eingebundene
Drittpartner berücksichtigen. RewirePerform 1.0 ist bereits öffentlich; deshalb
werden neue V1.1-Datentypen nicht vorzeitig auf der Produktseite publiziert.

Der Abgleich erfolgt erst gegen den eingefrorenen V1.1-Build und den exakt
aktivierten Backend-/Processor-Stand. Änderungen an bestehenden Antworten
können danach in App Store Connect veröffentlicht werden; neu hinzugefügte
Datentypen müssen vollständig beantwortet sein.

Offizielle Referenz:
https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy

## 3. Konservativer V1.1-Datentyp-Abgleich

Die folgenden Angaben sind gegen den finalen RC und den realen Production-Stand
zu bestätigen. `Tracking` bleibt `false`, solange es keine Werbung,
Datenbroker-Verknüpfung oder appübergreifende Werbemessung gibt.
Die Tabelle verwendet ausschließlich Apples auswählbare Zweckbegriffe;
Produktverbesserung wird dabei als `Analytics` eingeordnet, nicht als erfundene
eigene Store-Kategorie.

| Apple-Datenart | RewirePerform-V1.1-Quelle | Linked to User | Zweck |
| --- | --- | --- | --- |
| Name | Konto; Team-/Organisationsanfrage | Ja | App Functionality |
| Email Address | Konto; Team-/Organisationsanfrage | Ja | App Functionality |
| Phone Number | optional in ausführlicher Team-/Organisationsanfrage | Ja, falls der aus der App geöffnete zentrale Webweg dem App-Umfang zugerechnet wird | App Functionality |
| Health | freiwillige Tages-Pulse und Assessment-Selbstauskünfte | Ja | App Functionality; Analytics |
| Fitness | Trainings-/Wettkampf-/Ruhetagskontext und Kalender | Ja | App Functionality; Product Personalization |
| Other User Content | private Journale/Reflexionen; freiwilliger Anfragehinweis; separat consentierter Produktfeedback-Kommentar | Ja bis Löschung, Widerruf oder echte Anonymisierung | App Functionality; Analytics für den ausdrücklich freigegebenen Feedbacktext |
| User ID | interner Account-/Programminstanzbezug | Ja | App Functionality |
| Product Interaction | Programmtage, Missions-/Check-in-/Verständnisabschlüsse, strukturierte Feedbackantworten, Aktivitätszählungen | Ja | App Functionality; Analytics |
| Customer Support | vom Nutzer initiierte Supportkommunikation | Ja | App Functionality |
| Other Data Types | gespeicherte Altersgruppe `unter 16`, `16–17` oder `18+` | Ja | App Functionality |

`Other Diagnostic Data` ist nur dann aufzunehmen, wenn der finale Binary- und
Network-Report bestätigt, dass technische Incident-Daten länger als zur
unmittelbaren Anfragebearbeitung lesbar gespeichert werden. Ein rein lokaler
Fehlerzustand oder eine nicht aufbewahrte Request-Metainformation ist nach
Apples Definition nicht automatisch „Collected“.

Nicht anzugeben, solange der finale RC unverändert bleibt:

- kein `Tracking`;
- keine `Crash Data`, weil kein Crash-Collector im RC enthalten ist;
- keine Audioaufnahme, weil die native Spracheingabe lokal in Text umgewandelt
  wird und RewirePerform keine Aufnahme speichert;
- keine Werbe- oder Datenbrokerzwecke.

## 4. Feedback-/Jarvis-Grenze

Strukturierte Feedbackantworten und separat consentierte Produktfeedbacktexte
sind unterschiedliche Datenwege. Ablehnung des Freitexts darf die
strukturierten Antworten und das Programm nicht sperren.

Der vorbereitete Jarvis-Weg ist intern, lokal und minimiert. Der synthetische
Staging-Pfad wurde inzwischen exakt einmal erfolgreich ausgeführt und
vollständig bereinigt; das ist kein echter Produktdatenzugriff. Solange
Production-Zugriff, Credential und Real-Data-Gate geschlossen sind, darf in
Review Notes oder Privacy-Antworten nicht behauptet werden, Jarvis verarbeite
bereits echte Produktdaten. Vor einer Aktivierung müssen mindestens finaler
Consent-/Guardian-Stand, Widerruf/Löschung, Aufbewahrung, Processor-Pfad und
Production-Evidence übereinstimmen.

Der empfohlene, noch ausdrücklich freizugebende reale Datenumfang steht in
`docs/V1_1_PRODUCTION_DATA_ACTIVATION_DECISION_2026-08-11.md`.

## 5. Review-Information für den finalen RC

Apple verlangt für eine loginpflichtige App einen nicht ablaufenden Demo-Zugang
und vollständige Informationen, die den Reviewer durch besondere Konfigurationen
und Zugangswege führen. Die Review Notes dürfen bis zu 4000 Bytes enthalten.

Für V1.1 müssen die finalen Notes mindestens erklären:

1. Vor der Anmeldung wird ausschließlich die gewünschte Einführung gewählt:
   Athlet oder Coach. Diese Auswahl vergibt keine technische Rolle.
2. Athleten sehen den realen zehnstufigen Athletenflug und gelangen danach zu
   Solo-Registrierung oder Athleten-Teambeitritt.
3. Coaches sehen den realen Coach-Flug. Bestehender Zugang führt zum Login;
   Teamstart führt zur persönlichen Anfrage; Co-Coach-Beitritt erfordert eine
   persönliche, E-Mail-gebundene Einladung.
4. Öffentliche Registrierung erzeugt keine Coach-Rolle. Rollen- und Teamzugriff
   werden serverseitig geprüft.
5. Unter-16-Zugang, Guardian-Entscheidung und Produktfeedbacktext-Freigabe sind
   getrennte, fail-closed Abläufe.
6. Private Journale, freie Reflexionen, Produktfeedbacktexte und individuelle
   sensible Werte sind für Coaches nicht sichtbar.
7. Die bereitgestellten Review-Konten und Teamdaten sind synthetisch.
8. Account-Löschung ist in der App erreichbar.

Die endgültigen Konten, Kontaktdaten und exakten Klickwege werden erst nach dem
physischen Test des finalen Builds eingetragen.

Offizielle Referenz:
https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information

## 6. „Neu in dieser Version“ – finaler Freigabeentwurf

Der folgende Text beschreibt ausschließlich sichtbare V1.1-Funktionen und
bleibt bis zu Mahles sprachlicher Freigabe ein Entwurf:

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

Nur wenn die strukturierten Feedback-Checkpoints im finalen Production-Stand
wirklich aktiv sind, folgt zusätzlich:

> An vier Punkten des Programms können Athleten freiwillig strukturiertes
> Feedback zur Verständlichkeit und Alltagstauglichkeit geben.

Jarvis, KI-Analyse, optionale Kommentare, wissenschaftliche Wirksamkeit,
Leistungssteigerung, Gehirnveränderung oder nicht vorhandene individuelle
Personalisierung gehören nicht in diesen Marketingtext.

Eine Aktualisierung der Store-Screenshots wird erst nach dem physischen Test
des finalen sichtbaren RC entschieden.

## 7. Reihenfolge bis zur Einreichung

1. Empfohlenen Production-Datenumfang und qualifizierte DE-Privacy-/Minor-
   Freigabe schließen.
2. Exakt aktivierten Organisations-, Feedback- und Jarvis-Datenweg belegen.
3. Privacy-Antworten, öffentliche Datenschutzerklärung und Review Notes
   byte-/verhaltensnah angleichen.
4. Finalen signierten Production-RC erzeugen und physisch auf iPhone und iPad
   testen.
5. `What's New`, Screenshots und Reviewer-Konten final freigeben.
6. Erst danach Archive, TestFlight und App-Store-Update getrennt freigeben.
