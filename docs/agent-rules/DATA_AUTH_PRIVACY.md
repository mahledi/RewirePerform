# Data, Auth and Privacy

Quelle: aktive `RP-PR-*`, Privacy- und Tracking-Grenzen. `BD-01`, `BD-02`, `BD-04`, `BD-05` bleiben blockierend.

## Aktive harte Regeln

- Auth basiert auf Supabase Sessions; ein lokaler Rollen-Cache ist nur UX, kein Berechtigungsbeweis.
- Rollen, Teamzugriff und sensitive Daten werden serverseitig per RLS/RPC begrenzt.
- Coaches sehen keine Journaltexte, freien Reflexionen, Rohantworten, Einzel-Check-ins oder individuellen psychologischen Scores.
- Evidence-Exporte enthalten keine Namen, E-Mails, privaten Texte, Rohantworten oder Einzelverlaeufe.
- `app_event_log` bleibt technische Incident-Diagnose ohne private Inhalte,
  Teamcodes oder freie Fehlermeldungen. Sentry ist aus der App entfernt und darf
  ohne neue ausdrueckliche Privacy- und Produktfreigabe nicht verbunden werden.
- Consent `null` oder `false` ist keine Evidence-Zustimmung. Produktnutzung bleibt bei `false` moeglich.
- Ein lokaler Pending-Consent zaehlt erst nach erfolgreicher Serverspeicherung.
- QA/Test und Production bleiben unterscheidbar und standardmaessig aus Production-Evidence ausgeschlossen.
- Aggregate unter n=5 werden serverseitig unterdrueckt.
- Frontend verwendet nur Publishable Key; Service Role bleibt Backend-Secret.

## Vollstaendig blockiert

Solange die jeweils einschlaegige Blocking Decision ungeloest ist: keine Production-/Supabase-Aktion, Migration, Auth-/RLS-Aenderung, Consent-Logik, Account-Loeschung, Minderjaehrigen-Einwilligung oder Erweiterung sensibler Coach-/Athleten-Datenfluesse. Teilfreigaben und verbleibende Remote-Gates stehen verbindlich in `BLOCKING_DECISIONS.md`.

Auch bei lokaler Planung niemals Secrets, Passwoerter oder reale private Daten ausgeben oder committen.
