# RewirePerform 1.1 — Google-Play-Review-Paket

Stand: 14. August 2026
Status: Play-App angelegt, Basiseinträge gespeichert und AAB lokal signiert;
kein Upload, Tester- oder Production-Rollout

## Releaseidentität

- integrierte Basis: `3edae2205f51e5248e7190b650313a897a559941`
- Android-RC: `6ea43fe682d3c9562560f015ec0736aeb6f0fecb`
- Android-Branch: `codex/android-v1-1-review-ready-20260814`
- Package: `com.rewireperform.app`
- Version: `1.1`
- Android `versionCode`: `1`
- iOS-Referenz: Version `1.1`, Build `7`
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

Die Texte sind als Entwurf in der Play Console gespeichert.

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
| Account-Löschung | in der App vorhanden | Website-/Apple-Track bereitet separat `https://rewireperform.com/account-deletion` vor; erst nach Live-200 eintragen |
| Zielgruppe | Produkt ist 13+; 13–15, 16–17 und 18+ | Google-Families-/DE-Minor-Prüfung vor externer Auswahl |
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

1. Browser-Dateiupload freischalten und Icon, Feature Graphic sowie reale
   Android-Screenshots hochladen.
2. Öffentliche Account-Deletion-Seite live schalten und Data Safety fertig
   ausfüllen.
3. Stabile synthetische Review-Konten hinterlegen sowie Zielgruppe und IARC-
   Fragebogen mit Mahles Bestätigung abschließen.
4. Play App Signing aktivieren und den signierten Production-AAB hochladen.
5. Reale Android-Smokes und Pre-launch Report abschließen.
6. Den Pilot als geschlossenen Test mit mindestens 12 echten, kontinuierlich
   angemeldeten Testern starten.
7. Nach mindestens 14 zusammenhängenden Tagen Production-Zugang beantragen.
8. Erst nach Googles Freigabe einen kontrollierten Production-Rollout starten.

## Externe Blocker

- Chrome-Dateiupload ist noch nicht für die Browser-Erweiterung freigeschaltet.
- Der öffentliche Play-App-Signing-Fingerprint entsteht erst bei Aktivierung
  von Play App Signing; der lokale Upload-Key-Fingerprint ersetzt ihn nicht für
  `assetlinks.json`.
- Öffentliche Account-Deletion-Webseite ist dem Website-/Apple-Track unter
  `https://rewireperform.com/account-deletion` zugeordnet. Der aktuelle
  Live-Aufruf liefert zwar HTTP 200, aber nur den SPA-Fallback/NotFound; die
  echte Seite muss noch separat gebaut, deployed und inhaltlich geprüft werden.
- Finale Data-Safety-, Zielgruppen-/Families- und Minderjährigenfreigabe fehlt.
- Das finale lokale Release-AAB ist mit dem privaten Upload-Key signiert und
  verifiziert, aber noch nicht hochgeladen.
- Review-Konten, finaler Upload, Tester-Rollout und Production bleiben externe
  Freigaben.

## Nicht durch dieses Paket autorisiert

Kein Push, Merge, Website-Deploy, Upload, Tester-Rollout, Production-Rollout,
Jarvis-Credential oder Echtdatenread.
