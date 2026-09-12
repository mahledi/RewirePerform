# RewirePerform 1.1 — Android-Gerätesmoke

Stand: 20. August 2026
Gerät: Redmi Note 7, Android 10, MIUI 12.5.1, WebView 150

## Physisch erledigt

- Start, Splash und final verkleinertes Launcher-Icon
- Registrierung und Login
- Athleten- und Coach-Dashboard
- Teambeitritt sowie Coach-/Athleten-Verbindung
- Minderjährigen- und Guardian-Weg einschließlich E-Mail
- Kernprogramm, Dashboard, Einstellungen und Kontolöschweg
- Tastatur bei Registrierung/Login ohne zusätzliche weiße Fläche
- Benachrichtigungskanal `rewireperform-reminders-v1` vom System angelegt

Mahle hat den finalen Launcher-Stand mit 60-Prozent-Foreground ausdrücklich
visuell freigegeben.

## Technisch per ADB bestätigt

- Paket: `com.rewireperform.app`
- unterstütztes Gerät ist verbunden
- Reminder-Kanal: Wichtigkeit 4, Vibration an, Badge an
- Android hat mindestens eine lokale RewirePerform-Erinnerung gepostet
- Manifest besitzt keine Kamera-, Mikrofon-, Kontakt-, Standort-, Speicher-
  oder Werbe-ID-Berechtigung

## Letzter Pflichtsmoke vor Veröffentlichung des Testtracks

1. Den aus Play gelieferten Build installieren.
2. Einmal kalt und warm starten.
3. Erinnerung auf zwei bis drei Minuten in die Zukunft setzen und speichern.
4. App schließen und sichtbares Heads-up sowie Tippen auf die Notification
   prüfen.
5. Nach Live-Deployment von `assetlinks.json` einen echten `/auth`- und
   `/join`-Link prüfen; beide müssen die App statt MI Browser öffnen.
6. Play Pre-launch Report auf Crash/ANR/Richtlinienwarnungen prüfen.

## Bekannte externe Abhängigkeit

App Links können vor dem ersten Play-Upload noch nicht vollständig verifiziert
werden. Google stellt den endgültigen App-Signing-SHA-256 erst über Play App
Signing bereit. Erst dieser Fingerprint darf in `assetlinks.json` eingetragen
und auf `rewireperform.com` veröffentlicht werden.

## Abbruchkriterien

Nicht veröffentlichen bei Crash, falschem Backendziel, Auth-/Rollenbypass,
privatem Athleteninhalt in Coachansicht/Notification, verlorenem Invite-Token,
erneuter weißer Tastaturfläche oder nicht öffnenden App Links nach dem
Signing-Deployment.
