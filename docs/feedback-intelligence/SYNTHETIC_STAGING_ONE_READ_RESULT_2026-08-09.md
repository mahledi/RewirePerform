# Feedback Intelligence – synthetischer Staging-Einmal-Read am 9. August 2026

## Ergebnis

Der freigegebene Operator hat exakt einen synthetischen DE-Staging-Request
gesendet. Der Gateway-Transport antwortete, der Jarvis-Consumer lehnte die
Payload jedoch fail-closed mit `MACHINE_EXPORT_CONTRACT_INVALID` ab.

- Request-ID: `5b43cd02-cca2-424b-a098-76e7c0997c8d`
- Netzwerkbudget: `1/1` verbraucht, kein Retry
- Production: nicht geöffnet
- Echtdaten: nicht gelesen
- Rohresponse, Rohtext und `subject_reference`: nicht persistiert

## Vollständiger Rückbau

Unmittelbar nach dem Request wurden alle vier temporären Edge-Secrets entfernt,
das Passwort von `mahleos_feedback_reader` auf `NULL` gesetzt, alle Machine- und
Synthetic-Gates geschlossen und die komplette synthetische Kohorte gelöscht.
Der lokale Machine-Key wurde durch den One-Shot-Finalizer aus dem macOS-
Schlüsselbund entfernt. Supabase zeigte anschließend wieder keine Custom
Secrets.

Der finale Zustand wurde separat bestätigt:

- synthetische Fixture-Nutzer: `0`
- Reader-Passwort vorhanden: `false`
- `consumer_pin_ready`: `false`
- `synthetic_export_enabled`: `false`
- `machine_credential_ready`: `false`
- sämtliche Privacy-, App-Store-, Minor- und Production-Gates: `false`
- Operatorstatus: `COMPLETE_POSTREAD_ASSURED`

Ein während der ersten, noch ungespeicherten Formulareingabe sichtbar gewordener
Reader-Wert wurde vor dem Request sofort verworfen und rotiert. Der angezeigte
Wert war beim Request bereits ungültig und wurde nie als Edge-Secret gespeichert.

## Audit-Nachweise

- Pre-Read-Audit: `PASS_POSTDEPLOY_ASSURANCE`, SHA-256
  `75a8a2dd888d2549191f2a7c266d474b5735cd8b339e24cbc5532d80d76ef655`
- Post-Read-Audit: `PASS_POSTDEPLOY_ASSURANCE`, SHA-256
  `69c3fee4796d5cf8c8d31c57da19495ca8bd49e9e15705dedaf149e7fe233cac`
- Reader effektiv: genau eine RPC, keine Relationen, keine Sequenzen und keine
  Standardrollen-Nebenpfade

## Reproduzierter Contract-Drift

Der exakte Fehler wurde ohne weiteren Netzwerkrequest mit derselben
synthetischen 825-Item-Kohorte lokal reproduziert:

`FeedbackIntelligenceV02Error:V02_DECLINED_CONSENT_METADATA_INVALID`

Bei ausdrücklich abgelehntem Freitext-Consent exportierte der Producer korrekt
keinen Kommentar und `valid_at_export=false`, zusätzlich aber eine gehashte
Receipt-Referenz ohne `granted_at`. Diese Kombination ist für den Consumer
absichtlich ungültig.

## Lokale Remediation

Die neue additive Migration
`20260809093000_feedback_intelligence_declined_consent_export_remediation.sql`
minimiert den Export:

- strukturierte Antworten bleiben bei Ablehnung vollständig erhalten;
- Kommentar bleibt `null`;
- eine Receipt-Referenz wird nur für `granted` oder `withdrawn` exportiert;
- Widerrufsmetadaten eines früher gültigen Grants bleiben auditierbar;
- keine Grants oder Tabellenrechte werden hinzugefügt.

Der vollständige lokale 825-Item-Export besteht danach sowohl den v0.2-
Consumer-Validator als auch die v0.3-Founder-Summary-Auswertung. Die komplette
Producer-CI ist grün: 111 Testdateien, 664 Tests, alle SQL-Prüfungen, Build und
statische App-Store-Readiness.

Aktualisiertes lokales Gateway-Paket:

- Manifest SHA-256: `b5e71cd88109365030ea39b9bc7f603bf2723443092389a3651475c85381bcb0`
- Package SHA-256: `f9ab2b1a6d6c04810997caaae2833503d35b79939a335caefef31045d4147629`
- Status: unsigned, lokal, nicht aktiviert

## Nächster Gate

Zulässig ist jetzt nur der unabhängige bytegenaue Consumer-Review der
Remediation. Migration/Deployment, neue Credentials, erneut geöffnete Gates und
ein zweiter Netzwerkrequest benötigen anschließend eine neue ausdrückliche
Freigabe. Production und Echtdaten bleiben geschlossen.
