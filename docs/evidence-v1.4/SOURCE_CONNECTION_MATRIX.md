# V1.4 – Quellen- und Verbindungs-Matrix

Status: `MAPPING_GUARD_ACTIVE_LOCALLY__NO_REAL_DATA`

## Grundregel

Eine Quelle wird nicht deshalb in dasselbe Konstrukt gerechnet, weil ihre Zahl ähnlich aussieht. Jede Verbindung braucht denselben Programmlauf, einen dokumentierten Messzeitpunkt, eine eindeutige Semantik, eine zulässige Datenschutzklasse und einen freigegebenen Crosswalk. Ohne diese fünf Punkte bleibt sie getrennt.

## Sieben Quellenfamilien

| Quellenfamilie | Was sie aussagt | Was sie nicht aussagt | Freigabestand |
|---|---|---|---|
| Onboarding-Selbstbericht | Selbsteinschätzung in 36 vertraglich zugeordneten Items | objektive Fähigkeit oder Ursache | Contract ready |
| Development Index | Veränderung im eigenen versionierten Index | klinische oder externe Validität | Mapping required |
| validierte Assessments | Ergebnis des jeweiligen Instruments/Subscores | automatische Gleichheit mit RewirePerform-Konstrukten | Mapping required |
| Athlete Transfer | selbst berichtete Anwendung in konkreten Situationen | objektiv beobachtete Umsetzung | Mapping required |
| Coach-Beobachtung | sichtbares Verhalten aus Coach-Perspektive | private Gedanken, Diagnose oder „Wahrheit“ über den Athleten | Mapping + Consent required |
| Daily State | Tageswerte zu Stimmung, Energie und Fokus | stabile Persönlichkeit oder Trainingswirkung | Mapping required |
| Completion | Öffnung und Abschluss von Inhalten | Verständnis, mentale Qualität oder Wirkung | Use only |

## Zulässige Verbindungen

- `Pre → Mid → Post` nur innerhalb derselben Person, desselben Programmlaufs, Instruments, derselben Version und desselben Konstrukts.
- Gruppenwerte erst ab mindestens fünf berechtigten Personen; `n = 5–9` bleibt geringe Sicherheit.
- Triangulation bedeutet nur: mindestens zwei methodisch getrennte Quellen zeigen im selben Zeitraum eine ähnliche Richtung.
- Abweichende Quellen werden sichtbar erhalten und nicht zu einem positiven Gesamtscore geglättet.
- Missingness, Dropout, Versionswechsel, Messzeitpunkt und Qualitätsflags gehören immer zum Ergebnis.
- Keine Verbindung aktiviert automatisch die Claim-Klassen `association` oder `causality`.

## Was jetzt stärker ist

Vorher lagen Fragebogen, Check-ins, Assessments, Transfer, Beobachtung und Nutzung überwiegend nebeneinander. V1.4 gibt ihnen erstmals einen gemeinsamen, versionierten Vertrag: gleiche Person ohne direkten Identifikator, gleicher Programmlauf, getrennte Quellenfamilien, feste Zeitpunkte, klare Claims und messbare Datenqualität. Dadurch kann das System später belastbar unterscheiden zwischen „genutzt“, „selbst berichtete Veränderung“, „mehrere Quellen zeigen dieselbe Richtung“ und „nur eine beobachtete Assoziation“ – ohne daraus automatisch Wirkung oder Kausalität zu behaupten.
