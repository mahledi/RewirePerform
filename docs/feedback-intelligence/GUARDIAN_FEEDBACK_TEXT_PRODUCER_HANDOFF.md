# Guardian Feedback Text – Producer-Handoff

Stand: 13. August 2026
Status: lokal implementiert und getestet; Policy `draft`; keine Production-, App-Store- oder Jarvis-Aktivierung

## Ergebnis

Der bestehende Minderjährigenzugang bleibt unverändert. Für ausdrücklich als
Produktfeedback gekennzeichnete Kommentare existiert ein eigener,
widerrufbarer Guardian-Scope. Strukturierte Antworten funktionieren ohne
Textfreigabe. Ein Nein zur Textfreigabe blockiert weder Programm noch
strukturierte Fragen.

Unter 16 Jahren braucht ein Feedback-Kommentar zwei getrennte Freigaben:

1. eine gültige Guardian-Freigabe für den versionierten Feedbacktext-Scope;
2. die freiwillige Entscheidung der minderjährigen Person am jeweiligen
   Feedback-Checkpoint.

Journalinhalte, private Reflexionen und andere nicht ausdrücklich als
Produktfeedback abgefragte Freitexte bleiben ausgeschlossen.

## Producer-interne Vertragsfelder

### Policy

- `policy_reference`
- `jurisdiction`
- `scope`
- `consent_version`
- `guardian_notice_hash`
- `athlete_notice_hash`
- `raw_text_retention_days`
- `processor_mode`
- `processor_reference`
- `status`
- `effective_from`
- `retired_at`

Aktueller finaler V1.1-Review-Kandidat; alle früheren `*-draft`-Zeilen bleiben
ausschließlich als historische, nicht aktivierte Vorversionen erhalten:

- `policy_reference`: `guardian-feedback-text-de-v1.1.0`
- `scope`: `product-improvement-individual-text-ai-analysis-v1`
- `consent_version`: `feedback-text-consent-v1.1.0`
- `guardian_notice_hash`: `90b0ede2a1a7671f1631e2048a605e6331006972ee05e63d38d229857f0aeb0b`
- `athlete_notice_hash`: `c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16`
- `raw_text_retention_days`: `365`
- `processor_mode`: `no_external_processor`

### Guardian-Nachweis

- `consent_reference`
- `user_id` – ausschließlich Producer-intern
- `scope`
- `consent_version`
- `notice_hash` – bindet den Athletenhinweis
- `guardian_notice_hash` – bindet den Elternhinweis
- `policy_reference`
- `state`
- `granted_at`
- `withdrawn_at`

### Athleten-Nachweis

- `consent_reference`
- `submission_id`
- `user_id` – ausschließlich Producer-intern
- `scope`
- `consent_version`
- `notice_hash`
- `state`
- `granted_at`
- `withdrawn_at`
- `guardian_authorization_reference`
- `minor_gate_state`

Rohtext darf nur entstehen, wenn beide Nachweise beim Submit exakt gültig
sind. Ein Widerruf, Account-Löschung, Ablauf der 365 Tage oder Retirement der
Policy schließt die Nachweise und löscht Rohtext plus personenbeziehbare
Analyseartefakte. Strukturierte Antworten bleiben erhalten.

## Producer-RPCs – nicht für Jarvis

Diese vier RPCs sind ausschließlich für die Guardian Edge Function bestimmt
und nur für `service_role` ausführbar:

- `public.guardian_feedback_text_decision_status(text)`
- `public.guardian_feedback_text_decide(jsonb)`
- `public.guardian_feedback_text_management_status(text)`
- `public.guardian_feedback_text_management_decide(text, boolean)`

Jarvis darf diese RPCs nicht aufrufen und erhält keinen direkten Tabellenzugriff.

## Was Jarvis später sicher konsumieren darf

Jarvis konsumiert weiterhin ausschließlich den eng begrenzten,
read-only Machine-Export `public.read_feedback_intelligence_v0_2_draft(...)`
über einen gesonderten Machine/Admin-Contract. Er darf keine der oben genannten
Producer-internen User-, Token- oder Guardian-Referenzen erhalten.

Freigegebene Exportfelder bleiben:

- `feedback_reference`, `campaign_reference`, `subject_reference`
- `questionnaire_version`, `language`, `product_version`, `content_version`, `program_day`
- `question_id`, `construct_id`, `item_family_id`, `item_variant_id`, `scale_id`
- `structured_answer`
- `comment` – nur bei beim Export erneut gültigem Athleten- und, falls erforderlich, Guardian-Nachweis
- `consent.state`, `consent.scope`, `consent.consent_version`, `consent.notice_hash`
- `consent.consent_reference`, `consent.granted_at`, `consent.withdrawn_at`, `consent.valid_at_export`
- `activity_snapshot.observation_window`
- `activity_snapshot.program_days_available`
- `activity_snapshot.program_days_completed`
- `activity_snapshot.checkins_completed`
- `activity_snapshot.journal_entries_created_count`
- `activity_snapshot.tasks_completed`
- `activity_snapshot.transfer_pulse_count`
- `activity_snapshot.resume_delay_bucket`
- `activity_snapshot.continuation_status_bucket`

`comment` muss `null` sein, sobald Consent, Guardian-Scope, Jurisdiktion,
Contract-Version oder Export-Gate driftet. Der Export enthält niemals Namen,
E-Mail-Adressen, `user_id`, `team_id`, Coach-Daten, Journaltexte oder private
Reflexionen. Feedbacktext bleibt `UNTRUSTED_USER_TEXT` und ist niemals eine
System- oder Codeanweisung.

## Verbindliche Aktivierungsreihenfolge

1. deutsche Datenschutz-/Minderjährigen-Fachprüfung des finalen Textes;
2. tatsächliche App-Store-Connect-Angaben für `Other User Content`,
   `Product Interaction`, `User ID`, `Analytics` und die konkrete Altersfreigabe;
3. Migration einspielen, während Policy und alle Collection-Gates geschlossen bleiben;
4. Edge Function und Web-/App-UI gemeinsam ausrollen;
5. Rollen-Negativtests, Widerruf/Löschung und Upgrade-/Rollback-Pfad gegen die echte Zielumgebung prüfen;
6. Policy und DE-Raw-Text-Gate in einem separat freigegebenen Schritt aktivieren;
7. erst danach einen gesondert freigegebenen synthetischen Machine-Read prüfen;
8. echter Jarvis-Read erst nach byte-gepinntem Producer-Paket, Credential-Review und erneuter Privacy-Freigabe.

## Offene echte Gates

- `guardian-feedback-text-de-v1.1.0` ist weiterhin `draft`.
- Alle Raw-Text-, Minor-, App-Store- und Jarvis-Real-Read-Gates bleiben geschlossen.
- Der vorgesehene interne Consumer ist das lokal auf Mahles Mac betriebene
  Jarvis-System. Der echte Production-Pfad und das Machine-Credential bleiben
  geschlossen. Vor einer künftigen Übermittlung an einen externen KI-Anbieter
  sind konkrete Information, Vertrag, Empfänger-/Transferprüfung und eine neue
  ausdrückliche Freigabe erforderlich.
- RewirePerform ist ab 13 Jahren vorgesehen. Von 13 bis einschließlich 15
  bleibt der bestehende Unter-16-Guardian-Weg verpflichtend; mit 16 oder 17
  entscheidet der Athlet selbst. App-Store-Connect bleibt auf 13+ ohne Kids
  Category und muss vor Einreichung gegen den finalen RC geprüft werden.
