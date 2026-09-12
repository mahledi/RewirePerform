# V1.4 – DSFA-Schwellenprüfung

Status: `SCREENED__COMPACT_DPIA_RECOMMENDED__PRODUCTION_GATE_OPEN`

## Ergebnis in normalen Worten

Der enge V1.4-Evidence-Core ist keine Diagnose, kein Athleten-Ranking und keine automatisierte Entscheidung. Er verarbeitet trotzdem über bis zu 365 Tage potenziell sensible, pseudonymisierte Verlaufsdaten und umfasst auch Minderjährige. Deshalb wird vorsorglich eine kompakte Datenschutz-Folgenabschätzung empfohlen, bevor echte Pilotdaten in das neue Evidence-Modell übernommen werden.

Diese interne Schwellenprüfung behauptet weder, dass Art. 35 DSGVO zwingend ausgelöst ist, noch ersetzt sie eine qualifizierte externe Rechtsprüfung. Das technische `dpia_screening`-Gate und die Production-Aktivierung bleiben bis zur dokumentierten Abnahme der kompakten DSFA gesperrt.

## Bewerteter Core

- aktueller offizieller TSV-U17-Programmlauf;
- nur Personen mit dokumentiertem V3-Opt-in; unter 16 zusätzlich aktuelle Guardian-Freigabe und eigene Athletenentscheidung;
- strukturierte Fragebogen-, Assessment-, Check-in-, Transfer-, Completion-, Progress- und Comprehension-Werte;
- interne personenbezogene Verbindung ausschließlich pseudonymisiert pro Person und Programmlauf;
- individuelle Ergebnisse nur privat für den Athleten;
- Coach, Organisation, Jarvis und Präsentationen nur nicht identifizierend und gruppiert ab `n >= 5`;
- Löschung beziehungsweise Ausschluss beim frühesten Zeitpunkt aus Widerruf, Kontolöschung, Zweckende oder spätestens 365 Tagen.

## Ausdrücklich nicht bewertet und nicht freigegeben

- Journaltexte, freie Reflexionen, Namen, E-Mail-Adressen oder direkte Identifikatoren im Evidence-Modell;
- Coach-Beobachtungen als personenbezogene Evidence-Quelle;
- Push-Empfang-zu-Check-in-Verhaltensanalyse;
- Veo-, Passquoten- oder andere externe Matchdaten;
- externe Forschung, externes KI-Training, individuelle Coach-/Organisationsprofile, Rankings oder Kausalclaims.

## Punkte der kompakten DSFA

1. Notwendigkeit und Verhältnismäßigkeit jeder Core-Datenklasse und jedes Outputs bestätigen.
2. Risiken für Minderjährige, Widerruf, Re-Identifikation, unzulässige Zweckausweitung und Fehlinterpretation bewerten.
3. Bestehende Maßnahmen prüfen: Pseudonymisierung, getrennte Identitätszuordnung, `n >= 5`, RLS/Grants, Source-Mapping-Gates, Audit, Löschpfad, 365-Tage-Grenze und gesperrte Claims.
4. Restrisiken, verantwortliche Person, Prüfdatum und erneute Prüfung bei jeder Scope-Erweiterung dokumentieren.
5. Erst danach das Governance-Gate mit einer konkreten Evidence-Referenz freigeben; Migration, Aktivierung und Backfill bleiben weiterhin getrennte Entscheidungen.
