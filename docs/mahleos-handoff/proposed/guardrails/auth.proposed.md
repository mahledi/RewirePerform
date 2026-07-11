# Proposed Auth Guardrails

Status: `PROPOSED`, Code bestaetigt.

- Rollen `athlete`, `coach`, `admin` serverseitig autorisieren.
- lokaler Rollen-Cache ist kein Berechtigungsbeweis.
- Teamcodes und Rollenwechsel muessen RPC/RLS-sicher bleiben.
- Auth Redirects pro Host explizit konfigurieren.
- keine Auth- oder Rollenmutation ohne Mahles Freigabe und echte Rollen-Smokes.
- keine Secrets oder Passwoerter in Logs, Chat oder Frontend.

