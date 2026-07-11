# Domain-Regeln

Format: Regel, Quelle/Status, betroffene Bereiche, Risiko.

- `RP-DR-01 | CONFIRMED_FROM_BOTH` Ein Athlet ist ein Nutzer mit Rolle `athlete`, eigenem Programmzustand und privaten Inhalten. Bereiche: Auth, Profile, Programme. Risiko: hoch.
- `RP-DR-02 | CONFIRMED_FROM_BOTH` Ein Coach ist ein Nutzer mit Rolle `coach`, der Teams erstellt oder per Coach-Code beitritt und nur autorisierte Teamdaten sieht. Bereiche: Auth, Teams, RLS. Risiko: kritisch.
- `RP-DR-03 | CONFIRMED_FROM_CODE` Ein Admin besitzt Rolle `admin` und darf administrative Aggregat-, QA-, Readiness- und Systemstatusfunktionen nutzen. Bereiche: Admin-Routen/RPCs. Risiko: kritisch.
- `RP-DR-04 | CONFIRMED_FROM_CODE` Ein Team verbindet Mitglieder, Coach, Player-/Coach-Codes, Startdaten, Kalender und Program Runs. Bereiche: `teams`, `team_members`, Team Management. Risiko: hoch.
- `RP-DR-05 | CONFIRMED_FROM_CODE` Ein `program_instance` ist der individuelle 56-Tage-Lauf eines Athleten; ein `program_run` gruppiert Instanzen eines Mannschaftspiloten. Risiko: kritisch fuer Tracking.
- `RP-DR-06 | CONFIRMED_FROM_CODE` Neue Pilot-Auswertungen muessen auf `program_run_id` und zugeordnete Programminstanzen begrenzt sein. Historische unzugeordnete Daten duerfen nicht automatisch eingemischt werden. Risiko: kritisch.
- `RP-DR-07 | CONFIRMED_FROM_BOTH` Das Programm umfasst 56 Tage mit fester Tagesmechanik; Kalenderkontext passt Anwendung und Zeitform an, nicht den fachlichen Kern. Bereiche: Content, Assignment. Risiko: hoch.
- `RP-DR-08 | CONFIRMED_FROM_CODE` Tagesinhalte stammen aus TypeScript-Content; die Datenbank speichert Zuweisung, Kontext und Bearbeitung, nicht die kanonische fachliche Quelle. Risiko: hoch.
- `RP-DR-09 | CONFIRMED_FROM_CODE` Ein finaler Tagesabschluss muss Check-in vor Completion speichern und darf bei fehlgeschlagenem Check-in keine Completion erzeugen. Risiko: kritisch.
- `RP-DR-10 | CONFIRMED_FROM_CODE` Wiederholtes Speichern derselben Tagesidentitaet muss idempotent bleiben; ein bestehendes `completed_at` darf nicht bei jedem Retry neu gesetzt werden. Risiko: hoch.
- `RP-DR-11 | CONFIRMED_FROM_BOTH` Pflichtantworten muessen am aktuellen Schritt validiert werden; Nutzer duerfen nicht erst am Ende wegen fehlender Antworten zurueckgeworfen werden. Risiko: mittel/hoch.
- `RP-DR-12 | CONFIRMED_FROM_BOTH` Richtige Verstaendnisantworten muessen zufaellig unter den Antwortoptionen verteilt werden, nicht immer an derselben Position. Risiko: mittel.
- `RP-DR-13 | CONFIRMED_FROM_BOTH` Assessments dienen Pre/Mid/Post-Messung und Development Index; sie sollen im Spielerflow nicht unnötig als pruefende `Tests` inszeniert werden. Risiko: mittel.
- `RP-DR-14 | CONFIRMED_FROM_BOTH` Check-ins erfassen direkt abgefragte Zustaende wie Stimmung, Energie, Fokus, Stress, Erholung, Schlaf, koerperliche Bereitschaft, Motivation, Druck und Teamverbundenheit. Risiko: hoch bei Interpretation.
- `RP-DR-15 | CONFIRMED_FROM_BOTH` Coaches duerfen individuell nur operative Aktivitaet sehen, nicht private psychologische Werte oder Texte. Risiko: kritisch.
- `RP-DR-16 | CONFIRMED_FROM_BOTH` Team Pulse und psychologische Outcome-Aggregate werden bei `n < 5` unterdrueckt; `5 <= n < 10` ist niedrige Konfidenz. Risiko: kritisch.
- `RP-DR-17 | CONFIRMED_FROM_CODE` Consent `false` verhindert Evidence-Nutzung, nicht die regulaere App-Nutzung. Consent `null` ist keine Zustimmung. Risiko: kritisch.
- `RP-DR-18 | CONFIRMED_FROM_CODE` Journaltexte, Dankbarkeit und freie Reflexion bleiben beim Athleten; fuer Evidence ist hoechstens die Anzahl relevant. Risiko: kritisch.
- `RP-DR-19 | CONFIRMED_FROM_CHAT` Verpasste Tage koennen als kompakter Rueckblick erscheinen, waehrend der aktuelle Tag Prioritaet behaelt. Risiko: mittel.
- `RP-DR-20 | CONFIRMED_FROM_BOTH` Coach-Beobachtungen bleiben neutral; die App schreibt dem Coach nicht vor, was er sagen oder tun soll. Risiko: mittel.
- `RP-DR-21 | INFERRED` Module sind fachliche Phasen innerhalb der 56 Tage, aber die kanonische Moduldefinition muss vor Umbauten direkt aus Content-Typen und UI geprueft werden. Risiko: mittel.
