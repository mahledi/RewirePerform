# Review – Synthetic Navigation Contract

## Ziel

Den bestehenden öffentlichen Browser-Smoke an die bereits aktive UI-Semantik anpassen, damit Guardian echte Navigationsfehler von veralteten Testannahmen unterscheiden kann.

## Ergebnis

- Die drei Passwort-Lookups adressieren das Eingabefeld eindeutig statt zusätzlich den Sichtbarkeits-Schalter zu treffen.
- Der Organisation-Review erwartet den aktuellen, absichtlich aktivierten Absende-Button.
- Produktcode, Auth-Verhalten, Datenzugriffe und Nutzeroberfläche bleiben unverändert.

## Geänderte Dateien

- `e2e/app-store-public.spec.ts`
- `Review.md`

## Tests und Checks

- Vollständige Suite `e2e/app-store-public.spec.ts`: PASS unter gesperrtem externem Netzwerk; nur localhost war erlaubt.
- Ausführung mit installiertem System-Chrome über den isolierten MahleOS-Harness: PASS.
- Keine Production-Daten, Credentials oder externen KI-Anbieter verwendet.

## Offene Risiken

- Der Fix wird erst nach erfolgreicher CI und Integration in `main` vom automatisch gestarteten Guardian verwendet.
- Ein grüner Browser-Smoke beweist die geprüften öffentlichen Flows, nicht sämtliche Produkt- oder Production-Flows.

## Empfohlener nächster Schritt

Branch pushen, CI abwarten, den Test-only-Diff integrieren und danach den RewirePerform-Audit-Worktree auf den neuen `origin/main`-Stand repinnen. Anschließend muss ein automatischer Guardian-Lauf beide betroffenen Journeys grün belegen.

## Risikostufe

R2 – test-only, keine Produkt- oder Datenmutation.
