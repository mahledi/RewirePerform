# App Store Technical Evidence

Stand: 18. Juli 2026

Scope: lokaler, nicht signierter Integrations- und Safety-Kandidat auf Basis von
`origin/main` `72fde61`. Tracking/Evidence und der vollstaendige E-Mail-Flow sind
bereits Teil dieser Main-Basis. Dieser Block hat weder Tracking- noch E-Mail-Code
veraendert.

Kein Push, Merge nach `main`, Deploy, Production-Write, Archive oder Upload.

## 1. Kandidat und Koordination

| Element | Verifizierter Stand |
|---|---|
| Arbeitsbranch | `codex/app-store-readiness-next-20260718` |
| Main-Basis | `72fde61` (`origin/main`) |
| Lokale Hardening-Commits | `a23ee0f`, `1566544`, `a336cd4` |
| Production-Ziel | Supabase `bqsbxesmybthwtxmowfz` |
| Ueberschneidung mit Tracking-Agent | keine Tracking-Migration, Tracking-UI, Evidence-Logik oder Programmdaten veraendert |
| Ueberschneidung mit E-Mail-Agent | keine; E-Mail-Bestaetigung, Passwort-Recovery und Transaktionsmails kamen bereits ueber Main |

## 2. Gruene lokale Gates

| Gate | Ergebnis am 18. Juli 2026 |
|---|---|
| `npm ci` | reproduzierbare Installation mit Lockfile bestanden |
| `npm run app:build` | Env- und E-Mail-Template-Validierung, Typecheck, Vite-Production-Build, 191/191 Tests in 37 Dateien, Evidence-SQL-Harness, statisches App-Store-Gate, Capacitor-Sync und eingebettetes Production-Ziel bestanden |
| Evidence-SQL-Harness | Migration, atomarer Rollback, `n >= 5`, RLS, deaktivierter Minderjaehrigenpfad und QA-Paritaet bestanden |
| `npm run test:e2e` | 41 bestanden, 4 bewusst uebersprungen; Desktop-Chromium sowie WebKit auf iPhone und iPad jeweils hoch/quer, inklusive E-Mail-Bestaetigung und Passwort-Recovery |
| WebKit-Skips | nur der echte Service-Worker-Offline-Test; er wird deterministisch in Chromium ausgefuehrt |
| `npm run lint` | 0 Fehler, 15 bekannte Warnungen |
| `npm audit --omit=dev` | 0 bekannte Production-Abhaengigkeitsschwachstellen |
| `npm run app:verify:public` | Live-Startseite, Privacy und Support auf Desktop und Mobile mit HTTP 200 und sichtbarer H1 |
| `npm run app:verify:xcode:build` | 9/9 mit Xcode 26.6, iOS SDK 26.5 und unsigniertem Simulator-Build |
| `npm run app:verify:simulator` | Installation, Start, Lebenszeichen und nichtleere Oberflaeche auf temporaerem iPhone 17 Pro Max und iPad Pro 13-inch M5 bestanden |
| Visuelle Simulatorpruefung | beide Screenshots ohne sichtbare Ueberlagerung, Abschneiden oder leere App-Oberflaeche |
| Native Privacy-Metadaten | `Info.plist` und eingebundene `PrivacyInfo.xcprivacy` syntaktisch gueltig |

## 3. Bewusst rote oder offene Gates

| Gate | Aktueller Stand |
|---|---|
| `npm run privacy:verify` | erwartetes Release-Stop: 7/14 bereit, 0 Invariantenfehler, 7 Privacy-/Minderjaehrigenblocker |
| `npm audit` | 2 Dev-Tooling-Befunde im Vite/esbuild-Pfad, 1 moderat und 1 hoch; der angebotene Fix erzwingt ein ungeprueftes Vite-8-Major-Upgrade |
| Apple Signing | 0 gueltige Signing-Identitaeten und kein Developer Team |
| Echter iPhone-Test | noch nicht moeglich beziehungsweise nicht ausgefuehrt |
| Archive/Privacy Report/Upload | noch nicht ausgefuehrt |
| App Store Connect | App-Record, Privacy-Antworten, Altersfreigabe, Review-Konten und Store-Material noch nicht final |

Die sieben Privacy-Blocker sind:

1. altersgerechte Autorisierung vor sensitiven Produktdaten;
2. Consent- und Altersfilter in `team-mental-state` vor `n >= 5`;
3. veraltete AI-Aussage in der sichtbaren Privacy-Seite;
4. konkrete Nennung der aktiven Infrastruktur-Provider;
5. Disclosure von Versand-, Oeffnungs- und Fehlerstatus bei Notifications;
6. Verantwortlicher und physische Kontaktanschrift;
7. Entfernung des sichtbaren Entwurfsstatus erst nach finaler Rechtspruefung.

## 4. Production read-only verifiziert

- Projekt `bqsbxesmybthwtxmowfz` ist `ACTIVE_HEALTHY`, Region `eu-central-1`, Postgres 17.6.1.
- Die Production-Migrationshistorie reicht bis `20260717091518_qa_evidence_parity_gate`.
- Die erwarteten Tracking-, Evidence-, E-Mail-, Reminder- und Account-Loeschfunktionen sind aktiv; ehemalige AI-Auswertungsfunktionen bleiben als deaktivierte Stubs vorhanden.
- Alle geprueften Public-Tabellen besitzen aktiviertes RLS.
- Es wurden ausschliesslich Projekt-, Schema-, Grant-, Function- und Advisor-Metadaten gelesen. Keine privaten Nutzerinhalte wurden gelesen und keine Daten wurden geschrieben.
- Der Security Advisor meldet unter anderem 12 fuer `anon` ausfuehrbare `SECURITY DEFINER`-Funktionen. Drei davon erlauben nach Quelltextpruefung eine konkrete Rollen- oder QA-Metadatenabfrage ohne ausreichende Aufruferbindung. Das ist vor einem realen Pilot zu haerten.

Die Klassifikation und der freigabepflichtige Reparaturplan stehen in
`docs/APP_STORE_PRIVACY_MINOR_SECURITY_DECISION_2026-07-18.md`.

## 5. Aussagegrenze

Dieser Nachweis belegt Build-, Test-, Browser-, unsignierte iOS- und technische
Privacy-Eigenschaften des aktuellen lokalen Kandidaten. Er belegt weder rechtliche
Freigabe noch Wirksamkeit, Kausalitaet, signierte Distribution, echtes
Geraeteverhalten oder App-Store-Annahme.
