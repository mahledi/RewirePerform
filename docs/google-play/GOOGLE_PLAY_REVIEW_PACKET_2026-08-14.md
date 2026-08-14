# RewirePerform 1.1 — Google-Play-Review-Paket

Stand: 14. August 2026
Status: lokal vorbereitet; keine Play-Console-Schreibaktion, kein Signing und kein Upload

## Releaseidentität

- Kanonische Basis: `997162b85d6982e318cbbcb5ba894d390b491720`
- Android-Branch: `codex/android-v1-1-review-ready-20260814`
- Package: `com.rewireperform.app`
- Version: `1.1`
- Android `versionCode`: `1`
- iOS-Referenz: Version `1.1`, Build `6`
- `minSdk` / `compileSdk` / `targetSdk`: `24 / 36 / 36`
- Production-Frontendziel: `bqsbxesmybthwtxmowfz`
- Vertrieb: kostenlos, Deutschland, manuelle Veröffentlichung

Die Package-ID ist technisch vorbereitet, aber noch nicht durch eine in der
Play Console angelegte App reserviert.

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

Vor der Eintragung bleibt Mahles sprachliche Freigabe erforderlich.

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
| App oder Spiel | App | keines |
| Kategorie | Sport | Mahle bestätigt die Store-Kategorie |
| Anzeigen | Nein | finalen AAB/SDK-Audit bestätigen |
| In-App-Käufe | Nein | keines |
| App-Zugriff | Login erforderlich | stabile synthetische Review-Konten erst nach separater Production-Freigabe erstellen |
| Datenschutz-URL | `https://rewireperform.com/privacy` | live und inhaltlich final prüfen |
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

1. Mahle reicht die Identitätsprüfung ein.
2. Um 14 Uhr: Play-Console-App auf einem nicht gerooteten Android-Gerät ab
   Android 10 installieren und das Gerät mit dem Owner-Konto verifizieren.
3. Nach Googles Identitätsfreigabe: Kontakttelefonnummer bestätigen.
4. App in der Play Console anlegen und `com.rewireperform.app` reservieren.
5. Play App Signing und privaten Upload-Key separat freigeben.
6. Signierten Production-AAB hochladen, App-Inhalt und Listing als Entwurf
   vervollständigen, dann internen Test starten.
7. Reale Android-Smokes und Pre-launch Report abschließen.
8. Den Pilot als geschlossenen Test mit mindestens 12 echten, kontinuierlich
   angemeldeten Testern starten.
9. Nach mindestens 14 zusammenhängenden Tagen Production-Zugang beantragen.
10. Erst nach Googles Freigabe einen kontrollierten Production-Rollout starten.

## Externe Blocker

- Entwicklerkonto: Identität, Gerät und danach Telefon noch nicht verifiziert.
- Google kann die Identitätsprüfung mehrere Tage bearbeiten.
- `App erstellen` ist bis zur Kontofreigabe gesperrt.
- Play-Signing-Fingerprint fehlt; deshalb kann `assetlinks.json` noch nicht
  finalisiert und separat deployed werden.
- Öffentliche Account-Deletion-Webseite ist dem Website-/Apple-Track unter
  `https://rewireperform.com/account-deletion` zugeordnet. Der aktuelle
  Live-Aufruf liefert zwar HTTP 200, aber nur den SPA-Fallback/NotFound; die
  echte Seite muss noch separat gebaut, deployed und inhaltlich geprüft werden.
- Finale Data-Safety-, Zielgruppen-/Families- und Minderjährigenfreigabe fehlt.
- Das lokale Release-AAB ist absichtlich nicht signiert und nicht uploadfähig;
  nach der Signing-Freigabe ist ein neuer finaler Build mit erneutem Audit nötig.
- Review-Konten, Signing, Upload und Play-Console-Einträge sind externe
  Schreibaktionen mit separater Freigabe.

## Nicht durch dieses Paket autorisiert

Kein Push, Merge, Website-Deploy, Signing-Key, Play-App-Anlage, Console-Write,
Upload, Tester-Rollout, Production-Rollout, Jarvis-Credential oder Echtdatenread.
