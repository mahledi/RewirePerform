# App Store Connect V1.1 – finaler Metadaten-Delta

Stand: 13. August 2026  
Kanonische Basis: `APP_STORE_CONNECT_V1_1_SUBMISSION_DRAFT_2026-08-11.md`

Die Basisdatei ist Bestandteil des bytegepinnten Consent-Pakets und bleibt als
historisches Review-Artefakt unverändert. Für die tatsächliche V1.1-Eintragung
gelten zusätzlich und bei Widerspruch vorrangig die folgenden final belegten
Korrekturen.

## Production-Stand

- 105 Production-Migrationen sind verifiziert.
- Die finale Consent-/Guardian-Registrierung `20260813123955` ist angewendet.
- Kampagnen, Guardian-Policy, Collection und Jarvis-Read bleiben bis zur
  separaten Aktivierungsentscheidung geschlossen.
- Der finale V1.1-Client erzwingt `VITE_FEEDBACK_INTELLIGENCE_V1_ENABLED=false`:
  keine Feedback-Checkpoints, keine strukturierte Feedback-Collection, keine
  freiwilligen Athleten-Kommentare und kein Jarvis-Read.
- Beide Production-Edge-Functions sind credentiallos deployed und fail-closed.

## App Privacy

Alle Typen bleiben `Tracking = No` und `Linked = Yes`.

| Datenart | Zwecke |
| --- | --- |
| Health | App Functionality; Product Personalization; Analytics |
| Other Diagnostic Data | App Functionality |
| Phone Number | App Functionality |
| Other Data Types | App Functionality |

`Other Diagnostic Data` bezeichnet ausschließlich pseudonymisierte operative
Fehlerereignisse mit Fehlercode und Route. RewirePerform speichert keine
Crash-Dumps oder freien Fehlertexte. `Other Data Types` bezeichnet die
gespeicherte Altersgruppe. `Phone Number` ist wegen der optionalen Angabe in
der Organisationsanfrage enthalten.

Der native Vertrag liegt in `ios/App/App/PrivacyInfo.xcprivacy`; der statische
Release-Gate erzwingt dieselben vier Datentypen.

## Noch nicht als aktive Praxis in Review Notes behaupten

- echten Jarvis-Production-Read,
- aktive strukturierte Feedback-Checkpoints,
- aktive Feedback-Kommentare,
- aktive Minderjährigen-Feedbackkampagnen,
- öffentlich aktive Organisationsannahme.

Diese Abschnitte werden erst nach qualifiziertem DE-Rechts-/Privacy-/Minor-
Review, positivem synthetischem Production-Smoke und anschließendem Cleanup in
die finalen Review Notes übernommen.
