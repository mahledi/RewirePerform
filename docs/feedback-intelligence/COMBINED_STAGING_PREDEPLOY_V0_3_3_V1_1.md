# Feedback Intelligence V1.1 – v0.3.3 Combined-Staging-Predeploy

Stand: 10. August 2026
Status: `PREPARED_FAIL_CLOSED_V0_3_3_AWAITING_SINGLE_REGISTRY_MIGRATION_APPLY`

## Lokal und bytegenau bewiesen

- Semantik `0.3.3-draft` und Gateway `0.2.1+0.3.3-draft` sind durch den
  unabhängigen Jarvis-Consumer auf Commit `71f853da86a0d6450233c695702747d52059cd6e`
  akzeptiert.
- Exportvertrag und -schema bleiben exakt `0.2.1-draft`.
- Requestschema und Edge-Source sind gegenüber dem bereits geprüften
  v0.3.2-Staging-Stand bytegleich.
- Der einzige neue Staging-Delta ist die additive, fail-closed
  Registrymigration
  `20260810154932_feedback_intelligence_visualization_copy_v1_1_2.sql`.
- Diese Migration aktualisiert ausschließlich vier weiterhin als `draft`
  geführte Kampagnen auf die v1.1.2-Fragebogen-/Content-Hashes. Sie aktiviert
  keine Kampagne und ändert keine Antwort-, Consent- oder Guardian-Zeile.
- Deshalb ist für diesen Delta kein Edge-Redeploy fachlich erforderlich.

## In diesem Gate ausdrücklich nicht erfolgt

- keine Migration angewendet;
- kein Edge-Deploy;
- keine Credentials oder Secrets erzeugt;
- kein Reader-Passwort gesetzt;
- kein Feedback-, Minor-, Guardian-, Consumer-, Synthetic- oder
  Production-Gate geöffnet;
- kein Netzwerk-, Export- oder Jarvis-Read;
- kein Push, Merge, Production-, TestFlight- oder App-Store-Schritt.

## Exakter nächster Gate

Ein metadata-only Audit **ohne vorherige Anwendung** der neuen Migration reicht
nicht: Es könnte lediglich bestätigen, dass Staging noch auf der historischen
v0.3.2-Registry steht.

Nach einer separat freigegebenen Anwendung exakt dieser einen Migration genügt
hingegen ein nicht mutierender metadata-only Postdeploy-Audit. Er muss beweisen,
dass:

1. exakt vier Draft-Kampagnen die v1.1.2-Versionen und gepinnten Hashes tragen;
2. sämtliche Aktivierungs-, Minor-, Guardian-, Synthetic- und Production-Gates
   geschlossen bleiben;
3. Export-RPC, Requestschema, Reader-Rechte und Edge-Source unverändert sind;
4. keine Anwendungszeile und kein Export gelesen wurde;
5. während des Audits keine weitere Mutation ausgeführt wurde.

Erst dieses neue Postdeploy-Evidence-Paket kann v0.3.3-Staging-Assurance
begründen. Historische v0.3.2- oder Synthetic-Evidence autorisiert v0.3.3 nicht.
