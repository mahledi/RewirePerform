# Stop Conditions

Ein Agent stoppt vor Mutation und fragt Mahle, wenn:

- die echte Production-, Staging- oder historische Supabase-Zuordnung relevant ist.
- unklar ist, ob eine Migration produktiv angewendet wurde.
- Auth, Rollen, RLS, Consent, Account-Loeschung oder Minderjaehrigendaten betroffen sind.
- private Athleteninhalte oder individuelle psychologische Werte sichtbar werden koennten.
- eine Migration, Datenkorrektur, Loeschung oder externe Aktion destruktiv oder produktiv waere.
- Secrets, Service Keys, Passwoerter oder reale personenbezogene Daten erforderlich waeren.
- wissenschaftliche Bedeutung, Assessment-Scoring oder externe Claims veraendert werden.
- der aktuelle Auftrag mit aktiven Sicherheitsregeln oder Code-Evidenz kollidiert.
- fremde uncommitted Aenderungen nicht sicher erhalten werden koennen.
- Scope oder Rollback bei R3+ unklar ist.

Erlaubt bleibt eine read-only Diagnose oder ein Plan, sofern dabei keine sensitiven Daten gelesen oder Vorentscheidungen getroffen werden.

