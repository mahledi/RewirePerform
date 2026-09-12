# Synthetic Production Team Run

Stand: 27. Juli 2026

Status: vollstaendiger Ausfuehrungs- und Abnahmeplan; noch nicht in Production
ausgefuehrt.

## Ziel

Ein vollstaendiger synthetischer Teamlauf soll beweisen, dass dieselben
Production-Pfade wie bei einem echten Mannschaftspilot zusammen funktionieren:

- Auth und Rollen;
- Team und synchroner `program_run`;
- fuenf synthetische Athleten;
- Check-in, Completion, Comprehension und Transfer-Evidence;
- woechentliches Coach-Feedback;
- Pre/Mid/Post-Abdeckung;
- Mindest-n, Consent und Guardian-Grenzen;
- Data Lock;
- JSON-/CSV-Exporte;
- Ausschluss privater und echter Daten;
- vollstaendige Bereinigung.

Der Lauf beweist technische Betriebsfaehigkeit. Er beweist weder reale
Adhaerenz noch Wirksamkeit.

## Harte Voraussetzungen

Der Schreibtest darf erst beginnen, wenn:

1. der finale App-Store-Branch in `main` integriert ist;
2. die Migration `20260723101114`/Production-Version `20260723151225`
   reconciled ist;
3. der Redirect-Befund geschlossen ist;
4. alle 54 privilegierten Funktionen vom finalen `main` erneut geprueft sind;
5. `npm run ci`, `npm run privacy:verify`, Lint und Dependency-Audit gruen sind;
6. Mahle eine separate ausdrueckliche Freigabe fuer synthetische
   Production-Schreibdaten erteilt;
7. ein aktuelles Datenbank-Backup und ein verifizierter
   Bereinigungs-/Rollbackweg vorhanden sind.

## Testidentitaeten

Nur neu angelegte, eindeutig gekennzeichnete Testkonten:

- ein synthetischer Coach;
- fuenf synthetische Athleten;
- ein synthetischer Outsider;
- optional ein synthetischer Admin-Aufrufer aus dem bestehenden sicheren
  Adminweg.

Alle Testprofile, das Team und jede Programminstanz muessen die vorhandenen
Testflags tragen. Keine reale E-Mail, kein realer Name und keine Daten eines
echten Minderjaehrigen werden verwendet.

## Ablauf

### 1. Read-only Preflight

- Production-Projekt-ID, Migrationsliste und Edge-Function-Versionen erfassen.
- Rollenbestand nur als Zaehler erfassen.
- Doppelte aktive Programminstanzen suchen.
- Trackingzeilen ohne `program_instance_id` zaehlen.
- aktive Runs, gemischte Testflags und ungueltige Evidence-Locks pruefen.
- 54 Funktionsrechte, `anon`-Sperren und Suchpfade erneut erfassen.
- Baseline-Zaehler fuer alle spaeter bereinigten Tabellen speichern.

Abbruch bei jeder nicht erklaerten Abweichung.

### 2. Team und Run

- Testteam ueber den vorgesehenen Admin-/Coach-Flow erstellen.
- Coach bestaetigen und Team zuordnen.
- fuenf Testathleten mit dem regulaeren Athletenweg beitreten lassen.
- benannten Run `SYNTHETIC-TRACKING-FINAL-GATE-YYYYMMDD` erstellen.
- Run aktivieren und Teammitglieder zuweisen.
- beweisen: genau eine aktive Programminstanz pro Athlet, identische
  `program_run_id`, identisches Startdatum, keine Veraenderung realer Instanzen.

### 3. Rollen-Negativtests

- Outsider kann Teamstatus, Readiness und Coachdaten nicht lesen.
- Athlet kann Run weder erstellen, aktivieren, zuweisen noch abschliessen.
- Coach kann nur das eigene Team verwalten.
- `anon` kann keinen der 54 privilegierten RPCs ausfuehren.
- nicht administrative Konten koennen keinen Data Lock erstellen oder
  invalidieren.

Jeder Negativtest muss ohne Datenmutation enden.

### 4. Spielerpfad

Fuer jeden der fuenf Athleten:

- Pre-Messfenster abschliessen;
- Tag 1 vollstaendig speichern;
- identischen Save wiederholen und Idempotenz beweisen;
- mindestens einen der 16 Transfer-Tage im regulaeren Flow abschliessen;
- Comprehension speichern;
- einen privaten Journaltext als Canary erfassen.

Der Canary-Text darf spaeter weder in Coachansicht, Aggregat, Data Lock,
Export, Logs noch MahleOS erscheinen.

### 5. Zeit- und Messabdeckung

Nur ueber die vorhandene QA-Zeitsteuerung fuer Testteams:

- Tag 4: Transfer-Pulse;
- Tag 7: Coach-Wochenreview;
- Tag 28: Mid-Messung;
- Tag 56: Post-Messung und Abschluss.

Der Production-Kalender realer Nutzer darf nicht veraendert werden.

### 6. Mindest-n

- Mit vier freigegebenen Athleten: sensible Aggregate bleiben verborgen.
- Mit fuenf freigegebenen Athleten: Aggregate werden sichtbar und
  `low_confidence`.
- Widerruf eines Testathleten: Wert wird wieder unterdrueckt.
- erneute gueltige Freigabe: Wert wird nach serverseitiger Eligibility-Pruefung
  wieder sichtbar.

Teilnehmer- und Guardian-Status werden getrennt ausgewiesen. Fuer diesen
technischen Lauf duerfen nur die bereits freigegebenen synthetischen
Testpfade verwendet werden.

### 7. Coach-Review

- Teamreview speichern und idempotent wiederholen.
- individuelles Review nur fuer operative Beobachtung pruefen.
- keine Einzel-Check-ins, Assessment-Rohwerte, Journale oder Reflexionen an den
  Coach ausgeben.
- Freitext des Coach-Reviews bleibt ausserhalb externer Evidence-Exporte.

### 8. Data Lock

- aktiven, versionierten Data Lock fuer genau diesen Run erzeugen;
- Manifest, Schema-Version, `generated_at`, Sample, Missingness,
  Claim Boundary und SHA-256 erfassen;
- denselben Input erneut sperren und definiertes Verhalten pruefen;
- Lock nach Erstellung nicht mutierbar;
- absichtlich veraenderte Payload muss Checksum-Pruefung blockieren;
- invalidierter Lock darf nicht ausgeliefert werden.

### 9. Export

Erzeugen und schema-validieren:

- `dossier.json`
- `summary.csv`
- `data_quality.csv`
- `weekly_trends.csv`
- `assessment_aggregates.csv`

Automatisch verbotene Felder und Inhalte suchen:

- E-Mail
- Name
- User-ID
- Journal
- Reflexion
- Rohantwort
- individueller Score
- Guardian-Adresse oder Token
- Canary-Text

Jeder Treffer ist ein sofortiger Abbruch.

### 10. MahleOS-Paritaet

Die acht read-only Ansichten fuer den Testlauf abrufen. Erwartet:

- Production- und Testdaten bleiben getrennt;
- keine privaten Felder;
- kein falsches Gruen bei fehlender Messung;
- Data Lock erscheint nur aktiv und checksum-gueltig;
- Claim Boundary bleibt erhalten.

### 11. Bereinigung

- Testteam ueber den vorgesehenen QA-Archiv-/Bereinigungsweg archivieren.
- Evidence, Coach-Reviews, Snapshots, Run-Zuordnungen und Zeit-Overrides
  entfernen oder gemaess Vertrag archivieren.
- synthetische Auth-Konten ueber den dokumentierten Loeschpfad entfernen.
- Baseline-Zaehler erneut vergleichen.
- keine reale Zeile darf veraendert worden sein.
- ein minimiertes Testprotokoll ohne Identitaeten aufbewahren.

## Abnahme

Der Lauf ist nur gruen, wenn:

- alle positiven Pfade funktionieren;
- alle negativen Rollenpfade blockieren;
- keine Duplikate oder verwaisten Trackingzeilen entstehen;
- `n < 5` immer unterdrueckt bleibt;
- Test- und Productiondaten niemals gemischt werden;
- Export und MahleOS keine privaten Daten enthalten;
- Data Lock reproduzierbar und unveraenderlich ist;
- die vollstaendige Bereinigung nachgewiesen ist.

## Freigabeprotokoll

| Gate | Verantwortlich | Datum | Ergebnis |
|---|---|---|---|
| Finaler `main` gruen | Engineering |  |  |
| Backup/Restore bereit | Operations |  |  |
| Production-Schreibtest freigegeben | Mahle |  |  |
| Testlauf ausgefuehrt | Engineering |  |  |
| Privacy-Ausgabe geprueft | Privacy Review |  |  |
| Bereinigung bestaetigt | Engineering |  |  |
