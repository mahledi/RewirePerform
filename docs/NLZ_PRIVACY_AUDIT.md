# NLZ Privacy Audit

Stand: 10. Juli 2026
Scope: Mannschaftspilot, Tracking, Coach-Ansichten und Evidence-Exporte

## Kurzurteil

Die neue Pilot-Schicht trennt operative Aktivitätsdaten, private Spielertexte und aggregierte Evaluation technisch voneinander. Sensible Teamwerte werden serverseitig erst ab mindestens fünf unterschiedlichen Athleten ausgegeben. Unter zehn Athleten werden sichtbare Aggregate als `low_confidence` markiert.

Die Migrationen sind lokal erstellt, aber noch nicht auf eine Supabase-Umgebung angewendet. Vor einem echten Piloten müssen Migration, RLS und RPCs in einer Preview- oder lokalen Datenbank erfolgreich geprüft werden.

## Was erhoben wird

- Program Run, Programminstanz, Programmtag und Datum
- Tages-Check-in mit Stimmung, Energie, Fokus und weiteren 1-10-Pulswerten
- erledigte Aufgaben und Tagesabschluss
- Verständnis-Check mit Antwortstatus und Trefferzahl
- Anzahl der Journaleinträge
- validierte Pre-/Mid-/Post-Assessments
- RewirePerform Development Index Pre/Mid/Post
- Programmnutzung, Aktivität, Completion, Streaks und Missingness
- explizite Entscheidung zum optionalen Datenbeitrag inklusive Consent-Version und Zeitpunkt

## Private Inhalte

Folgende Inhalte bleiben im Spieleraccount und werden nicht an Coaches oder in Evidence-Exporte gegeben:

- Check-in-Reflexion
- Journalantworten
- freie Journalreflexion
- Dankbarkeitstexte
- freie Fragebogenantworten
- Rohantworten aus Assessments und Fragebögen
- individuelle psychologische Scores und Labels

Sentry ist aus der App entfernt. Tracking-Metadaten dürfen nur primitive technische Werte enthalten. Private Texte sind in `app_event_log` und Edge-Function-Prompts unzulässig.

## Rollen und Sichtbarkeit

### Athlet

Der Athlet sieht und bearbeitet die eigenen Inhalte. Ein Athlet kann sich nicht selbst einem gemanagten Program Run zuordnen und die Run-Zuordnung nicht verändern.

### Coach

Ein berechtigter Coach darf individuell nur operative Zustände sehen:

- Name
- letzte Aktivität
- absolvierte und verfügbare Tage
- Completion Rate und Streak
- Check-in-Anzahl der letzten sieben Tage
- Datum des letzten Check-ins
- Journalanzahl
- Inaktivitätsrisiko

Der Coach darf keine privaten Texte, Einzel-Check-ins, Einzel-Scores, Rohantworten oder psychologischen Spielerlabels erhalten. Team Pulse und Outcome-Veränderungen sind run-spezifisch und werden unter `n < 5` in SQL beziehungsweise in der Edge Function unterdrückt.

### Admin

Der Admin sieht Datenqualität und fehlende operative Zuordnungen. Die Pilot-Readiness darf Namen fehlender Spieler zeigen, damit Setup-Probleme behoben werden können. Diese operative Liste gehört nicht in externe Exporte.

Run-spezifische Evidence-Exporte enthalten nur consentierte Aggregate und keine Namen, E-Mails, Rohantworten, Texte oder Einzelverläufe.

## Consent-Regeln

- `null`: Es liegt noch keine Entscheidung vor. Die Person zählt nicht zur Evidence-Stichprobe.
- `false`: Die App darf regulär genutzt werden. Die Person wird nicht in Study-, Präsentations- oder Evidence-Auswertungen aufgenommen.
- `true`: Run-spezifische, anonymisierte beziehungsweise aggregierte Nutzung für Evaluation ist erlaubt.
- Jede Entscheidung speichert eine Consent-Version und `updated_at`.
- `consented_at` wird nur bei aktivem Opt-in gesetzt.
- Lokal vorgemerkter Consent zählt erst nach erfolgreicher Serversynchronisation.
- Ein Widerruf wirkt auf neu generierte Auswertungen. Bereits rechtmäßig erzeugte Snapshots müssen organisatorisch nach dem geltenden Datenschutzkonzept behandelt werden.

## Aggregationsgrenzen

- `n < 5`: keine psychologischen Mittelwerte oder Veränderungen
- `5 <= n < 10`: Aggregate sichtbar, aber `low_confidence = true`
- `n >= 10`: Mindestgröße für eine stabilere Pilotinterpretation, weiterhin keine Kausalität
- Jede tägliche und wöchentliche Pulse-Gruppe prüft die Zahl unterschiedlicher Athleten, nicht nur die Zahl der Check-ins.

## Run-Grenze

Jede neue Pilotmessung wird über `program_instance_id` einem `program_run` zugeordnet. Coach Pulse, Readiness und Evidence Dossier verwenden ausschließlich Instanzen dieses Runs. Historische Daten ohne Run-Zuordnung werden nicht automatisch in den neuen Run übernommen.

## Export-Grenzen

Erlaubt:

- Run-Metadaten
- Stichprobengröße und Consent Rate
- Nutzungs- und Adhärenzkennzahlen
- gruppierte tägliche und wöchentliche Trends ab `n >= 5`
- gruppierte Pre/Mid/Post-Veränderungen ab `n >= 5`
- Missingness und technische Datenqualität
- klare Claim Boundary

Verboten:

- E-Mail-Adressen
- private Texte
- Rohantworten
- einzelne Check-in-Verläufe
- individuelle Scores
- individuelle psychologische Profile oder Labels

## Aussagegrenzen

Zulässig sind Formulierungen wie:

- beobachtete Veränderung innerhalb des Program Runs
- Programmnutzung und Adhärenz
- aggregierte Teamtrends
- Anteil vollständiger Pre-/Post-Messungen

Nicht zulässig sind:

- bewiesen oder garantiert
- durch RewirePerform verursacht
- Diagnose oder medizinische Wirkung
- Bewertung der Persönlichkeit eines Spielers
- Wirksamkeitsbehauptung ohne geeignetes Studiendesign und Vergleichsbedingung

## Verbleibende Pflichtprüfungen

1. Migrationen in einer nicht produktiven Supabase-Umgebung anwenden.
2. RLS mit echten Athlete-, Coach- und Admin-JWTs testen.
3. `n=4`, `n=5` und `n=10` für jede sensible Ausgabe prüfen.
4. Exportdateien automatisiert nach verbotenen Feldnamen durchsuchen.
5. Account-Löschung und Consent-Widerruf mit Run-Daten testen.
6. Datenschutztexte juristisch für den tatsächlichen Vereinspilot prüfen lassen.
