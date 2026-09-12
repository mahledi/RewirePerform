# Feedback Intelligence 1.1 – App-Store- und Privacy-Draft

Stand: 2026-08-13
Status: lokaler Implementierungsentwurf; keine Rechts-, App-Store-, KI- oder Production-Freigabe

> **Historischer Entwurf – nicht für V1.2 übernehmen.** Die damalige Option,
> Produktfeedback-Kommentare an Jarvis zu übertragen, ist verworfen. Für V1.2
> gilt ausschließlich der strukturierte Datenweg ohne Freitext aus
> [`APP_STORE_CONNECT_V1_2_STRUCTURED_JARVIS_DELTA_2026-08-24.md`](../APP_STORE_CONNECT_V1_2_STRUCTURED_JARVIS_DELTA_2026-08-24.md)
> und
> [`V1_2_STRUCTURED_JARVIS_CONTROLLER_SUPPLEMENT_2026-08-24.md`](../V1_2_STRUCTURED_JARVIS_CONTROLLER_SUPPLEMENT_2026-08-24.md).

## Produktwahrheit

Die Checkpoints an Tag 10, 24, 39 und 55 erfassen strukturierte Produktfeedback-Antworten. Zusätzlich kann ein Athlet nach einer separaten, freiwilligen und nicht vorangekreuzten Einwilligung einen ausdrücklich als Produktfeedback markierten Kommentar abgeben.

Journaltexte, private Reflexionen, Supporttexte, Coach-Beobachtungen und andere nicht ausdrücklich als Produktfeedback abgefragte Freitexte bleiben außerhalb dieses Systems. Ein Feedback-Kommentar wird nicht für Werbung, Personalisierung, Coach-Bewertung oder automatisierte Entscheidungen über Athleten verwendet.

## App Privacy Details – RC-Abgleich

Diese Einordnung muss im finalen Release Candidate gegen die tatsächlich aktivierten Flags, Datenbankmigrationen, Provider und den Binary-Network-Report geprüft werden.

| Apple-Datenart | Konkrete Feedback-Daten | Linked to User | Zweck | Tracking |
| --- | --- | --- | --- | --- |
| Product Interaction | Programmtag, Fragebogen-/Inhaltsversion, strukturierte Antworten, Abschluss- und Aktivitätszählungen | Ja, solange im Producer über die Programminstanz verbunden | App Functionality; Analytics | Nein |
| Other User Content | nur bewusst abgegebene optionale Produktfeedback-Kommentare | Ja, bis Widerruf/Löschung oder echte Anonymisierung | App Functionality; Analytics | Nein |
| User ID / Identifiers | interne User-/Programminstanz-Verknüpfung; im Machine-Export nur rotierende bzw. gehashte Referenzen | Ja im Producer; keine direkte Kennung im Consumer-Paket | App Functionality; Security; Analytics | Nein |

Nicht als neue Feedback-Quelle erklären: Journalinhalt, Reflexionsinhalt, Team-/Coach-Daten oder Textlänge/Qualität privater Journale. Journal-Eintragsanzahl ist ausschließlich eine Product-Interaction-Zählung.

## Einwilligung und Widerruf

- Strukturierte Antworten funktionieren ohne Freitext-Einwilligung.
- Vor dem ersten Kommentarfeld steht eine eigene freiwillige Entscheidung; keine Option ist vorangekreuzt.
- Ablehnung öffnet kein Kommentarfeld und verändert weder Programm noch Fragebogen.
- Jede erteilte Freitext-Einwilligung ist unter `Einstellungen → Konto & Daten` sichtbar und einzeln widerrufbar.
- Der Widerruf löscht Rohtext und personenbeziehbare Analyseartefakte; strukturierte Antworten bleiben erhalten.
- RewirePerform ist ab 13 Jahren vorgesehen. Von 13 bis einschließlich 15 bleibt Freitext im vorgesehenen Deutschland-Flow ohne exakt passenden Guardian-Scope und eigene Athletenentscheidung technisch gesperrt; mit 16 oder 17 entscheidet der Athlet selbst.
- Update 1.1 ist ausschließlich für Deutschland vorgesehen. Alle Nicht-DE-Länder bleiben technisch `out_of_scope` und gesperrt; ihre spätere Freigabe wäre ein neuer internationaler Rechts-, Privacy- und Store-Release.

## Machine-/KI-Gate

Der vorgesehene interne Verarbeitungsweg ist nun konkret benannt: Supabase in
`eu-central-1` stellt nach erneutem Consent- und Policy-Check einen minimierten,
byte-gepinnten Export über eine eigene Edge Function bereit. Die Übertragung
erfolgt per HTTPS an das lokal auf Mahles Mac betriebene Jarvis-System. Jarvis
ruft keinen externen KI-Anbieter auf, persistiert weder Rohkommentare noch
direkte Nutzerreferenzen und behält nur zusammengefasste Auswertungen und
Berichte. Cloudflare gehört nicht zu diesem Feedback-Datenpfad.

Dieser Pfad ist bislang ausschließlich mit synthetischen Staging-Daten
nachgewiesen. Die Production-Edge-Function ist credentiallos und fail-closed
deployed; ein erlaubter Request endet bei geschlossenem Gate mit `503`.
Production-Reader, Machine-Credential und echter Datenread sind nicht aktiviert.
Kein externer KI-Anbieter erhält echte Feedback-Kommentare.
Vor einem echten Read sind mindestens erforderlich:

1. finaler Production-Processor- und Zielumgebungsnachweis einschließlich der nicht durch aktuelle Evidenz belegten Edge-Ausführungsregion;
2. entsprechend aktualisierte und versionierte Privacy- und Consent-Information;
3. byte-gepinnter Consumer-Vertrag und eigenes Read-only Machine-Credential;
4. Production-, Privacy-, App-Store- und Minor-Gates einzeln geöffnet;
5. Nachweis, dass Consent beim Export erneut geprüft, Widerruf fail-closed berücksichtigt und kein zweiter Rohtextbestand persistiert wird.

## Aufbewahrung – technisch festgelegt, rechtlich noch freizugeben

Rohtext und personenbeziehbare Ableitungen werden bei Widerruf oder Kontolöschung sofort aus dem aktiven Feedbacksystem entfernt. Zusätzlich ist technisch eine maximale Aufbewahrungsdauer von 365 Tagen samt täglichem Retention-Job vorgesehen. Die Dauer und die finalen Texte müssen vor Aktivierung rechtlich freigegeben werden. Bis dahin bleiben `privacy_notice_ready`, `app_store_declaration_ready` und der Raw-Text-Ländergate geschlossen.

## App-Store-Review-Notiz – Draft

> RewirePerform bietet an vier festen Programmpunkten freiwillige Produktfeedback-Checkpoints. Strukturierte Antworten sind unabhängig von optionalen Kommentaren nutzbar. Ein Kommentarfeld wird nur nach einer separaten, nicht vorangekreuzten Einwilligung geöffnet. Private Journale und Reflexionen werden nicht für diese Analyse verwendet. Nutzer können jede Freitext-Einwilligung in der App widerrufen; dadurch werden Kommentar und personenbeziehbare Ableitungen gelöscht. Die Daten werden nicht für Werbung, Tracking, Coach-Bewertungen oder automatisierte Entscheidungen verwendet.

> Freigegebene Kommentare können zusammen mit minimierten strukturierten Feedback- und Aktivitätsdaten im intern und lokal betriebenen Jarvis-System ausgewertet werden. Der Analyseexport enthält keine Namen, E-Mail-Adressen oder direkten Nutzerkennungen. Jarvis speichert keine zweite Rohtextkopie; kein externer KI-Anbieter erhält die Kommentare.

## Release-Blocker

- qualifizierte Rechts-/Datenschutzfreigabe der finalen Texte und Rechtsgrundlagen;
- rechtliche Freigabe der technisch festgelegten 365-Tage-Höchstdauer und des automatisierten Löschlaufs;
- finaler Production-Nachweis für den benannten internen Jarvis-Verarbeitungsweg;
- finale App Privacy Details im App Store Connect auf Basis des echten RC;
- eine User Privacy Choices URL nur dann, wenn dafür eine echte öffentliche Seite bereitsteht; andernfalls bleibt das optionale App-Store-Feld leer;
- aktualisierte Review Notes;
- Deutschland-Minor-/Guardian-Texte und Staging-Negativtests; Nicht-DE muss fail-closed bleiben;
- Apple-Altersrating anhand der finalen Funktionen, nicht nur der Zielgruppe.

## Primärquellen

- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Apple App Store Connect – App Privacy: https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy
- Apple App Store Connect – Age Rating: https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/
- DSGVO, insbesondere Art. 6, 7, 8 und 13: https://eur-lex.europa.eu/eli/reg/2016/679/oj
