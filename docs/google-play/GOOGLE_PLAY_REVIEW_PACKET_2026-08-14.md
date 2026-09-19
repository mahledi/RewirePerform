# RewirePerform 1.1 — Google-Play-Review-Paket

Stand: 20. August 2026
Status: Play-App angelegt, Basiseinträge und Lösch-URL gespeichert, finaler
Code-2-AAB lokal signiert; kein Upload und kein Test- oder Production-Rollout

## Releaseidentität

- integrierte Basis: `07ae1c0579432de220c8098079d17eb4f26f1bea`
- Android-Build: `02f5a9011532be8e0583ffe1b431f253dcc495cd`
- Android-Branch: `codex/android-v1-1-review-ready-20260814`
- Package: `com.rewireperform.app`
- Version: `1.1`
- Android `versionCode`: `2`
- iOS-Referenz: freigegebene Produktversion `1.1`
- `minSdk` / `compileSdk` / `targetSdk`: `24 / 36 / 36`
- Production-Frontendziel: `bqsbxesmybthwtxmowfz`
- Vertrieb: kostenlos, Deutschland, manuelle Veröffentlichung

Die App ist in der Play Console angelegt; `com.rewireperform.app` ist dadurch
für RewirePerform reserviert.

## Store Listing — deutscher Entwurf

### App-Name

`RewirePerform`

### Kurzbeschreibung

`Mentale Routinen für Fokus, Druck und die nächste sportliche Aktion`

### Vollständige Beschreibung

```text
RewirePerform begleitet Athletinnen und Athleten 56 Tage lang mit klaren,
alltagstauglichen Mental-Performance-Routinen.

Kurze tägliche Einheiten unterstützen dich dabei, Fokus, Drucksituationen,
Fehlerreaktionen und die nächste sportliche Aktion bewusst zu trainieren. Zum
Ablauf gehören strukturierte Check-ins, Pre-Training-Routinen, geführte
Atmungs- und Visualisierungseinheiten sowie private Reflexionen.

Für Teams und Coaches bietet RewirePerform persönliche Einladungswege und klar
begrenzte operative Übersichten. Coaches sehen keine privaten Journale,
Reflexionen oder einzelnen psychologischen Werte.

RewirePerform ist ein nichtmedizinisches Mental-Performance- und
Reflexionsangebot. Die App stellt keine Diagnose oder Behandlung bereit und
verspricht keine bestimmte sportliche Leistungswirkung.
```

Die Texte sind als Entwurf in der Play Console gespeichert. Vor dem ersten
Test-Release werden sie noch einmal gegen den finalen App-Stand gelesen.

## Store-Assets

- App-Icon, 512 × 512, RGBA:
  `docs/google-play/assets/app-icon-512-rgba.png`
- Feature Graphic, 1024 × 500, RGB:
  `docs/google-play/assets/feature-graphic-1024x500.png`
- Smartphone-Screenshots: am realen Android-Gerät aufnehmen; mindestens zwei,
  empfohlen vier oder mehr im Format 1080 × 1920 (9:16).
- Vorgesehene Motive: Rollenauswahl, Athleten-Dashboard, Tagesroutine,
  Ruhetag-Visualisierung, Coach-Übersicht. Nur tatsächlich sichtbare Android-
  Oberflächen verwenden; keine iOS-Statusleiste.

Die lokalen Build-, Manifest-, SDK- und Artefaktprüfungen sind in
`docs/google-play/ANDROID_LOCAL_BUILD_EVIDENCE_2026-08-14.md` dokumentiert.

## App-Inhalt — vorbereitete Antworten

| Feld | Entwurf | Restgate |
| --- | --- | --- |
| App oder Spiel | App | gespeichert |
| Kategorie | Sport | gespeichert |
| Anzeigen | Nein | gespeichert; finaler AAB/SDK-Audit grün |
| In-App-Käufe | Nein | keines |
| App-Zugriff | Login erforderlich | stabile synthetische Review-Konten erst nach separater Production-Freigabe erstellen |
| Datenschutz-URL | `https://rewireperform.com/privacy` | gespeichert |
| Account-Löschung | in der App vorhanden | öffentliche URL `https://rewireperform.com/account-deletion` ist live und in Data Safety eingetragen |
| Zielgruppe | Produkt ist 13+; 13–15, 16–17 und 18+ | Auswahl und Families-Antworten final speichern |
| Inhaltsrating | IARC-Fragebogen wahrheitsgemäß ausfüllen | nur in der Play Console möglich |
| Datenweitergabe | keine Werbung, Datenbroker oder Tracking | Dienstleister-Einordnung im Data-Safety-Draft final bestätigen |

### Review-Zugang — nur in der Play Console eintragen

```text
Athlet: [SYNTHETISCHE ATHLETEN-E-MAIL]
Passwort: [PASSWORT]

Coach: [SYNTHETISCHE COACH-E-MAIL]
Passwort: [PASSWORT]

Alle bereitgestellten Konten, Teams und Werte sind synthetisch.

RewirePerform ist eine nichtmedizinische Mental-Performance- und Routine-App.
Die Auswahl „Athlet“ oder „Coach“ vor der Anmeldung vergibt keine technische
Rolle. Coach- und Teamrechte werden serverseitig geprüft. Die Kontolöschung
ist unter „Mehr → Konto & Daten → Account löschen“ erreichbar.
```

Keine Passwörter oder persönlichen Daten in dieses Repository schreiben.

## Schnellster zulässiger Veröffentlichungsweg

1. Google-Identität im offenen Console-Tab erneut bestätigen.
2. App-Inhalte/Data Safety vervollständigen und mindestens zwei echte Android-
   Screenshots sowie die vorbereiteten Store-Assets hochladen.
3. Play App Signing aktivieren und den signierten Code-2-AAB als noch nicht
   veröffentlichten internen Testentwurf hochladen.
4. App-Signing-Fingerprint in `assetlinks.json` übernehmen und live prüfen.
5. Pre-launch Report und den letzten Redmi-Heads-up-Smoke prüfen.
6. Erst nach separater Freigabe Tester hinzufügen und den internen Test
   veröffentlichen. Dieser Track ist der schnellste Pilot-Zugang; das Data-
   Safety-Formular wird dennoch jetzt vollständig für den späteren Closed Test
   vorbereitet.
7. Ein erforderlicher Production-Zugangstest wird ausschließlich mit echten
   Testern durchgeführt; keine Fake-Konten.

## Externe Blocker

- Ein neuer Play-Console-Tab verlangt aktuell eine erneute Google-
  Identitätsbestätigung.
- Der öffentliche Play-App-Signing-Fingerprint entsteht erst bei Aktivierung
  von Play App Signing; der lokale Upload-Key-Fingerprint ersetzt ihn nicht für
  `assetlinks.json`.
- Öffentliche Account-Deletion-Webseite ist unter
  `https://rewireperform.com/account-deletion` live; HTTPS/HTTP 200,
  Löschanleitung, Mailto und mobile Route wurden geprüft.
- Data Safety ist in Schritt 4 teilweise ausgefüllt: Name, E-Mail, Nutzer-ID
  und Telefonnummer sind abgeschlossen; Gesundheit/Fitness, App-Aktivität und
  App-Leistung sowie die Prüfung der nutzergenerierten Inhalte sind offen.
- Das finale lokale Release-AAB ist mit dem privaten Upload-Key signiert und
  verifiziert, aber noch nicht hochgeladen.
- Finaler Upload, Play-Formularübermittlung, Tester-Rollout und Production
  bleiben externe Console-Aktionen.

## Nicht durch dieses Paket autorisiert

Kein Tester wurde hinzugefügt und kein Test- oder Production-Release wurde
veröffentlicht. Jarvis-Credentials und Echtdatenreads bleiben geschlossen.
