# RewirePerform Agent Rules

Diese Dateien sind die kontrolliert aktivierte, repository-basierte Wissensschicht fuer neue Agenten. Sie wurden aus `docs/mahleos-handoff/` abgeleitet. Das vollstaendige Manifest ordnet jede extrahierte Regel ein; nur `ACTIVE_HARD_RULE` und `ACTIVE_CONTEXT_RULE` sind aktiv.

## Aktiv

- `PRODUCT_MISSION.md`: Mission und Positionierung.
- `CURRENT_PRODUCT_PHASE.md`: aktueller, vorsichtig formulierter Stand.
- `DOMAIN_RULES.md`: fachliche Produktmechanik.
- `SCIENTIFIC_INTEGRITY.md`: Claim- und Evidence-Grenzen.
- `DATA_AUTH_PRIVACY.md`: Daten- und Zugriffsschutz.
- `UI_UX_RULES.md`: Produktwirkung und Interaktion.
- `ENGINEERING_RULES.md`: Arbeits- und Codequalitaet.
- `RISK_MATRIX.md`: R1 bis R5.
- `DEFINITION_OF_DONE.md`: Abschlusskriterien.
- `STOP_CONDITIONS.md`: verbindliche Unterbrechungsregeln.
- `SOURCE_OF_TRUTH.md`: Belegreihenfolge.
- `KNOWN_FAILURE_MODES.md`: bekannte technische und produktbezogene Fallen.
- `CURRENT_PRIORITIES.md`: aktive Arbeit mit sichtbarem Reihenfolgekonflikt.
- `ACTIVATION_REVIEW.md`: unabhaengiger Review und Behandlung der Findings.
- `AGENT_READINESS_TEST.md`: drei simulierte neue Agentenstarts.

## Verbindlich blockierend, aber keine umsetzbaren Fachregeln

- `BLOCKING_DECISIONS.md`: fuenf ungelöste sensitive Entscheidungen; ihre Sperrwirkung ist aktiv.

## Nicht aktiv

- `DEFERRED_RULES.md`: Konflikte, Unsicherheit und Historie.
- `ACTIVATION_MANIFEST.json`: vollstaendige Klassifikation, kein Ersatz fuer Fachregeln.

## Arbeitsregel

Vor jedem Task `AGENTS.md`, Blocking Decisions und die relevante Spezialdatei lesen. Ein Agent darf aus einer deferred Regel keine Erlaubnis ableiten.
