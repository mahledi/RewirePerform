# RewirePerform Performance Evidence: 56-Tage-Plan

Status: verbindliche Spezifikation; R4 lokal implementiert, noch nicht in Supabase angewendet oder ausgerollt

## 1. Ziel

RewirePerform soll innerhalb des bestehenden 56-Tage-Programms belastbar zeigen koennen:

- wie konsequent Athleten das Programm nutzen,
- wie sich standardisierte In-App-Leistung ueber die Zeit veraendert,
- welche Veraenderungen Athleten in Training und Wettkampf selbst beobachten,
- welche beobachtbaren Verhaltensveraenderungen Coaches wahrnehmen,
- wie vollstaendig, verlaesslich und interpretierbar die Daten sind.

Das System soll diese Quellen getrennt erfassen und erst in freigegebenen Evidence Snapshots zusammenfuehren. Es erzeugt keinen einzelnen "Mental Score" und keine Diagnose.

## 2. Nicht verhandelbare Produktgrenzen

### Das Programm bleibt 56 Tage lang

- Keine zusaetzliche Baseline-Woche vor Tag 1.
- Kein automatischer Follow-up-Zeitraum nach Tag 56.
- Eine technische Familiarisierung fuer objektive Tasks darf vor Aktivierung stattfinden, verlaengert aber nicht das Programm und wird nicht als Outcome ausgewertet.
- Ein spaeteres Forschungsprotokoll kann andere Designs nutzen. Das Produktprogramm selbst bleibt unveraendert.

### Der normale Daily Flow wird nicht verlaengert

- An 40 normalen Tagen entstehen **0 zusaetzliche Sekunden**.
- Ein Transfer Pulse erscheint hoechstens zweimal pro Woche und ersetzt an diesem Tag die optionale freie Check-in-Reflexion.
- Pro Transfer Pulse wird genau **eine** verhaltensnahe Frage gestellt.
- Zielzeit pro Pulse: 15 bis 25 Sekunden.
- Weil die bisherige Reflexion optional ist, wird die reale Mehrzeit nicht mit null angesetzt: maximal 20 Sekunden an 16 Tagen, also hoechstens 5 Minuten 20 Sekunden ueber das gesamte Programm.
- Die durchschnittliche Zusatzbelastung liegt damit bei hoechstens 5,8 Sekunden pro Programmtag; Performance-Lab-Sitzungen werden separat ausgewiesen.
- An Ruhetagen wird kein sportbezogener Transfer Pulse erzwungen.
- Performance-Lab-Sitzungen sind seltene, getrennt angekuendigte Messungen und kein weiterer Schritt jedes Daily Check-ins.

### Quellen bleiben getrennt

1. **Nutzung:** Completion, Check-ins, Comprehension und Missingness.
2. **Objektive In-App-Aufgabe:** standardisierte Taskleistung unter dokumentierten Bedingungen.
3. **Athletenbeobachtung:** kurze Selbstbeobachtung eines konkreten Verhaltens.
4. **Coach-Beobachtung:** unabhaengige, verhaltensnahe Fremdbeobachtung.
5. **Kontext:** Training, Wettkampf, Schlaf, Belastung, Geraet und Datenqualitaet.

Uebereinstimmung oder Abweichung zwischen Quellen wird sichtbar gemacht. Widersprueche werden nicht zu einem scheinbar praezisen Gesamtscore verrechnet.

## 3. Messkonstrukte

Die fuenf Evidence Domains bilden den Kern des bestehenden 56-Tage-Programms ab, ohne neue psychologische Eigenschaften zu erfinden.

| Domain | Im Programm verankert durch | Messbare Verhaltensfrage |
|---|---|---|
| Aufmerksamkeitsrueckkehr | Presence vs Outcome, Attentional Control, Reset | Wie schnell kehrt der Athlet nach Ablenkung zur naechsten relevanten Aktion zurueck? |
| Fehlererholung | Learning vs Judgement, Defusion, Umgang mit Fehlern | Wie schnell folgt nach einem Fehler wieder eine klare, aktive Handlung? |
| Druckregulation | Fear vs Love, Control vs Non-Control, Reappraisal | Kann der Athlet unter spuerbarem Druck handlungsfaehig bleiben? |
| Prozessorientierung | Process vs Result, Growth vs Winning | Bleibt die Aufmerksamkeit bei der ausfuehrbaren Aufgabe statt beim Ergebnis? |
| Handeln trotz Unsicherheit | Confidence vs Self-Doubt, Self-efficacy, Exploration | Setzt der Athlet die naechste sinnvolle Aktion auch ohne sich sicher zu fuehlen? |

Diese Domains sind Produktkonstrukte. Sie werden erst dann als validierte Skalen bezeichnet, wenn eine eigenstaendige psychometrische Validierung vorliegt.

## 4. Athleten-Transfer-Pulse

### Format

Ein Pulse besteht aus:

1. einer konkreten Situation aus dem gerade beendeten Training oder Wettkampf,
2. einer einzigen Frage zum eigenen Verhalten,
3. einer vierstufigen Antwort ohne neutrale Mitte,
4. der gleichwertigen Option `Nicht passiert / konnte ich nicht beobachten`.

Skala:

- 1 = noch nicht gelungen
- 2 = teilweise gelungen
- 3 = meistens gelungen
- 4 = klar gelungen
- nicht beobachtet = kein Score, kein Missing-Data-Fehler

Die Antwort wird nie als Charaktereigenschaft dargestellt. Ein niedriger Wert bedeutet nur, dass das beschriebene Verhalten in dieser konkreten Situation noch nicht klar gelungen ist.

### Rhythmus

Transfer-Pulse-Tage: 4, 7, 11, 14, 18, 21, 25, 28, 32, 35, 39, 42, 46, 49, 53 und 56.

Damit entstehen maximal 16 Einzelantworten ueber 56 Tage. Die fuenf Domains rotieren, damit nicht dieselbe Frage trainiert wird. Wenn der Kalendereintrag `rest` ist, wird kein Pulse angezeigt. Es gibt kein Nachholen und keinen Adhaerenzabzug.

### UX-Regel

- Der Pulse ersetzt die optionale freie Reflexion im Daily Check-in. Die Schrittzahl steigt dadurch nicht; fuer Athleten, die die Reflexion sonst uebersprungen haetten, entstehen trotzdem bis zu 20 Sekunden Mehrzeit.
- Ein Tap waehlt die Antwort; ein zweiter bewusster Tap auf `Weiter` bestaetigt sie.
- Die Option `Nicht passiert` ist gleichwertig sichtbar und niemals als Ausweg oder Fehler gestaltet.
- Kein Score, Konfetti, Streak-Bonus oder Vergleich direkt nach der Antwort.
- Nach dem Speichern wird nur neutral bestaetigt, dass die Beobachtung erfasst wurde.

## 5. Coach-Beobachtung

### Zweck

Coach-Feedback soll Transfer in beobachtbares Sportverhalten ergaenzen. Es ist keine Diagnose, kein psychologisches Spielerprofil und kein Ersatz fuer objektive Leistungsdaten.

### Rhythmus und Aufwand

- Ein Wochenreview pro Team, idealerweise nach der letzten gemeinsamen Einheit.
- Zielzeit fuer Teamreview: unter 90 Sekunden.
- Individuelle Beobachtungen sind optional und nur fuer Athleten zulaessig, die der Coach in der Woche tatsaechlich beobachten konnte.
- Batch-Interaktion statt eines eigenen Formulars pro Spieler.
- Keine Pflicht-Freitexte.

### Antwortlogik

Fuer jede Domain:

- `nicht beobachtet`
- `selten sichtbar`
- `teilweise sichtbar`
- `meistens sichtbar`
- `klar und stabil sichtbar`

Zusaetzlich wird die Beobachtungsgrundlage erfasst:

- Teamtraining
- Wettkampf
- Einzeltraining
- Sonstiger sportlicher Kontext

Coach-Antworten werden vor Abgabe nicht durch Athleten-Selbstberichte beeinflusst. Der Coach sieht weder private Reflexionen noch individuelle Check-in-Werte noch individuelle Assessment-Scores.

### Individualdaten

Eine individuelle Coach-Beobachtung darf nur als Beobachtung des beschriebenen Verhaltens gespeichert werden. Begriffe wie Talent, Mentalitaet, Ego, Charakter, Resilienzdiagnose oder psychische Stabilitaet sind nicht Teil des strukturierten Modells.

Fuer die erste Implementierung gilt:

- Athleten sehen individuelle Coach-Beobachtungen nicht.
- Nur der eingebende Coach kann seine individuelle Beobachtung erneut oeffnen.
- Individuelle Coach-Beobachtungen sind aus Website-, KI- und externen Evidence-Exports ausgeschlossen.
- Fuer Minderjaehrige bleibt die Evidence-Erhebung gesperrt, bis Sorgeberechtigten-Einwilligung und altersgerechte Zustimmung des Jugendlichen fachlich sowie rechtlich freigegeben sind.
- Das normale 56-Tage-Programm bleibt fuer Minderjaehrige unabhaengig davon nutzbar.

## 6. Performance Lab

### V1-Kandidaten

- 3-Minuten-Psychomotor-Vigilance-Task als Kandidat fuer anhaltende Aufmerksamkeit.
- Kalibrierter, nichtsprachlicher Arrow-Flanker als Kandidat fuer selektive Aufmerksamkeit und Interferenzkontrolle.
- Post-Error-Metriken nur explorativ aus dem Flanker ableiten.

Die Tasknamen legen noch keinen validierten Primaeroutcome fest. Vor produktiver Nutzung muessen Timing, Retestreliabilitaet, Abbruchlogik und Scoring mit der realen Capacitor-/WKWebView-Laufzeit geprueft werden.

### 56-Tage-Rhythmus

| Zeitpunkt | Funktion | Auswertung |
|---|---|---|
| Vor Aktivierung | Familiarisierung und technische Geraetepruefung | nicht als Outcome |
| Tag 1 | erster Messanker | Baseline-nahe Referenz, mit Practice-Flag |
| Tag 14 | frueher Verlauf | sekundaer |
| Tag 28 | Midpoint | vorab definierter Messanker |
| Tag 42 | Stabilitaet | sekundaer |
| Tag 56 | Abschluss | vorab definierter Messanker |

Gesamtdauer einer Messsitzung soll nach Pilotierung maximal 8 Minuten betragen. Lab-Messungen erscheinen nicht innerhalb des normalen Daily Check-ins und koennen in einem kontrollierten Zeitfenster separat abgeschlossen werden.

### Technische Mindestanforderungen

- gleiche Geraeteklasse und moeglichst dasselbe Geraet innerhalb eines Programmlaufs,
- lokale Stimuli ohne Netzabhaengigkeit waehrend der Trials,
- monotone Zeitmessung,
- Erkennung von App-Hintergrund, Unterbrechung und Orientierungswechsel,
- invalidierte statt still reparierte Sitzungen,
- versionierte Taskdefinition, Stimulusset, Scoring und App-Version,
- Rohtrials getrennt von freigegebenen Outcome-Beobachtungen,
- keine sichtbaren Rohscores oder Leaderboards im Messmodus,
- Practice-, Device- und Quality-Flags in jeder Sitzung.

## 7. Solo-Athleten

Solo-Athleten werden nicht als Team mit `n = 1` modelliert. Ihr Evidence-Pfad besteht aus:

- dem gleichen 56-Tage-Programmlauf und denselben Transfer-Pulse-Zeitpunkten,
- objektiven Performance-Lab-Messankern,
- bestehenden Nutzungs-, Completion-, Comprehension- und Kontextdaten,
- dem eigenen, nur fuer den Athleten bestimmten Verlauf,
- optional einer unabhaengigen Coach-Beobachtung, wenn ein realer Coach eingeladen und die Sichtbarkeit freigegeben wurde.

Feste Regeln:

- Das Mindest-`n` fuer Teamaggregate wird nicht auf persoenliche Selbstansichten angewendet.
- Ein persoenlicher Verlauf ist keine Gruppenwirkung und wird nicht als solche exportiert.
- Ein externer pseudonymisierter Einzelfallbericht benoetigt eine eigene, widerrufbare Freigabe und weist `n = 1`, Missingness, Messqualitaet und Claim Boundary sichtbar aus.
- Kein oeffentlicher Einzelfallbericht enthaelt Namen, E-Mail, Journal-/Reflexionstext, Rohtrials oder unnoetige Sport-/Vereinsdetails.
- Sportart, Leistungsniveau und Trainings-/Wettkampfkontext werden strukturiert statt als Freitext gespeichert, damit spaetere sportartenuebergreifende Auswertungen moeglich sind.
- Ein optionaler Solo-Coach sieht keine privaten Athleten-Selbstberichte. Seine Beobachtung bleibt eine getrennte Quelle.

Damit kann RewirePerform bei Boxern und anderen Einzelsportlern einen belastbaren individuellen Verlauf dokumentieren. Erst mehrere vorab vergleichbar erhobene Verlaeufe erlauben sportartenbezogene oder sportartenuebergreifende Aggregation.

## 8. Datenmodell

Die R4-Implementierung umfasst das versionierte Transferprotokoll, Teilnahmefreigaben, Athleten-Pulse, Coach-Beobachtungen und aggregierte Exporte. Performance-Lab-Rohdaten, Data Locks und Analysemanifeste bleiben bewusst fuer einen spaeteren fachlich freigegebenen Block offen.

### Protokoll und Versionierung

- `evidence_protocols`
- `evidence_measurement_schedules`
- `evidence_domain_definitions`
- `performance_task_definitions`
- `performance_task_versions`
- `outcome_definitions`

### Messungen

- `athlete_transfer_observations`
- `coach_team_observations`
- `coach_athlete_observations`
- `performance_sessions`
- `performance_trials`
- `outcome_observations`
- `protocol_deviations`

### Reproduzierbarkeit

- `study_data_locks`
- `analysis_manifests`
- bestehende `study_evidence_snapshots`
- bestehende `study_export_manifests`

Jeder Datensatz braucht mindestens:

- pseudonyme Nutzer- oder Teamreferenz,
- `program_instance_id` und, falls vorhanden, `program_run_id`,
- Protokoll- und Itemversion,
- Messzeitpunkt und Sportkontext,
- App-, OS- und Geraetekontext, sofern fuer die Messung relevant,
- Consent-Scope,
- Quality- und Invaliditaetsflags,
- unveraenderliche Erstellzeit und nachvollziehbare Korrekturhistorie.

## 9. Zugriff und Datenschutz

| Datenart | Athlet | Coach | Admin intern | Externer Export / KI |
|---|---|---|---|---|
| Eigener Transfer Pulse | eigenes Ergebnis, wenn Produktfreigabe erfolgt | nein | pseudonymisiert fuer QA | nur aggregiert und consentiert |
| Team-Coach-Beobachtung | optional spaeter als Teamkontext | eigene Eingabe | pseudonymisiert fuer QA | nur aggregiert |
| Individuelle Coach-Beobachtung | offene Produktentscheidung | nur eigene Eingabe und benoetigte operative Ansicht | streng rollenbegrenzt | ausgeschlossen |
| Performance-Rohtrials | nein | nein | nur Forschungs-/QA-Rolle | ausgeschlossen |
| Freigegebener Task-Outcome | eigener Verlauf optional | nur Teamaggregate ab Mindest-n | pseudonymisiert | Data-Lock-Snapshot, aggregiert |
| Journal-/Reflexionstext | nur Athlet | nie | nicht fuer Evidence | immer ausgeschlossen |

Weitere feste Regeln:

- Kein Service-Role-Key im Client.
- Kein allgemeiner SQL-Zugriff fuer Agenten oder KI.
- Spaeter nur eine versionierte, read-only Evidence API auf gesperrten Snapshots.
- `n < 5`: sensible Teamaggregate werden nicht ausgegeben.
- `5 <= n < 10`: `low_confidence` wird sichtbar ausgewiesen.
- Solo-Athleten duerfen ihre eigenen Daten sehen; externe Dossiers bleiben pseudonymisiert und zeigen keine privaten Rohverlaeufe.

## 10. Evidence-Auswertung

### Kein Mega-Score

Das Dossier zeigt fuer jede Domain getrennt:

- Anzahl geplanter und valider Messungen,
- Missingness und `nicht beobachtet`,
- Verlauf objektiver In-App-Outcomes,
- Verlauf der Athletenbeobachtung,
- Verlauf der Coach-Beobachtung,
- Uebereinstimmung und Abweichung der Quellen,
- Unsicherheit und Datenqualitaetsflags.

### Claims

| Evidence Level | Was liegt vor? | Zulaessige Kernaussage |
|---|---|---|
| E0 | Tracking und technische Qualitaet | Die Messung wurde unter dokumentierten Bedingungen durchgefuehrt. |
| E1 | Beobachteter Verlauf ohne Vergleich | Die gemessene Leistung oder berichtete Beobachtung veraenderte sich im 56-Tage-Zeitraum. |
| E2 | Vorab geplantes randomisiertes Single-Case- oder Micro-Randomized-Design | Unter diesem Protokoll spricht die Evidenz fuer einen begrenzten Effekt auf den konkret definierten Outcome. |
| E3 | Randomisierte Vergleichsstudie mit outcome-nahem Primaerziel | RewirePerform verbesserte unter diesen Bedingungen den definierten Outcome gegenueber der Vergleichsbedingung. |
| E4 | Unabhaengige Replikation | Der kontextspezifische Befund wurde unabhaengig repliziert. |

Auch bei E2 oder E3 folgen daraus nicht automatisch Aussagen wie "verbessert Fussballleistung", "verursacht Qualifikation" oder "maximiert Neuroplastizitaet".

### Erster 56-Tage-Pilot

Der erste Pilot dient primaer:

- technischer Validierung,
- Adhaerenz- und Belastungspruefung,
- Practice-Effect- und Missingness-Analyse,
- interner Reliabilitaetspruefung,
- beobachteten individuellen Verlaeufen,
- Pruefung, ob Athleten- und Coach-Beobachtungen verstaendlich und nutzbar sind.

Er ist kein endgueltiger Wirksamkeitsnachweis. Die Auswertung muss das offen ausweisen.

## 11. Readiness Gates

### Gate A: Protokoll

- Domains, Items, Skalen, Messfenster und Claims versioniert.
- Ein Primaeroutcome erst nach interner Timing- und Reliabilitaetspruefung festgelegt.
- Keine proprietaere Skala ohne dokumentierte Nutzungsrechte.

### Gate B: Datenschutz und Minderjaehrige

- normaler Produkt-Consent und Forschung/Evaluation getrennt,
- Guardian- und Assent-Workflow fachlich und rechtlich geprueft,
- Loeschung, Widerruf und Aufbewahrung definiert,
- Rollen und RLS mit Negativtests verifiziert.

### Gate C: Technik

- same-device policy und Geraete-Metadaten,
- Unterbrechungs- und Invaliditaetslogik,
- idempotente Speicherung,
- Data Lock, Audit Trail und versioniertes Scoring,
- Offline-/Retry-Verhalten ohne doppelte Messungen.

### Gate D: UX

- Transfer Pulse unter 25 Sekunden,
- kein laengerer normaler Daily Flow,
- Coach-Wochenreview unter 90 Sekunden,
- echte iPhone-Pruefung auf kleinem und grossem Viewport,
- klare Loading-, Retry-, Offline- und Invaliditaetszustaende,
- keine Belohnung, die Messantworten beeinflusst.

### Gate E: Pilotstart

- interne Erwachsene-Pilotierung erfolgreich,
- Task-Retest und Timing akzeptabel,
- keine Privacy- oder RLS-Findings,
- Evidence Export enthaelt keine Rohtexte oder Individualprofile,
- Claims im Produkt und Dossier entsprechen dem erreichten Evidence Level.

## 12. Implementierungsreihenfolge

1. Reines Protokollmodul und Unit Tests.
2. Interner, nicht persistierender UX-Prototyp fuer Transfer Pulse und Coach Review.
3. Fachliche und rechtliche Freigabe fuer Minderjaehrige, Consent und Coach-Individualdaten.
4. Lokale Migrationen, RLS und Privacy Regression Tests.
5. Athlete Transfer Pulse als Ersatz der optionalen Check-in-Reflexion an Messpunkten.
6. Coach-Wochenreview mit Team- und optionaler Individualbeobachtung.
7. Task Runner, technische Familiarisierung und Invaliditaetslogik.
8. Evidence Snapshot, Data Lock, Analysemanifest und read-only Export.
9. iPhone-/PWA-QA, Accessibility, Performance und Fehlertracking.
10. Staging-Zeitlauf und kontrollierter Erwachsenentest vor Minderjaehrigen-Pilot.

## 13. Noch ausstehende Freigaben

Vor jeder produktiven Datenerhebung muessen folgende Entscheidungen beziehungsweise Schritte explizit dokumentiert sein:

1. Minderjaehrigen- und Guardian-Consent fuer Evaluation und objektive Tasks.
2. Juristische Bestaetigung von Sichtbarkeit, Aufbewahrung und Exportausschluss individueller Coach-Beobachtungen.
3. Gesonderte Freigabe zum Anwenden der lokal geprueften Migration auf Staging und spaeter Production.
4. Verifizierte Zuordnung von Staging und Production Supabase.
5. Fachliche Freigabe des finalen Task- und Scoringprotokolls.

## 14. Wissenschaftliche Referenzen fuer die naechste Fachpruefung

- Roethlin et al. (2020), RCT zu sportpsychologischem Training, Aufmerksamkeitskontrolle und Umgang mit Fehlern: https://pubmed.ncbi.nlm.nih.gov/32762736/
- Hatzigeorgiadis et al. (2019), Self-Talk-Intervention bei jugendlichen Athleten mit Coach-Ratings: https://pubmed.ncbi.nlm.nih.gov/31248129/
- Saw et al. (2019), Implementierung mobiler Athlete-Self-Reports: https://pubmed.ncbi.nlm.nih.gov/31427861/
- Basner et al. (2016), 3-Minuten-Smartphone-PVT-Validierung: https://pubmed.ncbi.nlm.nih.gov/27325169/
- Buelow et al. (2022), Grenzen der Konvergenz einer 3-Minuten-PVT: https://pubmed.ncbi.nlm.nih.gov/35242006/
- Hedge et al. (2018), Reliability Paradox klassischer kognitiver Tasks: https://pubmed.ncbi.nlm.nih.gov/28726177/
- Parsons et al. (2023), reliabilitaetsoptimierte Konflikt-Tasks: https://pubmed.ncbi.nlm.nih.gov/37076456/
- Kuehnhausen et al. (2020), Practice Effects bei wiederholten digitalen Kognitionstests: https://pubmed.ncbi.nlm.nih.gov/32539487/
