# Feedback Intelligence 1.1 – finaler DE-Consent-/Guardian-Vertrag

Stand: 13. August 2026
Status: lokaler, versionierter Review-Kandidat; **nicht aktiviert**

## Verbindlicher Produktumfang

- Release-Land ist ausschließlich Deutschland.
- RewirePerform ist ab 13 Jahren vorgesehen.
- Von 13 bis einschließlich 15 Jahren bleibt der bestehende Unter-16-Weg
  verpflichtend: passende Freigabe einer sorgeberechtigten Person **und**
  eigene altersgerechte Entscheidung des Athleten.
- Mit 16 oder 17 entscheidet der Athlet im Deutschland-Flow selbst.
- Es wird nur die Altersgruppe gespeichert, kein Geburtsdatum und keine
  Ausweiskopie.
- Österreich, die Schweiz und alle weiteren Länder bleiben `out_of_scope`.

Die technische Länderpolicy bleibt bis zur qualifizierten deutschen Rechts-,
Datenschutz- und Minderjährigenprüfung auf `legal_review_required`. Diese
Dokumentation ersetzt keine Rechtsberatung und öffnet keinen Runtime-Gate.

## Getrennte Feedbackzwecke

Strukturierte Feedbackfragen funktionieren vollständig ohne Kommentar. Ein
Athlet kann einen klar als Produktfeedback gekennzeichneten Kommentar nur nach
einer separaten, nicht vorausgewählten Einwilligung freiwillig ergänzen. Ein
Nein verändert weder Programm noch strukturierte Antworten.

Der Kommentar darf ausschließlich gemeinsam mit den zugehörigen strukturierten
Feedbackantworten und minimierten Aktivitätszahlen zur Produktverbesserung
ausgewertet werden. Ausgeschlossen bleiben insbesondere private Journale,
private Reflexionen, Coach- und Teamtexte sowie Namen und E-Mail-Adressen im
Analyseexport. Es gibt keine Nutzung für Werbung, Personalisierung,
Coach-Bewertungen oder automatisierte Entscheidungen über Athleten.

Die Auswertung ist Produktverbesserung, keine Diagnose, Behandlung, Therapie,
medizinische Forschung oder Wirksamkeitsstudie. Es wird keine Leistungswirkung
versprochen.

## Versionierte Notice-Pins

| Dokument | Version/Referenz | SHA-256 |
| --- | --- | --- |
| Athleten-Consent | `feedback-text-consent-v1.1.0` | `c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16` |
| Guardian-Policy | `guardian-feedback-text-de-v1.1.0` | `90b0ede2a1a7671f1631e2048a605e6331006972ee05e63d38d229857f0aeb0b` |
| Scope | `product-improvement-individual-text-ai-analysis-v1` | – |
| Maximale Rohtextdauer | 365 Tage | – |

Die bisherigen `*-draft`-Zeilen und das akzeptierte v0.3.3-Semantikpaket
bleiben historische, bytegepinnte Evidenz. Sie werden weder überschrieben noch
als Freigabe des neuen Vertrags umgedeutet.

## Additive Registrierung – bewusst fail-closed

Die additive Migration
`20260813115737_feedback_consent_guardian_de_v1_1_final_contract.sql` darf nur
auf dem exakt erwarteten geschlossenen Vorgängerstand laufen. Sie:

1. setzt den DE-Produktmindestwert von 15 auf 13;
2. behält `product_guardian_required_below_age = 16` bei;
3. pinnt die vier weiterhin als `draft` geführten Kampagnen auf die finale
   Athleten-Notice;
4. registriert die finale Guardian-Policy ausschließlich als `draft`;
5. lässt DE für strukturierte Antworten und Rohtext auf
   `legal_review_required`;
6. lässt AT/CH `out_of_scope`;
7. lässt alle Collection-, Privacy-, App-Store- und Minor-Gates `false`.

Sie aktiviert keine Kampagne, keine Guardian-Policy, keinen Feedback-Write,
keinen Jarvis-Read und kein Credential. Sie vergibt keine neuen Rechte.

## Beabsichtigter interner Verarbeitungsweg

Wenn der Vertrag später getrennt freigegeben und aktiviert wird, kann der
Producer einen minimierten, erneut consent-geprüften Export an das intern
betriebene Jarvis-System liefern. Der Export enthält keine Namen,
E-Mail-Adressen oder direkten Nutzerkennungen. Jarvis darf keine zweite
Rohtextkopie persistieren; kein externer KI-Anbieter erhält echte Kommentare.

Dieser reale Production-Read ist auf diesem Stand **nicht aktiv**. Deployment
der credentiallosen Edge Function, ein `503` bei geschlossenem Gate und ein
synthetischer früherer Nachweis belegen nicht die Freigabe echter Daten.

## Getrennte Freigabereihenfolge

1. unabhängige Byte-/Semantikprüfung dieses neuen Pakets;
2. qualifizierte DE-Rechts-/Privacy-/Minor-Prüfung einschließlich
   Guardian-Verifikation und 365-Tage-Höchstdauer;
3. App-Privacy-Angaben, Datenschutzerklärung und Review Notes gegen denselben
   finalen RC festziehen;
4. additive Registrierungsmigration kontrolliert anwenden, alle Gates weiter
   geschlossen;
5. positive synthetische Smokes für Erwachsene, 16/17, 13–15 mit Guardian,
   Ablehnung, Widerruf, Löschung und Offline-/Retry;
6. erst danach separate Entscheidung über Collection-/Minor-/Guardian-Gates;
7. echter Jarvis-Read nur nach eigenem Credential-, Consumer-, Lösch- und
   Production-Gate.

Push, Merge, Production-Apply, TestFlight, App-Store-Eintragung und echter
Jarvis-Zugriff werden durch diesen Vertrag nicht freigegeben.
