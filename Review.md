# Review – Guardian Background Test Reliability

## Ziel

Den bestehenden kompletten RewirePerform-Testlauf im gedrosselten macOS-Guardian zuverlässig ausführen, ohne die normalen lokalen Testgrenzen zu lockern.

## Ergebnis

- Normale lokale Tests behalten das Timeout von 15 Sekunden.
- Ausschließlich der explizit markierte MahleOS-Hintergrundaudit erhält 60 Sekunden pro Test.
- Produktcode, Auth-Verhalten, Datenzugriffe und Nutzeroberfläche bleiben unverändert.

## Geänderte Dateien

- `vitest.config.ts`
- `Review.md`

## Tests und Checks

- Gezielter PGlite-Vertragstest mit aktiviertem Audit-Profil: PASS.
- Vollständiger CI-Lauf unter demselben gedrosselten macOS-Hintergrundprofil: vor Integration erforderlich.
- Keine Production-Daten, Credentials oder externen KI-Anbieter verwendet.

## Offene Risiken

- Das Audit-Profil verhindert falsche Timeout-Alarme unter niedriger macOS-Priorität; echte Fehler bleiben unverändert rot.
- Der automatische Guardian kann den Fix erst nach MahleOS-Integration und Repin auf den integrierten RewirePerform-Mainstand belegen.

## Empfohlener nächster Schritt

Beide test-only Änderungen isoliert integrieren und anschließend einen automatischen Guardian-Lauf auf einem stabilen RewirePerform-Mainstand abwarten.

## Risikostufe

R2 – Testinfrastruktur, keine Produkt- oder Datenmutation.
