# Feedback Intelligence – Machine Export 0.2 Draft

Stand: 2026-08-05  
Status: `PRODUCER_CONFIRMED_DRAFT_NOT_ACTIVATED`

## Gebauter Vertrag

Der lokale Producer stellt die Funktion

`public.read_feedback_intelligence_v0_2_draft(client_id, contract_version, schema_sha256, data_scope)`

bereit. Der JSON-Output entspricht byte-gepinnt der von Jarvis akzeptierten Datei [`contracts/v0.2/proposed-export.schema.json`](./contracts/v0.2/proposed-export.schema.json), SHA-256 `fb1ef751bc4701a497f224bb421220e08b3387eba5c2eaec9e91e2cbf474b4e9`.

Die Funktion besitzt aktuell bewusst **keinen ausführungsberechtigten Datenbank- oder App-Actor**. `anon`, `authenticated`, `service_role`, Coaches und Admins haben kein Execute-Recht. Es existieren kein Machine-Credential, keine URL, kein Transport, kein Scheduler und keine Production-Freigabe.

## Fail-closed Gates

`feedback_core.machine_contract_settings` startet mit:

- `consumer_pin_ready = false`
- `synthetic_export_enabled = false`
- `production_export_enabled = false`
- `machine_credential_ready = false`
- `privacy_notice_ready = false`
- `app_store_declaration_ready = false`
- `minor_policy_ready = false`
- `producer_package_sha256 = null`

Ein Production-Read verlangt alle Production-Gates gleichzeitig. Eine spätere Freigabe braucht zusätzlich eine neue Migration, die genau einem dedizierten Machine-Actor nur Execute auf diesen RPC gewährt.

Der Export besitzt zusätzlich einen eigenen harten Länderfilter auf `submission.jurisdiction_at_submit = 'DE'`. Er verlässt sich nicht allein auf den vorgelagerten Athleten-Claim. Die versionierte Länder-Migration ist Bestandteil des byte-gepinnten Producer-Pakets; Nicht-DE-Submissions werden auch bei geöffnetem synthetischen Export-Gate nicht ausgegeben.

## Exportierte Felder

Je Item werden gehashte Feedback-, Campaign- und Subject-Referenzen, die Versionen, Programmtag, Question-/Construct-/Family-/Variant-/Scale-IDs, die strukturierte Antwort, ein optionaler consentierter Kommentar, der erneut geprüfte Consent-Status und der unveränderliche Activity-Snapshot ausgegeben.

Nicht exportiert werden `user_id`, `program_instance_id`, Namen, E-Mail, Team, Coachdaten, Journal-/Reflexions-/Supporttexte, Journaltextlänge oder Qualitätsableitungen.

## Referenz- und Versionskodierung

- Interne UUIDs oder Campaign-Strings verlassen die Datenbank nicht direkt.
- Exportreferenzen sind SHA-256 über Namespace, Referenzart und internen Wert.
- `subject_reference` bleibt innerhalb einer Programminstanz stabil und rotiert mit einer neuen Programminstanz.
- Der aktuelle Consumer erlaubt kein `+` in `product_version`. Die gespeicherte native Version bleibt unverändert; nur der Export codiert `1.1.0+5` ausdrücklich als `1.1.0_build_5`.

## Multi-Select und Freitext

- Eine Mehrfachauswahl wird als ein Item je ausgewählter Option exportiert. Alle Items teilen Feedback-, Subject- und Question-Referenz.
- Ein zugehöriger Fragekommentar erscheint nur beim ersten Options-Item, damit der Consumer denselben Rohtext nicht mehrfach analysiert.
- Der eigenständige Abschlusskommentar `__closing_comment__` passt nicht in das aktuelle Consumer-Schema, weil dort jedes Item eine registrierte strukturierte Antwort verlangt. Er bleibt in 0.2 vom Export ausgeschlossen. Eine spätere Contract-Version braucht dafür einen ausdrücklich typisierten `comment_only`-Datensatz; es erfolgt keine stille Schemainterpretation.

## Kohorten- und Umfangsgrenze

- Weniger als fünf unterschiedliche `subject_reference` ergeben ein leeres `items`-Array.
- Production und vollständig synthetische Daten werden nie gemischt.
- Das 0.2-Draft-Paket ist auf 5.000 Items begrenzt und schlägt bei Überschreitung geschlossen fehl; es schneidet nicht still ab.
- Alle Zusammenhänge bleiben `OBSERVATIONAL_NOT_CAUSAL`.

## Lokaler Nachweis

- byte-identisches Schema gegenüber Jarvis-Consumer
- synthetisches Paket mit fünf getrennten deutschen Subjects validiert; ein zusätzliches österreichisches Out-of-scope-Subject bleibt ausgeschlossen
- genau ein consentierter synthetischer Kommentar ausgegeben
- ungültiger Schema-Pin blockiert
- Production-Gate blockiert
- `anon`, `authenticated` und `service_role` ohne Execute
- erfolgreicher synthetischer Owner-Test erzeugt minimierten Access-Receipt

Dieser Nachweis prüft den lokalen Producer-Vertrag. Er ist kein echter Jarvis-Read und keine Freigabe für Credential, Netzwerk, Production, App Store oder Minderjährige.
