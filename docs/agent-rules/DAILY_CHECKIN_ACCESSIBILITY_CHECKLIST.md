# Daily Check-in UX and Accessibility Audit Checklist

Stand: 11. Juli 2026
Scope: sichere lokale UX- und Accessibility-Audits des Daily Check-ins
Risiko: R1, Dokumentation

Diese Checkliste ist eine praktische Audit-Vorlage. Sie ersetzt keine finale Accessibility-Zertifizierung, keine Datenschutzfreigabe und keine fachliche Endfreigabe.

## Vor dem Audit

- [ ] Nur Testkonten, Demo-Daten oder synthetische Eingaben verwenden.
- [ ] Keine privaten Athleteninhalte, Journaltexte, Freitexte, Rohantworten oder Einzelverlaeufe ausgeben, speichern oder in Screenshots zeigen.
- [ ] Keine Produktdaten, Migrationen, Auth-, RLS-, Consent-, Loesch- oder Production-Flows veraendern.
- [ ] Aktuelle Regeln lesen: `AGENTS.md`, `BLOCKING_DECISIONS.md`, `UI_UX_RULES.md`, `DOMAIN_RULES.md`, `STOP_CONDITIONS.md`.
- [ ] Auditgeraete festlegen: kleines iPhone-Viewport, groesseres Mobile-Viewport, Desktop, Tastaturbedienung und Screenreader-Smoke soweit praktisch.

## UX-Pruefpunkte

- [ ] Der Check-in startet mobil ohne verdeckte Inhalte, gequetschte Controls oder horizontales Scrollen.
- [ ] Jeder Schritt zeigt genau die noetige Aufgabe; Hilfetexte sind kurz, ernst, sportartenneutral und nicht akademisch.
- [ ] Pflichtantworten blockieren den aktuellen Weiter-Schritt direkt an Ort und Stelle.
- [ ] Nach `Weiter` beginnt der naechste Abschnitt sichtbar oben, ohne irritierende Scrollbewegung oder Wartegefuehl.
- [ ] Buttons geben sofort Press-, Loading- und Disabled-Feedback.
- [ ] Save-, Error-, Offline- und Retry-Zustaende sind ruhig, verstaendlich und verlieren keine lokal belegten Draft-Inhalte.
- [ ] Voice ist optional; Tippen bleibt gleichwertig moeglich.
- [ ] Gestoppte Voice-Eingabe behaelt vorhandenes Transkript.
- [ ] Abschlusskommunikation behauptet nur den gespeicherten Check-in, keine Diagnose, Heilwirkung oder garantierte Leistungssteigerung.

## Accessibility-Pruefpunkte

- [ ] Interaktive Elemente haben erkennbare Namen, Rollen und Zustaende.
- [ ] Der gesamte Flow ist per Tastatur erreichbar und in sinnvoller Reihenfolge bedienbar.
- [ ] Der sichtbare Fokus ist auf jedem interaktiven Element klar erkennbar.
- [ ] Fehlermeldungen werden dem betroffenen Feld oder Schritt zugeordnet und fuer Screenreader wahrnehmbar.
- [ ] Loading-, Save-, Offline- und Erfolgsstatus werden nicht nur farblich vermittelt.
- [ ] Text, Labels und Touch-Ziele bleiben bei Mobile-Viewport und vergroesserter Schrift nutzbar.
- [ ] Slider, Skalen oder Auswahlfelder sind ohne Maus bedienbar und geben aktuellen Wert verstaendlich aus.
- [ ] Icons oder Mikrofonbuttons haben zugaengliche Beschriftungen, wenn ihre Bedeutung nicht aus sichtbarem Text hervorgeht.
- [ ] Kontrast und Lesbarkeit reichen fuer primaere Texte, Fehlermeldungen, Disabled-Zustaende und Fokusindikatoren.

## Privacy- und Domain-Grenzen

- [ ] Der Audit prueft keine Coach-Sicht auf Einzel-Check-ins, Einzelwerte oder individuelle psychologische Scores.
- [ ] Screenshots enthalten keine echten Namen, E-Mails, Teamcodes, Freitexte oder privaten Zustandsverlaeufe.
- [ ] Check-in-Werte werden nur als direkt erhobene Tageszustaende verstanden, nicht als Persoenlichkeitsprofil oder Diagnose.
- [ ] Completion darf fachlich nur nach erfolgreichem Check-in-Save als erledigt gelten.
- [ ] Bei Save-Fehlern darf keine falsche Completion oder Erfolgsmeldung entstehen.

## Stoppen und eskalieren

- [ ] Stoppen, wenn echte Athleteninhalte, Secrets, produktive Daten oder sensible Einzelwerte sichtbar werden.
- [ ] Stoppen, wenn Auth, Rollen, RLS, Consent, Account-Loeschung, Migrationen oder Production relevant werden.
- [ ] Stoppen, wenn eine beobachtete UX-Aenderung wissenschaftliche Bedeutung, Scoring oder Claims veraendern wuerde.
- [ ] Stoppen, wenn der Audit nur durch Scope-Ausweitung in Produktcode oder sensitive Pfade fortsetzbar waere.

## Ergebnisnotiz

- [ ] Gepruefte Umgebung, Datum, Branch und Commit notieren.
- [ ] Getestete Viewports, Eingabemethoden und Hilfstechnologien notieren.
- [ ] Findings mit Repro-Schritten, erwarteter Wirkung und Risiko einstufen.
- [ ] Nicht gepruefte Punkte transparent nennen.
- [ ] Keine Screenshots oder Logs mit privaten Inhalten anhaengen.
