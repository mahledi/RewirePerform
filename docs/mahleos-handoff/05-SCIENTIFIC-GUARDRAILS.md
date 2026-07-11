# Wissenschaftliche Guardrails

- `RP-SG-01 | CONFIRMED_FROM_BOTH` RewirePerform darf interne Programmevaluation und beobachtete Entwicklung beschreiben.
- `RP-SG-02 | CONFIRMED_FROM_BOTH` Ohne Kontroll- oder Vergleichsgruppe darf keine kausale Wirksamkeit behauptet werden.
- `RP-SG-03 | CONFIRMED_FROM_BOTH` Keine Diagnose, medizinische Wirkung, Therapie- oder Heilbehauptung.
- `RP-SG-04 | CONFIRMED_FROM_BOTH` Keine Behauptung, das Produkt beweise Neuroplastizitaet oder eine Umverdrahtung des Gehirns.
- `RP-SG-05 | CONFIRMED_FROM_CHAT` Keine Aussagen ueber Ego, Persoenlichkeit oder psychologische Eigenschaften, wenn sie nicht direkt und belastbar gemessen wurden.
- `RP-SG-06 | CONFIRMED_FROM_BOTH` Direkt erhobene Zustandswerte duerfen als aggregierte Gruppenbeobachtung beschrieben werden, nicht als objektive Wahrheit ueber Einzelpersonen.
- `RP-SG-07 | CONFIRMED_FROM_CODE` Validierte Assessments umfassen CSAI-2R, SMTQ und Flow-Kurzskala; Scoring und Richtung muessen instrumentspezifisch behandelt werden.
- `RP-SG-08 | CONFIRMED_FROM_CODE` Der RewirePerform Development Index ist ein eigener Index und darf nicht als klinisch validiertes Instrument dargestellt werden.
- `RP-SG-09 | CONFIRMED_FROM_BOTH` Kleine Stichproben, Missingness, Drop-out und unvollstaendige Paare muessen sichtbar bleiben.
- `RP-SG-10 | CONFIRMED_FROM_CODE` Sensible Aggregationen brauchen mindestens fuenf unterschiedliche Athleten; Effekt- oder Veraenderungsinterpretation unter zehn ist niedrige Konfidenz.
- `RP-SG-11 | CONFIRMED_FROM_BOTH` Zulaessige Begriffe: `beobachtete Veraenderung`, `Datenlage`, `Messqualitaet`, `Adhaerenz`, `Programmnutzung`, `aggregierte Teamtrends`.
- `RP-SG-12 | CONFIRMED_FROM_BOTH` Unzulaessige Begriffe ohne entsprechende Evidenz: `bewiesen`, `garantiert`, `verursacht`, `wirkt sicher`, `Diagnose`.
- `RP-SG-13 | CONFIRMED_FROM_CHAT` Wissenschaftliche Tiefe darf im System erhalten bleiben, muss fuer Athleten aber in konkrete Sporthandlungen uebersetzt werden.
- `RP-SG-14 | CONFIRMED_FROM_CHAT` Jugendliche duerfen nicht mit Angst, Pathologisierung oder scheinbar objektiven Mentalurteilen konfrontiert werden.
- `RP-SG-15 | INFERRED` Neue oder substanziell veraenderte Assessment-Instrumente, Scores, Normwerte, Effektgroessen oder gesundheitsbezogene Claims brauchen fachwissenschaftliche und gegebenenfalls rechtliche Endpruefung.
- `RP-SG-16 | CONFIRMED_FROM_CODE` Paired Cohen's `d_z` ist in historischen Outcomes dokumentiert und nicht direkt mit Between-Group Cohen's d gleichzusetzen; aktuelle Run-Dossier-Logik muss vor externer Effektgroessennutzung erneut geprueft werden.

## Codex darf vorbereiten, aber nicht final freigeben

- Literatur- und Instrumentenvergleich.
- vorsichtige Claim-Formulierungen.
- Scoring-Implementierung mit Tests.
- Aggregations- und Missingness-Logik.
- Entwuerfe fuer Vereinsberichte.

Final bei Mahle beziehungsweise Fachpruefung bleiben: inhaltliche Programmaussage, psychometrische Interpretation, externe Wirksamkeitsclaims, Minderjaehrigen-/Mental-Health-Grenzen und juristische Kommunikation.

