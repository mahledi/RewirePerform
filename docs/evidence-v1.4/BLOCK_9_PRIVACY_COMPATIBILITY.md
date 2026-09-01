# V1.4 Block 9 – Datenschutz- und Einwilligungsabgleich

Status: `TECHNICAL_CONTRACT_BUILT__PRODUCTION_NOT_APPROVED`

## Entscheidung in normalen Worten

Die bestehende freiwillige Einwilligung `data_contribution_v3_2026_07` nennt strukturierte Nutzungs-, Fortschritts-, Check-in-, Assessment- und Transferdaten, interne Pilotanalysen sowie nicht identifizierende Berichte und Präsentationen. Die Datenschutzerklärung beschreibt außerdem Pre-/Post-Veränderungen, zeitliche Check-in-Entwicklung, Teamaggregate ab fünf Personen und strukturierte Coach-Beobachtungen.

Damit ist V3 ein **plausibler Kandidat** für dieselbe enge Pilotfrage: Wie werden Programminhalte genutzt und welche beobachteten Veränderungen zeigen sich innerhalb desselben Programmlaufs? Das ist jedoch keine pauschale Freigabe für jede denkbare Verbindung.

Folgende Zwecke bleiben ausgeschlossen und benötigen eine neue, getrennte Entscheidung:

- Diagnose, Behandlung oder psychologisches Personenprofil;
- individuelle mentale Bewertung für Coaches oder Organisationen;
- automatisierte Entscheidungen, Ranking oder Risikoklassifikation;
- Journal-, Reflexions- oder sonstige Freitextanalyse;
- externe Forschung, Datentraining oder Weitergabe an neue Empfänger;
- dauerhafte organisations-, saison- oder produktübergreifende Personenakte;
- Kausal- oder Leistungssteigerungsbehauptungen.

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
| Coach-Beobachtung | Datenschutzerklärung und Minderjährigenvertrag nennen sie; der allgemeine Einwilligungsbutton nicht ausdrücklich | vor Nutzung separate Kompatibilitätsentscheidung oder neue Einwilligung erforderlich |

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
2. dokumentierte DPIA-Schwellenprüfung; bei positivem Ergebnis vollständige DSFA;
3. Freigabe, ob V3 für den finalen Quellenumfang genügt oder V4 erforderlich ist;
4. Privacy-/App-Store-/Google-Play-Abgleich der tatsächlich aktivierten Datenklassen;
5. getrennte Freigabe von Migration, Protokollaktivierung und realem Backfill.

Bis dahin verhindert die Datenbank die Aktivierung fail-closed.
