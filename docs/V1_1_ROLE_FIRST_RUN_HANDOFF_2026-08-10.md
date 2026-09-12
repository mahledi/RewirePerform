# V1.1 Role-first introduction handoff

## Ziel B

Vor der Anmeldung wählt ein neuer Nutzer genau einen Einstieg: Athlet oder Coach. Danach sieht er einen rollenbezogenen, hochwertigen Produktflug. Erst anschließend beginnt der passende bestehende Zugangsweg. Die Auswahl ist ausschließlich UX-Navigation; Rollen, Einwilligungen und Zugriffsrechte bleiben serverseitig verifiziert.

## Ausgang A

- Der Athletenflug war nur nach Registrierung über `/welcome` eingebunden.
- Native abgemeldete Nutzer wurden direkt nach `/auth` geleitet.
- Coaches sahen keine eigene Einführung.
- Sichere Coach-Wege bestanden bereits als persönliche E-Mail-Einladung oder kontrollierte Zugangsanfrage.

## Umgesetztes Delta

1. `/start` zeigt genau Athlet und Coach.
2. `/start/athlete` verwendet den bestehenden zehnteiligen Athletenflug unverändert als Produktgeschichte und übergibt danach `solo` oder `join` an Auth.
3. `/start/coach` zeigt zehn wahrheitsgetreue Coach-Szenen und führt danach entweder zur bestehenden Zugangsanfrage oder zur vorhandenen persönlichen Coach-Einladung.
4. `intro=athlete` setzt ausschließlich den versionsgebundenen lokalen UX-Marker, damit derselbe Flug nach Registrierung nicht erneut erzwungen wird. Minor-, Guardian-, Consent-, Questionnaire- und Team-Join-Gates bleiben bestehen.
5. Coach-Rollen werden nie aus der Auswahl oder aus Metadaten vergeben. Eine persönliche Einladung bleibt einmalig, E-Mail-gebunden und serverseitig geprüft.
6. Der iOS-Universal-Link-Vertrag umfasst nun `/organization/invite` mit genau einem 64-stelligen Token. Android App Links bleiben außerhalb dieses Blocks.

## Zustandsautomat

- abgemeldet, Native `/` → `/start`
- Athlet → Athletenflug → Athlete Auth → bestehende Athleten-Gates → verifizierter Athletenbereich
- Coach ohne Einladung → Coach-Flug → `/team-access?scope=single_team`
- Coach mit gültiger persönlicher Einladung → Coach-Flug → Organization Auth → bestehende Einladung → serverseitige Rollenprüfung → Coach-Bereich
- angemeldete Rückkehrer → direkt zum serverseitig verifizierten Rollenbereich

## Wahrheits- und Datenschutzgrenzen im Coach-Flug

- Synthetische Zahlen sind ausdrücklich als `Beispielansicht` markiert.
- Teamzustand wird nur aggregiert und ab mindestens fünf Antworten dargestellt.
- Coaches sehen Teilnahme und Aktivität, aber keine Journaltexte, freien Reflexionen, einzelnen Check-in-Antworten oder individuellen psychologischen Werte.
- Es werden keine Talent-, Startelf- oder Karriereentscheidungen behauptet.
- Es gibt keinen offenen Coach-Teamcode und keine automatische Account-Konvertierung.

## Nicht verändert

- keine Supabase-, DB-, RLS-, Migration-, Edge- oder Production-Aktivierung
- keine neue Auth-Rollenwahrheit
- keine Content-/Assessment-/Scoring-Änderung
- keine Android-App-Link-Konfiguration
- keine Connectivity-Dateien des parallelen Release-Blocks

## Verifikation

- fokussierte Routing-, Auth-Return-, AASA-, UI- und Privacy-Regressionstests
- reale Browserprüfung aller zehn Coach-Szenen bei 375×667, 390×844, 844×390, 1024×1366 und 1366×1024
- Rollenwahl, Athleten-Teamweg, Coach-Zugangsanfrage und persönliche Coach-Einladung end-to-end lokal geprüft
- vollständige CI und `app:build` sind vor dem finalen SHA-Handoff verpflichtend
- physischer iPhone-/iPad-Test und unabhängiger App-Store-Readiness-Review bleiben nach dem Handoff erforderlich
