# Feedback Intelligence – Staging Privilege Audit v0.1

Status: lokales, unsigniertes, reines Metadaten-Audit. Keine Aktivierung.

## Ziel und RACI

RewirePerform/Producer besitzt Query, Reproduzierbarkeit, Ergebnisvalidierung
und den freigegebenen Metadatenlauf. Jarvis besitzt anschließend die
unabhängige bytegenaue Paket-, Allowlist- und Drift-Prüfung ohne Datenbankrolle.
Jede Abweichung ist ein `NO_GO_FAIL_CLOSED`.

Mahles erweiterter fachlicher Leserahmen erlaubt je Quelle einen eigenen,
zweckgebundenen und minimierten Read-only-Contract. Er erlaubt ausdrücklich
keine Admin-Rollenübernahme, keine `service_role`, keinen pauschalen
Tabellenzugriff und kein Schreibrecht. Secrets, Auth-Tokens, unnötige
Identitäten sowie Journal-/Reflexionsrohtexte außerhalb eines ausdrücklich
consentierten Vertrags bleiben ausgeschlossen.

## Dieses Paket liest ausschließlich

- Rollenattribute und direkte Rollenmitgliedschaften aus `pg_catalog`;
- effektive Schema-, Function-, Relation- und Sequence-Privileges über alle
  Relationen in `public` und den vier Feedback-Schemas, unabhängig vom Namen;
- die exakte RPC-Signatur, `SECURITY DEFINER`, Owner-Metadaten und
  Function-Settings;
- Function-Default-ACLs für relevante Owner im Schema `public`;
- eine separate effektive Nebenpfad-Inventur für alle Machine-/Export-
  Kandidaten gegen `PUBLIC`, `anon`, `authenticated` und `service_role`.

Die einzige zulässige Runtime-Ausnahme in dieser Inventur ist der bestehende
Admin-Aggregatvertrag
`authenticated -> public.get_admin_feedback_intelligence_insights(text)` mit
SHA-256 über die vollständige `pg_get_functiondef`-Definition
`9beef5048a25069c5fe381232dc81414ab3d62e300629a5fbf1a986e4c8d38ca`.
Zusätzlich werden Owner `postgres`, `SECURITY DEFINER`, exakt der leere feste
`search_path`, Return Type `jsonb` und Volatilität `STABLE` separat gebunden.
Diese Funktion
prüft `auth.uid()` und `public.has_role(..., 'admin')` vor jeder Auswertung,
wirft sonst `admin_role_required`, liefert ausschließlich vorgegebene
Aggregate und unterdrückt Metriken unter `n < 5`. Jede andere Rolle, Signatur
oder jedes andere Definitions-/Metadaten-Bytebild bleibt NO-GO.

Es liest keine Anwendungszeile, ruft keine Anwendungsfunktion auf und führt
keinen DDL-/DML-/Rollenwechsel aus. Das Ergebnis enthält nur technische
Metadaten und keine Athleten-, Feedback-, Consent-, Guardian- oder
Aktivitätsdaten.

## Zwei klar getrennte Phasen

`PREDEPLOY_BASELINE` prüft den Ist-Zustand, bevor die separat
freigabepflichtige Gateway-Migration existiert. Diese Phase kann niemals die
finale Reader-Allowlist bestätigen. `POSTDEPLOY_ASSURANCE` verlangt dagegen:

- gehärtete Rolle `mahleos_feedback_reader`, ohne Mitgliedschaften;
- `CONNECT`, `USAGE` und tatsächlich aufrufbares `EXECUTE` nur im vorgesehenen
  Pfad;
- exakt den RPC
  `public.read_feedback_intelligence_v0_2_draft(text,text,text,text)`;
- kein aufrufbares Gateway für `anon`, `authenticated` oder `service_role`;
- keinerlei direkte Tabellen-, View-, Sequence-, Raw-, Consent-, Activity-
  oder Analysis-Rechte;
- `SECURITY DEFINER` mit exakt einem Setting, dem leeren festen `search_path`;
- Hosted-Staging-Owner exakt `postgres`, `NOSUPERUSER`, `BYPASSRLS`; jede
  Attributabweichung ist Contract-Drift;
- keinen effektiven `PUBLIC`-Default-EXECUTE-Pfad relevanter Function-Owner.

## Bewusster Stop

Nicht freigegeben und nicht Teil dieses Pakets: Signing-Key, Credential,
Migration, Edge-Deployment, Gate-Öffnung, synthetischer Netzwerk-Read,
Production oder echte Feedbackzeilen. Nach einem grünen Metadatenlauf erhält
Jarvis ausschließlich das unsignierte Paket und das sanitierte Ergebnis zur
unabhängigen Prüfung.
