# RewirePerform Agent Rules

RewirePerform ist ein wissenschaftlich verantwortliches Mental-Performance-System fuer Athleten ab etwa 14 Jahren, Coaches, Teams und spaeter Vereine/NLZs. Ziel sind konkrete taegliche Praxis, privacy-sichere Coach-Unterstuetzung und ehrliche Evidence ohne Diagnose oder uebertriebene Wirkversprechen.

## Verantwortung

Mahle entscheidet Produktvision, Prioritaeten, wissenschaftliche Endclaims, sensible Datenfreigaben, Production, Deployments und App Store. Agenten analysieren, planen und implementieren nur im ausdruecklich freigegebenen Scope. Fragen oder Reviews autorisieren keine Mutation; ein klarer Umsetzungsauftrag wird lokal Ende-zu-Ende verifiziert.

## Regelpraezedenz

1. Aktive Sicherheits- und Datenschutzregeln sowie offene Blocking Decisions
2. Expliziter aktueller Auftrag von Mahle innerhalb dieser Grenzen
3. Diese `AGENTS.md`
4. Aktive Regeln unter `docs/agent-rules/`
5. Aktueller Code und verifizierte Source-of-Truth-Dateien
6. MahleOS-weite allgemeine Regeln
7. Historischer Chatkontext
8. Vermutungen

Eine niedrigere Ebene darf keine hoehere ueberschreiben. Auch ein neuer Auftrag hebt Safety, Privacy oder eine Blocking Decision nicht still auf; dafuer muss Mahle die betroffene Entscheidung ausdruecklich und informiert klaeren. Konflikte werden gemeldet, nicht still aufgeloest.

## Harte Grenzen

- Nicht direkt auf `main` arbeiten.
- Kein Push, Merge, Deploy, Domain-/App-Store-Schritt oder produktiver Netzwerkzugriff ohne Mahles Freigabe.
- Keine Migration anwenden und keine Auth-, RLS-, Consent-, Account-Loesch- oder sensiblen Datenfluesse aendern, solange `BLOCKING_DECISIONS.md` offen ist.
- Keine Secrets, Passwoerter, Service Keys oder privaten Athleteninhalte ausgeben, loggen oder committen.
- Coaches erhalten keine Journaltexte, Freitexte, Rohantworten, Einzel-Check-ins oder individuellen psychologischen Scores.
- Keine Diagnose, Heil-, Therapie-, medizinische oder kausale Wirksamkeitsbehauptung erfinden.
- Bestehende fremde Aenderungen nie ungefragt zuruecksetzen; keine destruktiven Git-Befehle.

## Risiko

- R1: Analyse und Dokumentation.
- R2: lokal reversible Copy/UI-Arbeit.
- R3: Kernflows, Assessments, PWA, Push, Capacitor.
- R4: Auth, Rollen, RLS, Migration, Consent, Coach-Daten, Production.
- R5: echte Datenloeschung, Minderjaehrigenrecht, wissenschaftliche/rechtliche Endfreigabe.

R4/R5 benoetigen vorherige menschliche Freigabe. Details: `docs/agent-rules/RISK_MATRIX.md`.

## Definition of Done

Scope und Source of Truth verstanden; minimales konsistentes Diff; Privacy-, Fehler-, Offline- und Mobile-Zustaende beruecksichtigt; mindestens Typecheck, Tests, Build und `git diff --check` soweit relevant; betroffene UI-Flows soweit praktisch mobil pruefen; keine fremden Aenderungen verlieren; Risiken und nicht ausgefuehrte Tests nennen. Kein Push/Merge/Deploy ohne Freigabe.

## Stoppen

Sofort stoppen und Mahle fragen bei widerspruechlicher Production-Quelle, moeglicher Privacy-Verletzung, Auth/RLS/Consent/Loeschung, Minderjaehrigendaten, destruktiver oder produktiver Aktion, veraenderter wissenschaftlicher Bedeutung oder unklarem Scope. Vollstaendig: `docs/agent-rules/STOP_CONDITIONS.md`.

## Pflichtlekture

1. `docs/agent-rules/README.md`
2. `docs/agent-rules/BLOCKING_DECISIONS.md`
3. `docs/agent-rules/CURRENT_PRODUCT_PHASE.md`
4. die fuer den Task relevanten Spezialregeln
5. `docs/agent-rules/SOURCE_OF_TRUTH.md`
