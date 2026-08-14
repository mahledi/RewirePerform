# RewirePerform 1.1 — Android-Geräte-Smoke

Ziel: Das Gerät möglichst kurz behalten. Reihenfolge: zuerst Google-Konto-
Verifizierung, dann Installation und ein fokussierter 20–30-Minuten-Smoke.

## Vor 14 Uhr vorbereitet

- Owner-Google-Konto kennen und Zugriff sicherstellen.
- Play-Console-App auf dem neuen Gerät installieren.
- USB-C-Kabel bereithalten.
- Mac: JDK 21, Android SDK 36 und Platform Tools sind vorbereitet.
- Production-Build und lokales AAB dürfen nur als Evidence entstehen, solange
  Signing und Upload nicht separat freigegeben sind.

## 1. Google-Geräteverifizierung — zuerst

1. Nicht gerootetes Gerät mit Android 10 oder neuer verwenden.
2. In der Play Console am Mac den offenen Geräte-Task anzeigen.
3. QR-Code mit dem Gerät öffnen.
4. Play-Console-App installieren/öffnen.
5. Mit exakt dem Google-Konto des Play-Console-Owners anmelden.
6. Entwicklerkonto auswählen und „Verifizieren“ abschließen.
7. Am Mac kontrollieren, dass der Geräte-Task verschwunden ist.

Diese Verifizierung ersetzt weder Identitäts- noch Telefonprüfung.

## 2. Lokale Testinstallation

Falls die Play-App noch nicht angelegt werden kann:

1. Entwickleroptionen aktivieren: Einstellungen → Über das Telefon → siebenmal
   auf Build-Nummer tippen.
2. USB-Debugging aktivieren und den Mac einmalig autorisieren.
3. Gerät per Kabel anschließen.
4. Agent prüft `adb devices` und installiert ausschließlich den lokal geprüften
   QA-Build. Kein Play-Upload ist dafür nötig.

Vorbereitetes QA-APK:
`android/app/build/outputs/apk/debug/app-debug.apk`, SHA-256
`cdd1406f9803dd70f2ccf7ea662b4f9e95b034ea1536bc86eab812d891412463`.
Es ist nur mit dem lokalen Debug-Key signiert und darf nie in Play hochgeladen
werden.

## 3. Golden Smoke

### Start und Darstellung

- Kaltstart: Splash, Logo, keine weiße Fläche, kein Crash.
- Hochformat und einmal Querformat: kein abgeschnittener Inhalt.
- Tastatur bei Login, Journal und Feedback: aktives Feld und Primärbutton
  bleiben erreichbar; Zurück-Taste schließt zuerst die Tastatur.
- System-Zurück: navigiert einmal zurück; auf Startseite kein Loop/weißer Screen.

### Auth und Links

- Login mit synthetischem Erwachsenen-Testkonto.
- App vollständig beenden; `/auth`-Link öffnen; Cold Start landet korrekt.
- Bei laufender App denselben Test als Warm Start wiederholen.
- `/join` mit synthetischer Einladung prüfen.
- `/organization/invite` nur mit kontrollierter synthetischer Coach-Einladung
  prüfen; keine echte Person verwenden.
- Team-/Organisationsanfrage öffnet den Webweg mit `source=android`.

App Links können bis zum veröffentlichten `assetlinks.json` im Browser öffnen;
das ist ein bekanntes Signing-/Website-Gate, kein Grund, Routingsemantik zu
ändern.

### Kernprodukt

- Rollenauswahl Athlet/Coach zeigt die richtigen Einführungen, vergibt aber
  keine Rolle.
- Dashboard und heutiger Programmtag laden.
- Aufgabe öffnen/abschließen, Check-in speichern, Rückkehr aufs Dashboard.
- Journal/Reflexion speichern und erneut öffnen.
- Ruhetag-Atmung/Visualisierung öffnen und beenden.
- Coachkonto: Teamübersicht lädt; private Athleteninhalte bleiben unsichtbar.

### Android-spezifisch

- Benachrichtigungsdialog auf Android 13+ erscheint erst nach Nutzeraktion.
- Erlauben: Reminder planen; App schließen; Testbenachrichtigung prüfen.
- Ablehnen: neutraler Hinweis auf Geräteeinstellungen, kein iOS-Text.
- Spracheingabe: Permission, Start, Stop, Ergebnis oder klarer
  Nicht-unterstützt-Zustand; keine Audiodatei darf als Appdaten-Upload sichtbar
  sein.
- Offline starten und wieder online gehen: kein Crash, verständlicher Zustand.
- Große Schriftstufe und Dark Mode kurz prüfen.

### Datenschutz und Löschung

- Privacy-Seite in der App erreichbar.
- „Mehr → Konto & Daten → Account löschen“ erreichbar; Löschung nur mit dafür
  vorgesehenem synthetischem Weg tatsächlich ausführen.
- Keine privaten Inhalte in Benachrichtigungen oder Coachansicht.

## 4. Screenshots

Mindestens vier echte Android-Portrait-Screenshots ohne Benachrichtigungen oder
persönliche Daten aufnehmen, idealerweise 1080 × 1920:

1. Rollenauswahl,
2. Athleten-Dashboard,
3. Tagesroutine,
4. Ruhetag-Visualisierung,
5. optional Coach-Teamübersicht.

## Abbruchkriterien

Sofort stoppen bei Crash, falschem Backendziel, echten personenbezogenen
Testdaten, sichtbarem Secret, Auth-/Rollenbypass, privatem Inhalt in Coach-
Ansicht/Notification, verlorenem Invite-Token oder unerwarteter sensibler
Berechtigung. Keine spontane Routing-, Auth-, Consent- oder Datenbankänderung
am Gerät vornehmen.
