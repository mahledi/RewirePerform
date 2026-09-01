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
- maschinenlesbarer Zweck-, Datenklassen- und Outputvertrag
- zwölf fail-closed Governance-Gates vor jeder Protokollaktivierung
- Quellen-Mapping-Sperre gegen fachlich nicht freigegebene Verbindungen
- Widerrufs-/Löschpfad und 365-Tage-Dry-Run-/Retention-Pfad
- getrennte Lifecycle- und Zugriffs-Audits ohne direkte Identifikatoren

## Absichtlich nicht aktiv

- kein Production-Schema angewendet
- kein Backfill der 27 oder anderer realer Pilotantworten
- keine echte Athleten-, Coach-, Admin- oder Jarvis-Oberfläche verbunden
- keine neue Einwilligung angezeigt oder gespeichert
- keine Store-/Privacy-Erklärung geändert
- keine Rohantwort, kein Freitext, kein Name und keine E-Mail in das Evidenzmodell kopiert

## Block 9 – technisch gebaut, Freigaben weiter offen

Die Verträge und technischen Sperren sind lokal gebaut. Die bestehende V3-Einwilligung ist nur als `conditionally_compatible` dokumentiert. Erforderlich bleiben die tatsächlichen, nachweisbaren Freigaben zu Zweck und Rechtsgrundlage, Einwilligung, Minderjährigen/Guardian, Widerruf und Löschung, Aufbewahrung, Quellen-Mappings, Export, Zugriffsprüfung, DPIA-Schwellenprüfung sowie Privacy- und Store-Angaben. Erst danach darf eine getrennte Migration den Protokollstatus aktivieren und ein separat freigegebener Backfill starten.
