# V1.4 – Aufbewahrung, Widerruf, Zugriff und Backfill

Status: `TECHNICALLY_ENFORCED_LOCALLY__NOT_DEPLOYED`

## Aufbewahrung

Personenbeziehbare V1.4-Evidenz endet beim frühesten der folgenden Ereignisse:

- Widerruf der freiwilligen Datenbeitragsfreigabe;
- Kontolöschung;
- dokumentiertes Zweck-/Pilotende;
- spätestens 365 Tage nach Speicherung im V1.4-Evidenzmodell.

Minimierte gesetzliche Einwilligungsnachweise außerhalb des V1.4-Evidenzmodells bleiben nach ihrer eigenen veröffentlichten Frist bestehen. Vollständig anonyme, bereits gebildete Gruppenaggregate dürfen nur bestehen bleiben, wenn ein Rückschluss auf Personen praktisch ausgeschlossen ist.

## Technische Löschung

Ein Widerruf löscht in definierter Reihenfolge:

1. pseudonymisierte Messwerte;
2. Baseline-Snapshots;
3. V1.4-Autorisierungskopien;
4. die private Zuordnung zwischen Nutzerkonto und `subject_ref`.

Das Audit speichert danach nur Ereignisart und Zeilenzahlen, keine Nutzer-ID, E-Mail oder `subject_ref`. Die Kontolöschung muss denselben Löschpfad aufrufen. Die Aufbewahrungsroutine besitzt einen Dry-Run und einen getrennten Execute-Modus.

## Zugriff

- Athlet: nur die eigene private Entwicklung, nie andere Personen.
- Coach: nur freigegebene, serverseitig geschwellte Teamaggregate; keine individuellen psychologischen Werte.
- Admin/Evidence: pseudonyme Einzelwerte nur für den genehmigten internen Pilotzweck; jeder Abruf wird protokolliert.
- Jarvis/Export: ausschließlich ein gesondert freigegebener, minimierter und geschwellter Outputvertrag; kein direkter Tabellenzugriff.
- Browserrollen besitzen keinen Tabellen- oder Schema-Zugriff auf `evidence_private` oder `evidence_derived`.

## Backfill-Vertrag

Ein realer Backfill darf erst nach allen Governance-Gates erfolgen:

1. Dry-Run mit ausschließlich aggregierten Zählwerten: berechtigt, fehlende Einwilligung, fehlende Altersfreigabe, QA/Test, fehlende Programminstanz, falsche Instrumentversion.
2. Stichprobenfreie Reconciliation über Counts und Digests; keine Namen in Logs oder Exporten.
3. Execute nur für exakt versionierte, vollständige Quellen mit gültiger Einwilligung und Autorisierung zum Erfassungszeitpunkt.
4. erneute Reconciliation: Quellenzahl, Snapshots, Messwerte, Ausschlüsse, Duplikate und Fehler.
5. Rollback über den V1.4-Löschpfad, ohne operative Programmdaten anzutasten.

Der vorliegende Kandidat führt keinen Production-Backfill aus.
