

# Build-Fehler beheben

## Problem

Alle Pakete (`react-router-dom`, `lucide-react`, `framer-motion`, etc.) sind korrekt in `package.json` aufgeführt, aber `node_modules` ist nicht installiert. Der Fehler `vite: command not found` bestätigt das.

## Lösung

Ein einziger Schritt: **`bun install`** ausführen, um alle Dependencies zu installieren. Keine Code-Änderungen nötig.

| Datei | Änderung |
|---|---|
| (keine) | Nur `bun install` ausführen |

