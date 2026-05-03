# Intent-Auswahl vor Auth

Aktuell gibt es eine flache Auth-Seite mit Rollen-Toggle (Sportler/Trainer) + optionalem Teamcode. Das ist verwirrend. Wir führen eine vorgelagerte Auswahl ein, die den Auth-Flow klar steuert.

## UX-Flow

```
/auth (Schritt 1: Intent)
  ├─ "Allein starten"        → Schritt 2: Signup (Sportler, kein Code)        → /questionnaire
  ├─ "Team beitreten"        → Schritt 2: Signup mit Pflicht-Teamcode-Eingabe → Rolle ergibt sich aus Code (Player/Coach)
  │                                                                              → /questionnaire (athlete) oder /coach (coach)
  └─ "Team erstellen"        → Schritt 2: Signup als Coach (kein Code)        → /coach (dort Team anlegen)

Login bleibt separat, eine flache Form (E-Mail/Passwort) — Routing nach gespeicherter Rolle.
```

Eine "Zurück"-Option führt vom Signup-Schritt zurück zur Intent-Auswahl. Toggle "Bereits registriert? Anmelden" bleibt erhalten und springt direkt in den Login (überspringt Intent-Schritt).

## Änderungen

### `src/pages/Auth.tsx`
- Neuen lokalen State `mode`: `"intent" | "signup" | "login"`. Default `"intent"`.
- Neuen State `intent`: `"solo" | "join" | "create"` — wird in Schritt 1 gesetzt.
- Schritt-1-View: drei große Karten (Icons: `User` solo, `Users` join, `Shield` create) mit kurzer Beschreibung. Darunter Link "Bereits registriert? Anmelden" → setzt `mode = "login"`.
- Schritt-2-Signup-View (nur wenn `mode === "signup"`):
  - Header-Subtitle passt sich an Intent an ("Du startest allein", "Du trittst einem Team bei", "Du erstellst dein Team").
  - **Solo**: keine Teamcode-Eingabe, `selectedRole = "athlete"` fix, kein Rollen-Toggle.
  - **Join**: Teamcode-Pflichtfeld (Validierung: 6 Zeichen, sonst Fehler). Kein Rollen-Toggle (Code bestimmt Rolle).
  - **Create**: kein Teamcode-Feld, `selectedRole = "coach"` fix, kein Rollen-Toggle. Hinweistext: "Du legst dein Team nach der Anmeldung im Coach-Bereich an."
  - Felder Name + Sport bleiben für alle Varianten (Sport bei Coach optional → Validierung anpassen: Sport nur Pflicht wenn `intent !== "create"`).
  - "Zurück"-Button oben links → `mode = "intent"`.
- Login-View (`mode === "login"`): nur E-Mail + Passwort + Submit. Link "Noch kein Konto?" → `mode = "intent"`.
- `handleSubmit` Anpassungen:
  - Bei Signup `effectiveRole` = abhängig vom Intent setzen (`solo`/`join`→athlete-Default, `create`→coach).
  - Bei `intent === "join"`: Teamcode Pflicht; bei Fehlschlag (RPC) NICHT weiternavigieren, sondern Fehler zeigen und User im Signup belassen (heute nur Toast + trotzdem weiter).
  - Navigation: `solo` → `/questionnaire`; `join` → server-Rolle (`/questionnaire` oder `/coach`); `create` → `/coach`.

### Keine Backend-Änderungen
RPC `join_team_by_code` und Rollen-Trigger bleiben unverändert. Server entscheidet weiterhin verbindlich über die Rolle bei Code-Beitritt.

## Edge Cases
- User wechselt in Schritt 2 den Intent zurück → Felder bleiben erhalten (kein Reset).
- Solo-User, der später Team beitreten will: weiterhin über Settings/Teamcode-Flow möglich (nicht Teil dieser Änderung).
- Coach-Erstellung ohne Team: `/coach` zeigt bereits leeren Zustand mit "Erstelle zuerst ein Team unter Teams" — passt.

## Out of Scope
- Keine Änderungen an `/coach`, Dashboard, Questionnaire-Routing.
- Kein Email-Verify-Flow-Umbau.
