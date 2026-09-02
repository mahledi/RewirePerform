# V1.4 Block 9 – Datenschutz- und Einwilligungsabgleich

Status: `CORE_SCOPE_INTERNALLY_APPROVED__PRODUCTION_NOT_APPROVED`

## Entscheidung in normalen Worten

Die bestehende freiwillige Einwilligung `data_contribution_v3_2026_07` nennt strukturierte Nutzungs-, Fortschritts-, Check-in-, Assessment- und Transferdaten, interne Pilotanalysen sowie nicht identifizierende Berichte und Präsentationen. Die Datenschutzerklärung beschreibt außerdem Pre-/Post-Veränderungen, zeitliche Check-in-Entwicklung, Teamaggregate ab fünf Personen und strukturierte Coach-Beobachtungen.

Für den unten festgelegten engen Kern ist V3 intern als `approved_core_scope` bewertet: Wie werden Programminhalte genutzt und welche beobachteten Veränderungen zeigen sich innerhalb desselben offiziellen Programmlaufs? Diese Entscheidung gilt ausschließlich für Personen mit dokumentiertem V3-Opt-in; unter 16 zusätzlich mit aktueller Guardian-Freigabe und eigener Athletenentscheidung. Sie ist keine pauschale Freigabe für jede denkbare Verbindung und ersetzt keine externe qualifizierte Rechtsprüfung.

Zum Kern gehören strukturierte Onboarding-/Fragebogen-Scores, versionierte Pre-/Mid-/Post-Assessments, strukturierte Daily-Check-in-Werte, strukturierter Athlete Transfer sowie Completion-, Progress- und Comprehension-Werte. Die interne Verknüpfung erfolgt ausschließlich pseudonymisiert pro Person und Programmlauf. Individuelle Ergebnisse bleiben privat beim Athleten; Coach, Organisation, Jarvis und Präsentationen erhalten nur nicht identifizierende Gruppenwerte ab `n >= 5`.

Folgende Zwecke bleiben ausgeschlossen und benötigen eine neue, getrennte Entscheidung:

- Diagnose, Behandlung oder psychologisches Personenprofil;
- individuelle mentale Bewertung für Coaches oder Organisationen;
- automatisierte Entscheidungen, Ranking oder Risikoklassifikation;
- Journal-, Reflexions- oder sonstige Freitextanalyse;
- externe Forschung, Datentraining oder Weitergabe an neue Empfänger;
- dauerhafte organisations-, saison- oder produktübergreifende Personenakte;
- Kausal- oder Leistungssteigerungsbehauptungen.

Zusätzlich bleiben Coach-Beobachtungen als personenbezogene Evidence-Quelle, Push-Empfang-zu-Check-in-Verhaltensanalysen und externe Matchdaten außerhalb dieses Kerns. Dafür ist eine neue V4-Transparenz- und Einwilligungsentscheidung erforderlich.

Pseudonymisierung trennt Identität und Analyse, macht personenbezogene Daten aber nicht automatisch anonym. Widerruf, Auskunft, Löschung und Zweckbindung gelten deshalb weiter.

## Datenklassen

| Quelle | V3-Abdeckung | V1.4-Status |
|---|---|---|
| Onboarding-Fragebogen | ausdrücklich Fragebogen/Assessment | fachlicher Vertrag vorhanden |
| Development Index | Assessment | Crosswalk noch fachlich freizugeben |
| validierte Assessments | Assessment | Instrumente getrennt halten; Crosswalk freigeben |
| Athlete Transfer | ausdrücklich Transferdaten | Item-/Zeitpunkt-Crosswalk freigeben |
| Daily State | ausdrücklich Check-in | nur beschreibend; Crosswalk freigeben |
| Completion | ausdrücklich Nutzung/Fortschritt | nur Nutzung, niemals mentale Qualität |
| Coach-Beobachtung | Datenschutzerklärung und Minderjährigenvertrag nennen sie; der allgemeine Einwilligungsbutton nicht ausdrücklich | außerhalb des Core; V4-Transparenz- und Einwilligungsentscheidung erforderlich |

## Minderjährige

Die technische Berechtigung muss bei jeder Erfassung erneut prüfen:

- gültige Produktfreigabe;
- gültige freiwillige Datenbeitragsfreigabe;
- aktuelle altersgerechte Guardian-/Athletenentscheidung;
- exakt passende Einwilligungsversion;
- kein Widerruf und kein QA-/Testkonto.

Wird eine neue Einwilligungsversion nötig, müssen Unter-16-Jährige erneut über Guardian **und** Athlet freigeben; 16-/17-Jährige entscheiden selbst im altersgerechten Flow. Ein Nein darf die Programmnutzung nicht einschränken.

## Rechts- und Store-Grenze

Die technische Prüfung ersetzt keine verbindliche Rechtsberatung. Vor Production-Aktivierung sind mindestens zu dokumentieren:

1. finale Zweck-/Rechtsgrundlagenentscheidung einschließlich Art. 9 DSGVO;
2. die dokumentierte DPIA-Schwellenprüfung liegt in `DPIA_THRESHOLD_SCREENING.md`; vor Aktivierung bleibt die dort empfohlene kompakte DSFA offen;
3. V3 gilt intern nur für den oben beschriebenen Core; jeder zusätzliche Quellenumfang erfordert eine neue V4-Entscheidung;
4. Privacy-/App-Store-/Google-Play-Abgleich der tatsächlich aktivierten Datenklassen;
5. getrennte Freigabe von Migration, Protokollaktivierung und realem Backfill.

Bis dahin verhindert die Datenbank die Aktivierung fail-closed.
