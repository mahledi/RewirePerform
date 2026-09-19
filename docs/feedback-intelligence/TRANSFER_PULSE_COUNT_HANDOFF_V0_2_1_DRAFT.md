# Feedback Intelligence Transfer Pulse Count – Producer Handoff v0.2.1 Draft

Stand: 2026-08-10

Status: `PRODUCER_CONFIRMED_DRAFT_NOT_ACTIVATED`

## Producer-Entscheidung

`items[].activity_snapshot.transfer_pulse_count` ist für den lokalen
`0.2.1-draft` bestätigt. Die Quelle ist ausschließlich
`public.athlete_transfer_observations`. Gezählt werden eindeutige geplante
Programmtage desselben Athleten und derselben `program_instance` mit
`day_number` von 1 bis einschließlich Feedback-Checkpoint. Ein Tag zählt nur,
wenn `protocol_version` und `day_number` gemeinsam im versionierten
`public.evidence_transfer_schedule` vorkommen.

Bei einem späteren Protokollwechsel innerhalb derselben Programminstanz kann
derselbe Programmtag deshalb höchstens einmal zählen, selbst wenn für diesen
Tag je eine Observation unter der alten und der neuen Protokollversion
existiert. Nicht geplante oder manipulierte Zeilen erhöhen den Count nicht.

`not_observed = true` ist eine vollständig abgegebene Antwort und zählt daher
mit. Der Producer liest für dieses Feld ausschließlich die Anzahl. `score`,
`domain_id`, `event_type`, `response_duration_ms`, Consent-IDs und sonstige
Evidence-Inhalte werden weder in den Snapshot noch in das Machine-Paket
übernommen.

Die feldspezifischen Obergrenzen entsprechen dem versionierten
56-Tage-Transferplan:

| Feedback-Checkpoint | Maximale abgeschlossene Transfer-Pulse |
| --- | ---: |
| Tag 10 | 2 |
| Tag 24 | 6 |
| Tag 39 | 11 |
| Tag 55 | 15 |

Eine Überschreitung bricht Submit beziehungsweise Export fail-closed ab. Die
Eindeutigkeitsregel wird sowohl beim versionierten Backfill als auch beim
atomaren Feedback-Submit angewendet. Die Auswertung bleibt rein beobachtend
und erlaubt keine Kausalitäts- oder Wirksamkeitsaussage.

## Privacy- und Consent-Grenze

Transfer-Beobachtungen können nur über den getrennten Evidence-Pfad nach dessen
altersgerechter Autorisierung entstehen. Der neue Exportcount erweitert weder
den Produktfeedback-Freitext-Consent noch den Guardian-Scope. Strukturierte
Feedbackantworten und Aktivitätszählungen bleiben unabhängig vom freiwilligen
Freitext-Consent; Kommentare benötigen unverändert beim Submit und Export den
gültigen Athleten- und unter 16 zusätzlich den exakt passenden Guardian-Scope.

Ausgeschlossen bleiben private Journal-, Reflexions- und Supporttexte, Namen,
E-Mails, direkte User-/Team-/Coach-IDs, Transfer-Scores und direkter
Tabellenzugriff des Consumers.

## Versionierung und Gates

- Export-Contract: `0.2.1-draft`
- Export-Schema: `rewire-feedback-intelligence-export-v0.2.1-draft`
- Activity-Source-Contract: `feedback-activity-counts-v1.1.0`
- RPC-Signatur bleibt:
  `public.read_feedback_intelligence_v0_2_draft(text,text,text,text)`
- Consumer-Pin, synthetischer Export, Production-Export, Machine-Credential,
  Privacy-, App-Store- und Minor-Gate werden durch die additive Migration alle
  auf `false` zurückgesetzt.
- Der abgeschlossene `0.2.0-draft`-Staging-Zyklus beweist dieses neue Feld nicht
  und darf `0.2.1-draft` nicht autorisieren.

Vor jedem Read sind ein bytegenauer Consumer-Review, neue Gateway-/Schema-Pins,
Staging-Assurance und eine separate Aktivierungsfreigabe erforderlich. Diese
lokale Integration führt keinen Deploy, kein Credential und keinen Netzwerkread
aus.

## Definition-Pins

- `feedback_core.capture_transfer_pulse_count_on_submit()`:
  `f086a56c020cb5dad3cce0df754435368f5fcd8b02981f3ac5fcb98b0b87386a`
- `feedback_analysis.export_feedback_intelligence_v0_2_internal(...)`:
  `534d0d8770899566658b7efb68c6bc31cfecc068dcf5cf94c30f09143b2ab043`
- `public.read_feedback_intelligence_v0_2_draft(...)`:
  `d08d3fbf17420570ad6e8f29f0e3e19717a874f19a767c8eb7c7656acf7aedfd`

Die Hashes sind SHA-256 über `pg_get_functiondef(oid)` und werden im lokalen
PGlite-Verhaltenstest fail-closed geprüft.
