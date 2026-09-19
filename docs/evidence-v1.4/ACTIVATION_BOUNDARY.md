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
- getrennte Baseline-/Aktivitätsfenster je Programmlauf
- service-only Reconciliation ohne Identifikatoren oder Inhaltsdaten
- harte Sperre gegen alte Testmessungen und abgeleitete Progress-Snapshots

## Absichtlich nicht aktiv

- kein Production-Schema angewendet
- kein Backfill der 27 oder anderer realer Pilotantworten
- kein Production-Pilotfenster eingetragen und keine historische Zeile umklassifiziert
- keine echte Athleten-, Coach-, Admin- oder Jarvis-Oberfläche verbunden
- keine neue Einwilligung angezeigt oder gespeichert
- keine Store-/Privacy-Erklärung geändert
- keine Rohantwort, kein Freitext, kein Name und keine E-Mail in das Evidenzmodell kopiert

## Block 9 – enger Core intern entschieden, Production weiter gesperrt

Die Verträge und technischen Sperren sind lokal gebaut. Die bestehende V3-Einwilligung ist intern als `approved_core_scope` dokumentiert – ausschließlich für strukturierte, pseudonymisierte Core-Daten freiwillig freigegebener Personen im offiziellen Programmlauf. Coach-Beobachtungen, Push-Verhaltensanalyse und externe Matchdaten bleiben ausgeschlossen und benötigen eine neue V4-Entscheidung. Offen bleiben die qualifizierte externe Rechtsprüfung, die empfohlene kompakte DSFA, die fachlichen Quellen-Mappings, Export- und Zugriffsprüfung sowie der Abgleich der live hinterlegten Store-Angaben. Erst danach darf eine getrennte Migration den Protokollstatus aktivieren und ein separat freigegebener Backfill starten.
