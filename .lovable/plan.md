## Problem

`rewireperform.com` zeigt komplett schwarzen Screen. Konsole vom Live-Build:

```
ReferenceError: Cannot access 'A' before initialization
  at /assets/vendor-charts-rTwqY_xG.js:9:16763
```

Das ist ein **Temporal-Dead-Zone-Fehler durch die manualChunks-Konfiguration** in `vite.config.ts`. Recharts + d3 wurden in einen eigenen `vendor-charts`-Chunk gepackt, während React/Scheduler in `vendor-react` liegen. Recharts greift beim Initialisieren auf React-internes (react-is) zu, das durch das manuelle Splitting noch nicht initialisiert ist → Modul crasht *vor* dem ersten React-Render → leerer `<div id="root">`.

Das Problem hat nichts mit SpeakingSection oder FAQ zu tun. Es ist ein vorhandener Build-Konfig-Bug, der nach jedem Publish anders triggern kann, weil sich Modul-Reihenfolgen in Chunks verschieben.

## Plan

### 1. `vite.config.ts` — manualChunks entschärfen

Die manuelle Chunk-Aufteilung von Libraries, die untereinander Abhängigkeiten haben (Recharts ↔ React, Framer-Motion ↔ React, Radix ↔ React), entfernen. Rollup macht das von sich aus korrekt.

Konkret: den gesamten `build.rollupOptions.output.manualChunks`-Block löschen. Vite/Rollup baut dann automatisch sinnvolle Chunks pro dynamischem Import (Routes sind via `lazy()` bereits split — das ist die richtige Granularität).

Falls später Chunk-Größe ein Thema wird, kommen einzelne, **nicht-React-abhängige** Pakete (z. B. `date-fns`) zurück in eigene Chunks — aber niemals UI-Libs, die React zur Init-Zeit brauchen.

### 2. Globale `ErrorBoundary` einbauen

In `src/App.tsx` einen `ErrorBoundary`-Wrapper um den Router legen. Damit sehen Nutzer beim nächsten unbekannten Fehler wenigstens eine Meldung statt einem schwarzen Bildschirm, und wir loggen den Fehler nach `monitoring.ts`.

Neue Datei: `src/components/ErrorBoundary.tsx` (klassisches React-Error-Boundary mit `componentDidCatch` → `captureException` aus `lib/monitoring`).

### 3. Stale Service-Worker-Schutz (nur Doku-Hinweis)

Da bei früheren Deploys evtl. ein SW registriert wurde, kann auf manchen Geräten ein alter Bundle im Cache hängen. `registerSW.ts` nutzt bereits `autoUpdate` — nach dem neuen Publish wird der SW automatisch ersetzt. Falls einzelne Geräte weiter schwarz bleiben: 1× Hard-Reload (Ctrl/Cmd+Shift+R). Kein Code-Change nötig.

## Was du danach machst

1. Plan approven → ich baue die zwei Änderungen.
2. **Publish klicken** (Frontend-Change → muss manuell ausgerollt werden).
3. Auf `rewireperform.com` Hard-Reload (Cmd+Shift+R).
4. Falls noch schwarz: DevTools → Application → Service Workers → "Unregister", dann reload.

## Technische Details

- Datei `vite.config.ts`: Zeilen 54–84 (rollupOptions.output) ersetzen durch leeres `build: {}` oder Block ganz entfernen.
- Datei `src/components/ErrorBoundary.tsx`: neue Klasse-Komponente, fängt Render-Errors, zeigt Fallback-UI mit "App neu laden"-Button, ruft `captureException` auf.
- Datei `src/App.tsx`: `<ErrorBoundary>` als äußersten Wrapper innerhalb `AuthProvider`.

Keine Änderungen an Business-Logik, Backend, Auth oder UI-Inhalt.
