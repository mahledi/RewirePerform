# Feedback Intelligence V1.1 – kombinierter Staging-Predeploy-Nachweis

Stand: 10. August 2026  
Status: `PREPARED_FAIL_CLOSED_AWAITING_SEPARATE_STAGING_APPLY`

## Was jetzt lokal bewiesen ist

Der Release-Branch enthält gemeinsam und bytegenau:

- Consent-/Guardian-Semantik `0.3.2-draft`;
- Exportvertrag `0.2.1-draft` mit eindeutig gezählten geplanten Transfer-Tagen;
- den Edge-Gateway, der Anfrage, Datenbank-RPC und Erfolgsschema konsistent auf
  `0.2.1-draft` pinnt;
- die unabhängigen Jarvis-Acceptance-Hashes für alle drei Ebenen.

Die kombinierten Producer- und Consumer-Pins liegen maschinenlesbar in
`contracts/combined-staging-predeploy-v0.1/evidence.json`. Das Paket erfindet
keine neue Staging-Evidence und deutet ältere V0.2.0-/V0.3.1-Nachweise nicht um.

## Was ausdrücklich nicht passiert ist

- keine Migration angewendet;
- keine Edge Function deployed;
- kein Reader-Passwort und kein Machine-Key erstellt;
- kein Collection-, Minor-, Guardian-, Consumer- oder Export-Gate geöffnet;
- kein Netzwerk- oder Jarvis-Read;
- keine echten Daten gelesen oder geschrieben;
- kein Push, Merge, Production-, TestFlight- oder App-Store-Schritt.

## Nächster kontrollierter Gate

Erst nach eigener Freigabe dürfen die drei exakt gepinnten Migrationen und der
exakt gepinnte Edge-Quelltext in das getrennte synthetische Staging-Projekt
`zbeswjipayspgvcipzmx` übernommen werden. Direkt danach ist ein neuer
metadata-only Postdeploy-Audit erforderlich. Auch dieser Schritt darf noch
keine Credentials erzeugen und keinen Netzwerk-One-Shot ausführen.

Production und reale Minderjährigen-/Feedbackdaten bleiben davon vollständig
getrennt und geschlossen.
