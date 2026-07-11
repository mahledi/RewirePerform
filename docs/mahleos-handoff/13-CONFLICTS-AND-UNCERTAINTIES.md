# Konflikte und Unsicherheiten

## Konflikte

### C-01 Supabase-Projekt-ID

- A: `supabase/config.toml` nutzt `bqsbxesmybthwtxmowfz`.
- B: CI und `docs/DEPLOYMENT.md` nennen `twceqincrbrenyuqukpj`.
- Ursache: Hosting-/Backend-Migration ueber mehrere Phasen.
- Auswirkung: Build oder Deploy kann gegen falsches Backend testen.
- Entscheidung: aktive Production-, Staging- und CI-Projekt-IDs festschreiben.
- Blockiert: produktive Backend-/CI-Aenderungen.

### C-02 Migrationsdokument noch Lovable-Phase

- A: `docs/MIGRATION.md` beschreibt Production noch auf Lovable Cloud.
- B: spaetere Commits, Vercel-Cutover und eigener Supabase-Client deuten auf abgeschlossenen Wechsel.
- Auswirkung: Runbook kann falsche Schritte ausloesen.
- Entscheidung: externen Live-Stand pruefen und Dokument aktualisieren.

### C-03 Team-Run-Limitierung historisch

- A: `docs/OUTCOMES_LIMITATIONS.md` sagt, echte `program_runs` seien deferred.
- B: Migration vom 10.07. implementiert `program_runs` und run-spezifische RPCs.
- Auswirkung: Agent koennte bereits geloestes Problem erneut bauen.
- Loesung: alte Datei als historische V1-Limitierung markieren.

### C-04 NLZ Privacy Audit Pre-Test-Text

- A: `NLZ_PRIVACY_AUDIT.md` sagt an einer Stelle, Migrationen seien noch nicht angewendet.
- B: juengerer `NLZ_FINAL_READINESS_REPORT.md` meldet Staging-Apply und 21/21 Checks.
- Auswirkung: Readiness uneindeutig.
- Loesung: juengeren Bericht fuer Staging bevorzugen, Production weiterhin unbestaetigt.

### C-05 Unmittelbare Prioritaet

- A: aktiver Branch `agent/nlz-pilot-readiness`.
- B: juengster langjaehriger Chat setzt 56-Tage-Sprachumbau als naechsten grossen Block.
- Entscheidung Mahle: erst Pilotgates oder erst Sprache Tage 1-7.
- Blockiert: keine Analyse, aber groessere Umsetzung ohne Reihenfolge.

### C-06 Lint-Gate

- A: README sagt Lint wegen Legacy Debt nicht Teil des Release-Gates.
- B: juengster Bericht meldet 0 Fehler, 16 Hinweise.
- Entscheidung: ob Lint jetzt verbindlich in CI aufgenommen wird.

### C-07 Account-Loeschung

- A: Privacy/Settings versprechen vollstaendige Loeschung innerhalb 48 Stunden.
- B: kein vollstaendiger Self-Service-/Admin-Loeschworkflow ist belegt.
- Auswirkung: rechtliches und App-Store-Risiko.
- Entscheidung: operativen Prozess dokumentieren oder Funktion bauen.

### C-08 Alters-/Consent-Modell

- A: Zielgruppe umfasst Minderjaehrige ab etwa 14.
- B: spezifischer Erziehungsberechtigten-/Vereins-Consent ist nicht klar implementiert.
- Auswirkung: Pilot- und Datenschutzrisiko.
- Entscheidung: juristische/organisatorische Regel vor breitem Minderjaehrigenrollout.

### C-09 Zielgruppenformulierung

- A: Teile von Code/Dokumentation sprechen allgemein von Sportlern/Athleten.
- B: alte Produktphasen koennen `young athletes` enger positioniert haben.
- Entscheidung: offizielle externe Zielgruppenzeile bestaetigen.

### C-10 App-Store-Push

- A: Web Push funktioniert auf HTTPS/PWA.
- B: native Capacitor-App kann diesen Pfad nicht gleich behandeln.
- Auswirkung: Settings duerfen im Native Shell keine kaputte Aktivierung zeigen.
- Entscheidung: V1 deaktivieren oder native APNs implementieren.

## Unsicherheiten

- Exakter Production-Commit und Vercel-Env-Stand.
- Ob die beiden neuesten Migrationen bereits produktiv angewendet wurden.
- Status von TestFlight/App Store Connect und Apple Developer Signing.
- reale Loesch- und Supportprozesse.
- juristisch gepruefte Minderjaehrigen-/Vereins-Einwilligung.
- ob alle 56 Tage denselben Content-Source-Pfad nutzen oder historische Backup-/Matrixdaten noch Teil einzelner Ansichten sind.

