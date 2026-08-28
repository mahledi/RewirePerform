# V1.3 Final-Freeze-Runbook

Status: `READY_FOR_FREEZE_EXECUTION`, aber noch nicht ausgeführt.  
Ziel: montags in einem kontrollierten Lauf vom finalen Main-SHA zum
hochladbaren iOS-Archiv.

## Vorbedingungen

- Mahle bestätigt den Wochenend-Freeze.
- Der letzte gewünschte Builder-Handoff ist integriert oder ausdrücklich auf
  V1.4 verschoben.
- `origin/main` ist bekannt und der Release-Worktree ist clean.
- App Store Connect bestätigt die nächste freie Buildnummer.
- Die bestätigte Production-Umgebung ist lokal verfügbar; keine Werte werden
  erfunden oder aus Logs kopiert.

## Freeze-Beleg

Vor Beginn dokumentieren:

```text
FINAL_MAIN_SHA=
RELEASE_SHA=
MARKETING_VERSION=1.3
BUILD_NUMBER=
PRODUCTION_SUPABASE_REF=bqsbxesmybthwtxmowfz
```

`RELEASE_SHA` darf sich nach Beginn von Build, Archiv, Screenshot-Abgleich und
Upload nicht mehr ändern.

## Pflichtprüfungen

```bash
npm ci
npm run ci
npm run release:verify:production
npm run app:build
npm run app:verify:xcode:signing
git diff --check
```

Zusätzlich:

- Xcode Archive/Validate ohne Signing- oder Privacy-Fehler;
- generierte absolute lokale Capacitor-/Package-Pfade nicht committen;
- eingebettetes Web-Bundle und Production-Projektbezug prüfen;
- reale iPhone-Smokes auf dem archivierten Stand;
- keine Console-Errors oder horizontale UI-Überläufe in den betroffenen Flows.

## Ergebnisstatus

- `PREPARED_NOT_FROZEN`: Inventar vorhanden, weitere Änderungen erlaubt.
- `FROZEN_TESTING`: SHA und Version fest, Prüfungen laufen.
- `READY_TO_UPLOAD`: alle lokalen und physischen Gates grün, noch kein Upload.
- `UPLOADED_PROCESSING`: Build bei Apple, noch nicht auswählbar.
- `READY_FOR_REVIEW`: Build verarbeitet, Metadaten/Screenshots/Privacy sichtbar
  abgeglichen, noch nicht eingereicht.
- `WAITING_FOR_REVIEW`: tatsächlich an Apple übermittelt.

Lokale Tests oder ein erfolgreicher Upload dürfen nicht als
`WAITING_FOR_REVIEW` bezeichnet werden.

