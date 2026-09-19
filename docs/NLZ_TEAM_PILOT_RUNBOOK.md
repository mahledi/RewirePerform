# NLZ Team Pilot Runbook

Stand: 10. Juli 2026

## Ziel

Der Pilot prüft Nutzung, Akzeptanz, technische Zuverlässigkeit, Datenqualität und beobachtete Entwicklung innerhalb eines klar abgegrenzten Mannschaftslaufs. Er ist keine Kausal- oder Wirksamkeitsstudie.

Empfehlung: mindestens zehn Athleten einplanen. Technisch werden sensible Aggregate ab fünf consentierten Athleten sichtbar; bei fünf bis neun bleibt jede Interpretation ausdrücklich `low_confidence`.

## Rollen

- Pilot Owner: Gesamtverantwortung, Kommunikation, Freigaben und Incident-Entscheidungen
- Admin: Program Run, Readiness, technische Datenqualität und sichere Exporte
- Coach: operative Aktivität und geschützte Teamaggregate
- Athlet: freiwillige Nutzung, eigene private Inhalte und Consent-Entscheidung

## Startvorbereitung

1. Production- und QA-Team eindeutig trennen.
2. Teammitglieder und Rollen kontrollieren.
3. In Admin unter `Pilot Readiness` einen benannten Program Run mit Startdatum anlegen.
4. Run aktivieren und Athleten zuordnen.
5. Prüfen, dass jeder Athlet genau eine aktive Programminstanz mit derselben `program_run_id` besitzt.
6. Consent verständlich erklären. Nutzung bleibt auch bei `false` möglich.
7. Validierte Pre-Messung und Development Index Pre vollständig durchführen.
8. Readiness aktualisieren. Bei `RED` nicht starten.
9. Coach- und Spielerbriefing durchführen.
10. Login, Check-in, Verständnis-Check, Journal und Coach-Sicht mit QA-Accounts testen.

## Spielerbriefing

Spieler müssen vor dem Start verstehen:

- Die App unterstützt tägliche mentale Praxis und Reflexion.
- Coaches sehen Aktivität, aber keine privaten Texte.
- Einzelne Stimmung-, Energie-, Fokus- oder Assessmentwerte werden Coaches nicht gezeigt.
- Psychologische Teamwerte erscheinen nur aggregiert ab mindestens fünf Teilnehmenden.
- Der optionale Datenbeitrag für Evaluation ist freiwillig und widerrufbar.
- Technische Probleme sollen sofort gemeldet und nicht durch wiederholte Mehrfachkonten umgangen werden.

## Coach-Briefing

- Team Pulse ist ein gruppierter Zustandshinweis, keine Diagnose.
- `n < 5` bedeutet keine Anzeige.
- `low_confidence` bedeutet vorsichtige Interpretation.
- Trends sind Gesprächs- und Beobachtungsanlässe, keine objektive Wahrheit über einzelne Spieler.
- Coaches erhalten keine Journaltexte, Reflexionen, Rohantworten oder Einzel-Scores.
- Aussagen über Persönlichkeit, Ego oder mentale Krankheit sind unzulässig.

## Täglicher Betrieb

- Morgens Readiness und neue Blocker prüfen.
- Nach dem vereinbarten Check-in-Fenster Anzahl der Check-ins prüfen.
- Technische Ausfälle mit Uhrzeit, Route, Rolle und Fehlermeldung dokumentieren, niemals mit privaten Texten.
- Inaktive Spieler organisatorisch ansprechen, ohne psychologische Interpretation.
- Keine Daten direkt in der Datenbank korrigieren. Ursachen zuerst reproduzieren und über einen dokumentierten Fix beheben.
- Nach relevanten Saves muss der Snapshot aktuell sein; Dashboard-Load dient als zusätzlicher Nachzug.

## Monitoring-Rhythmus

### Tag 1

- Alle Logins funktionieren.
- Run-Zuordnung ist vollständig.
- Pre-Messungen sind vollständig oder begründet offen.
- Check-in, Completion und Verständnis-Check stimmen pro Spieler überein.
- Keine Coach-Privacy-Verletzung.

### Tag 3

- Wiederholte Saves erzeugen keine Duplikate.
- Lokale Drafts lassen sich nach Verbindungsabbruch erneut speichern.
- Inaktive Spieler und technische Ursachen sind getrennt dokumentiert.

### Tag 7

- 7-Tage-Aktivität und Drop-off prüfen.
- Weekly Trend nur ab `n >= 5` freigeben.
- Erstes run-spezifisches Evidence Snapshot erzeugen.
- Kurzbericht mit Nutzung, Missingness und technischen Vorfällen erstellen.

### Tag 14

- Adhärenz und Datenvollständigkeit prüfen.
- `low_confidence` sichtbar ausweisen.
- Keine Wirkungsaussage aus frühen Trends ableiten.
- Zweites Evidence Snapshot erzeugen.

### Tag 28

- Mid-Messungen durchführen.
- Pre/Mid-Paare, Missingness und Drop-off prüfen.
- Nur beobachtete Veränderung berichten.

### Tag 56

- Post-Messungen durchführen.
- Pre/Post-Paare und Datenqualität prüfen.
- Abschluss-Snapshot und sichere Exporte erzeugen.
- Technische Zuverlässigkeit getrennt von beobachteten Outcomes berichten.

## Abbruchkriterien

Pilot pausieren oder abbrechen bei:

- Login- oder Auth-Ausfall für einen relevanten Teil des Teams
- wiederholt nicht gespeicherten Check-ins
- falscher Run-Zuordnung
- Coach-Zugriff auf private Inhalte oder Einzelwerte
- Export privater Inhalte
- mehr als 30 Prozent technisch verursachter Ausfälle
- nicht erklärbarer Datenverdopplung oder Verlust
- `RED` im Readiness Gate durch Datenintegritätsfehler

## Datenqualitätskriterien

- 100 Prozent der Pilotathleten besitzen die richtige `program_run_id`.
- Keine mehrfach aktiven Programminstanzen.
- Keine Check-ins oder Completions ohne Programminstanz ab Run-Start.
- Keine Completion ohne passenden Check-in.
- Keine Assessment- oder Development-Index-Messung ohne Instanz.
- Keine Testnutzer in einem Production-Team.
- Consent und Pre-Missingness werden vollständig ausgewiesen.
- Psychologische Aggregate sind bei `n < 5` technisch unterdrückt.

## Start Morgen

- [ ] Migrationen in Preview erfolgreich angewendet
- [ ] RLS-Rollentests bestanden
- [ ] Team und Rollen korrekt
- [ ] Program Run aktiv
- [ ] Alle Athleten zugeordnet
- [ ] Consent erklärt und Status sichtbar
- [ ] Pre-Messungen geprüft
- [ ] Readiness nicht `RED`
- [ ] Spielerbriefing durchgeführt
- [ ] Coach-Briefing durchgeführt
- [ ] QA-Check-in Ende-zu-Ende bestanden
- [ ] Incident-Ansprechpartner und Supportweg festgelegt

## Erlaubte Claims

- beobachtete Veränderung
- Programmnutzung und Adhärenz
- aggregierte Teamtrends
- Messvollständigkeit und Drop-off

## Nicht erlaubte Claims

- bewiesen
- garantiert
- verursacht
- Diagnose
- medizinische Wirkung
- individuelle psychologische Bewertung
