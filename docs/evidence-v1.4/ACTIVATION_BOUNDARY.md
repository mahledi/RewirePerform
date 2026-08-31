# V1.4 Aktivierungsgrenze

## Lokal gebaut

- Messvertrag für exakt 36 wiederholbare Questionnaire-V2-Items
- sieben Konstrukte, Primär-/Explorativ-Trennung und geschützte Itemgrenze
- private Identitätszuordnung getrennt von pseudonymisierten Messwerten
- Pre/Mid/Post-Paarung, Schwellenklassifikation und Triangulation ohne Gesamtscore
- Kohortenstatistik mit Missingness und `n >= 5`
- fünfstufiges Claims Ledger mit gesperrter Kausalität
- vier getrennte Oberflächen als synthetische Entwicklungs-Vorschau
- SQL-Rollen-, RLS-, Grant- und Draft-Status-Prüfung

## Absichtlich nicht aktiv

- kein Production-Schema angewendet
- kein Backfill der 27 oder anderer realer Pilotantworten
- keine echte Athleten-, Coach-, Admin- oder Jarvis-Oberfläche verbunden
- keine neue Einwilligung angezeigt oder gespeichert
- keine Store-/Privacy-Erklärung geändert
- keine Rohantwort, kein Freitext, kein Name und keine E-Mail in das Evidenzmodell kopiert

## Block 9 vor jeder Aktivierung

Erforderlich sind mindestens dokumentierte und freigegebene Entscheidungen zu Zweck und Rechtsgrundlage, neuer Einwilligung, Minderjährigen/Guardian, Widerruf und Löschung, Aufbewahrung, Export, Zugriffsprüfung, DPIA/Datenschutz-Folgenabschätzung sowie Privacy- und Store-Angaben. Erst danach darf eine neue Migration den Protokollstatus aktivieren und ein separat geprüftes Backfill starten.
