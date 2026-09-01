# V1.4 – offene Umsetzungspunkte

Status: `PREPARATION_ONLY`. Keiner der folgenden Punkte ist durch diese Dokumentation produktiv aktiviert.

Der Prozent-/Nenner-Fix für die Coach-Aktivitätsanzeige gehört **nicht** in diese Liste: Er ist als Backend-Korrektur auf `origin/main` und in Production aktiv. Für Programmtag 1 gilt teamweit `1/1 = 100 %` bei abgeschlossenem Check-in beziehungsweise `0/1 = 0 %` ohne Abschluss.

## 1. Team-Beobachtung von Evidence-Freigaben trennen

- Die operative Team-Beobachtung eines Coaches muss unabhängig davon nutzbar sein, ob bereits alle Athletinnen und Athleten für eine spätere gemeinsame Evidence-Auswertung freigegeben sind.
- Coach-Beobachtungen bleiben eine getrennte Datenklasse. Andere Coaches und Athleten dürfen persönliche Coach-Notizen nicht lesen.
- Jarvis, Exporte und gemeinsame Evidence-Auswertungen erhalten ausschließlich die freigegebene, aggregierte Projektion; weiterhin ohne private Athleteninhalte und mit `n >= 5`.
- Individuelle Zustimmungs-, Guardian- oder Ablehnungsdetails dürfen nicht unnötig an den Coach-Client ausgeliefert werden.
- Vor Umsetzung sind Speicherung, RLS, Rollen, Widerruf, Aufbewahrung, Exportgrenzen und Tests verbindlich festzulegen.

Abnahme: Der Coach kann die Team-Ebene verwenden, während Evidence/Jarvis separat und korrekt gesperrt bleibt.

## 2. Coach-Dashboard zuverlässig aktualisieren

- Aktivitätsdaten beim erneuten Sichtbarwerden beziehungsweise beim Wechsel zurück zur Übersicht gezielt aktualisieren.
- Eine manuelle Aktualisierung und einen klaren Stand-Zeitpunkt anbieten.
- Falls Polling verwendet wird: nur sichtbar, begrenzt und ausschließlich für das leichte Aktivitäts-RPC; keine dauernden Vollreloads oder Mental-State-Abfragen.
- Request-Races, Doppelabfragen, Hintergrundfehlerfluten und unnötige Spinner verhindern.
- Fokus-, Sichtbarkeits-, Cleanup-, Race-, Fehler- und Mobile-Lifecycle-Tests ergänzen.

Abnahme: Neu gespeicherte Aktivität erscheint zuverlässig ohne App-Neustart; die Oberfläche behauptet keine Echtzeit, wenn sie nur periodisch aktualisiert wird.

## 3. Block 9 – Evidence-Aktivierung

Vor jeder Production-Aktivierung des V1.4-Evidenzsystems müssen Zweck und Rechtsgrundlage, Einwilligung, Minderjährigen-/Guardian-Vertrag, Widerruf und Löschung, Aufbewahrung, Export, Zugriffsprüfung, DPIA/Datenschutz-Folgenabschätzung sowie Privacy- und Store-Angaben dokumentiert, fachlich geprüft und freigegeben sein.

Erst danach dürfen Production-Migration, Protokollaktivierung und ein separat geprüftes Backfill realer Pilotantworten erfolgen. Die vollständige Aktivierungsgrenze steht in `ACTIVATION_BOUNDARY.md`.

Abnahme: Rechtliche und produktseitige Freigaben sind belegt; Migration und Backfill besitzen getrennte Dry-Run-, Reconciliation-, Rollback- und Audit-Nachweise.
