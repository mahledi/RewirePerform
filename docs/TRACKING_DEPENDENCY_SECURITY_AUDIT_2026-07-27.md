# Tracking Dependency Security Audit

Stand: 27. Juli 2026

Basis: `origin/main` bei `e69a100` (PR #96 integriert)

## Reproduzierbarer Ist-Stand

`npm audit --omit=dev` meldet auf dem nach PR #96 gemeinsamen Stand:

- 0 kritische Befunde
- 0 hohe Befunde
- 2 moderate Befunde

Die zuvor dokumentierten Build- und Supply-Chain-Befunde wurden durch PR #96
geschlossen. Die beiden verbleibenden Meldungen betreffen `react-router` und
`react-router-dom`.

## Verbleibende Befunde

| Paket | Schwere | Realer Pfad | Bewertung |
|---|---|---|---|
| `react-router-dom@6.30.4` | mittel | App-Runtime | Open-Redirect-Advisory; user-kontrollierte Ziele laufen im vorhandenen Code ueber die strikte Internal-Route-Pruefung |
| `react-router@6.30.4` | mittel | App-Runtime/SSR | Redirect-Advisory wie oben; SSR-Hydration ist fuer diese Vite-`BrowserRouter`-SPA nicht aktiv |

## Runtime-Haertung

Die gemeinsame Internal-Route-Funktion und ihre Regressionstests blockieren:

- Backslashes und Kontrollzeichen;
- Schemes und protokollrelative Ziele;
- kodierte Umgehungen;
- fremde Origins.

Der zuvor konkret reproduzierte Redirectpfad ist damit auf dem aktuellen
`main` geschlossen. Das ersetzt nicht den spaeteren Bibliotheksupgrade, trennt
aber einen real ausnutzbaren Produktpfad sauber von einem formalen
Paket-Advisory.

## Geschlossene Build-Befunde

PR #96 hat die zuvor dokumentierten Befunde in Build- und CLI-Pfaden
kontrolliert aktualisiert. Auf dem finalen Stand meldet
`npm audit --omit=dev` keine hohen oder kritischen Production-Befunde mehr.

Der vollstaendige gemeinsame CI-Lauf nach dem Rebase ist gruen.

## Nicht als erreichbar eingestuft

Die React-Router-SSR-Hydration-Schwachstelle ist fuer die vorhandene
Vite-`BrowserRouter`-SPA ohne Server-Rendering nicht erreichbar.

## Gate

Aktueller Status auf `main`:

- **GRUEN** fuer den konkret nachgewiesenen und regressionsgetesteten internen
  Redirectpfad;
- **GELB** fuer den noch ausstehenden React-Router-Major-Upgrade-Pfad.

Das Dependency-Gesamtgate wird erst nach kontrolliertem Major-Upgrade,
Regressionstests, Web-/iOS-Verifikation und erneutem
`npm audit --omit=dev` vollstaendig gruen.
