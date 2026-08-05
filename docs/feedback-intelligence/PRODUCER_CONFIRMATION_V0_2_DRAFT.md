# Feedback Intelligence 0.2 – Producer-Bestätigung

Stand: 2026-08-05  
Status: `PRODUCER_CONFIRMED_DRAFT_NOT_ACTIVATED`  
Consumer-Vorschlag: Jarvis-Commit `d41350bceac0dae4d6899ef58e19cfbbcce37458`

## Ergebnis

Der RewirePerform-Producer akzeptiert die von Jarvis vorgeschlagenen Feldnamen für den lokalen `0.2.0-draft` grundsätzlich. Diese Bestätigung erlaubt die weitere lokale, synthetische Vertragsarbeit. Sie erlaubt keinen echten Read, kein Credential, keinen Transport und keine Production-Aktivierung.

Die maschinenlesbaren Entscheidungen stehen in [`contracts/v0.2/producer-decisions.json`](./contracts/v0.2/producer-decisions.json).

## Verbindliche Producer-Semantik

### Pseudonyme Verbindung

`subject_reference` ist innerhalb genau einer Programminstanz über Tag 10, 24, 39 und 55 stabil. Ein neuer Programmdurchlauf erzeugt eine neue zufällige Referenz. Dadurch sind Längsschnittvergleiche innerhalb des 56-Tage-Programms möglich, ohne eine lebenslang stabile Athletenkennung zu erzeugen.

Der Export gibt weder die interne UUID noch `user_id` oder `program_instance_id` aus. Referenzen werden im späteren Export als namespaced SHA-256-Hexwerte kodiert. Eine Änderung dieser Kodierung benötigt eine neue Contract-Version.

### Activity-Snapshot

Der Snapshot wird atomar beim finalen Feedback-Submit eingefroren. Er ist kumulativ von Programmtag 1 bis zum jeweiligen Checkpoint und wird danach nicht mit späterer Aktivität überschrieben.

- `program_days_available`: bis zum Checkpoint verfügbare kalendarische Programmtage.
- `program_days_completed`: unterschiedliche abgeschlossene Programmtage.
- `checkins_completed`: unterschiedliche Check-in-Daten.
- `journal_entries_created_count`: ausschließlich Anzahl unterschiedlicher Journaldaten.
- `tasks_completed`: Anzahl gespeicherter Aufgabenkennungen aus dem jeweils letzten abgeschlossenen Datensatz pro Programmtag; die Kennungen selbst werden nicht exportiert.
- `transfer_pulse_count`: bleibt `null`, bis Quelle und Zweck separat freigegeben sind.
- `resume_delay_bucket`: grobe Lücke vor der jüngsten Rückkehr zu einer Kernaktivität.
- `continuation_status_bucket`: grobe Lücke zwischen Checkpoint und jüngster Kernaktivität.

`SAME_DAY` bleibt im Consumer-Enum reserviert, wird vom Producer-Vertrag `feedback-activity-counts-v1.0.0` aber nicht ausgegeben. Bei unzureichender Datengrundlage wird `NOT_AVAILABLE` verwendet.

### Verbotene Quellen

Die Capture-Funktion liest keine Journalantworten, freie Reflexionen, Check-in-Reflexionen, Supporttexte, Textlängen, Coachbeobachtungen, Coachscores oder Teamdaten. Die Zusammenhänge bleiben `OBSERVATIONAL_NOT_CAUSAL`.

### Consent

Der kanonische Freitext-Scope lautet `product-improvement-individual-text-ai-analysis-v1`. Strukturierte Antworten bleiben ohne diesen Scope nutzbar. Ein Kommentar darf nur bei gültigem Consent beim Submit gespeichert und beim späteren Export erneut ausgegeben werden. Das Producer-Limit bleibt 1.200 Zeichen; das Consumer-Limit von 2.000 Zeichen ist nur eine obere Annahmegrenze.

### Mindestkohorte

Fünf ist die technische Untergrenze für aggregierte Ausgabe. Eine spätere freigegebene Privacy-Regel darf diese Grenze erhöhen. Die Grenze erlaubt keine Individualansicht und keine Umgehung durch wiederholte, überlappende Kleinstsegmente.

## Noch offene Gates

- Deutschland-Minor-/Guardian-Policy; alle Nicht-DE-Länder bleiben `out_of_scope`
- spezifischer Guardian-Text-Notice und Scope
- Privacy- und App-Store-Datenerklärung
- read-only Machine-Contract und Credential
- Rollen-Negativtests und byte-exaktes Producer-Paket
- synthetischer Staging-Read
- gesonderte Push-, Merge-, Deployment- und Production-Freigaben

`AWAITING_PRODUCER_PACKAGE` muss deshalb beim Consumer geschlossen bleiben.

## Consumer-Bestätigung

Jarvis hat die Producer-Entscheidungsdatei bytegenau als
`725d02fed9a58c5b688c5f83ddc2ae50784d4f56b9ac8d04e9b78891f7cbaefc`
geprüft und mit `ACCEPTED_WITH_EXPLICIT_LOCAL_DELTA` bestätigt.

Der lokale Consumer-Commit `d3c3666e0d3a17f25f8051e8996a9834cc81fe99` erzwingt nun zusätzlich:

- maximal 56 Journaldaten,
- `transfer_pulse_count = null`,
- Ablehnung von `SAME_DAY` für `feedback-activity-counts-v1.0.0`,
- Producer-Kommentarlimit 1.200; größere defensiv akzeptierte Werte werden als Contract-Abweichung quarantänisiert,
- `PRODUCER_CONFIRMED_DRAFT_NOT_ACTIVATED` aktiviert keine Verbindung.

Nachweis beim Consumer: 20 fokussierte Contract-/Privacy-Tests und 1.260 Jarvis-Gesamttests grün. Offen bleiben weiterhin das endgültige Envelope/Manifest, verschachtelte Consent-/Privacy-Subfelder, Export-RPC, Signatur, Credential und Rollen-Negativtests.

## Producer-Implementierungsdelta nach Consumer-Bestätigung

Der Producer hat den lokalen RPC `public.read_feedback_intelligence_v0_2_draft(...)` und die verschachtelten Consent-, Privacy- und Observation-Window-Felder nun exakt gegen das Consumer-Schema gebaut. Die Schema-Datei ist byte-identisch und hat SHA-256 `fb1ef751bc4701a497f224bb421220e08b3387eba5c2eaec9e91e2cbf474b4e9`.

Explizite, vom Consumer erneut zu bestätigende Semantik:

- native Produktversion `1.1.0+5` wird nur im Export als `1.1.0_build_5` codiert, weil `safeId` kein `+` erlaubt;
- Multi-Select wird als ein Item je Option ausgegeben; der zugehörige Kommentar steht nur am ersten Item;
- `__closing_comment__` wird in v0.2 nicht exportiert, bis ein `comment_only`-Item vertraglich definiert ist;
- Pakete unter fünf Subjects liefern keine Items; über 5.000 Items wird fail-closed abgebrochen;
- der RPC hat keinerlei Execute-Grant und alle Machine-/Production-Gates bleiben geschlossen.

Damit sind Schema und RPC lokal prüfbar. Package-Manifest/Signatur, dedizierter Machine-Actor, Credential, Transport und jeder echte Read bleiben offen.
