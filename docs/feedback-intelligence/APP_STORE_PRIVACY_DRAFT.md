# Feedback Intelligence 1.1 – App-Store- und Privacy-Draft

Stand: 2026-08-05  
Status: lokaler Implementierungsentwurf; keine Rechts-, App-Store-, KI- oder Production-Freigabe

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
- Unter 16 bleibt Freitext im vorgesehenen Deutschland-Flow ohne exakt passenden Guardian-Scope technisch gesperrt.
- Update 1.1 ist ausschließlich für Deutschland vorgesehen. Alle Nicht-DE-Länder bleiben technisch `out_of_scope` und gesperrt; ihre spätere Freigabe wäre ein neuer internationaler Rechts-, Privacy- und Store-Release.

## Machine-/KI-Gate

Derzeit erhält kein externer KI-Anbieter echte Feedback-Kommentare. Vor einem echten Read sind mindestens erforderlich:

1. konkreter Anbieter, Empfänger, Region, Transfer- und Auftragsverarbeitungsgrundlage;
2. entsprechend aktualisierte und versionierte Privacy- und Consent-Information;
3. byte-gepinnter Consumer-Vertrag und eigenes Read-only Machine-Credential;
4. Production-, Privacy-, App-Store- und Minor-Gates einzeln geöffnet;
5. Nachweis, dass Consent beim Export erneut geprüft, Widerruf fail-closed berücksichtigt und kein zweiter Rohtextbestand persistiert wird.

## Aufbewahrung – technisch festgelegt, rechtlich noch freizugeben

Rohtext und personenbeziehbare Ableitungen werden bei Widerruf oder Kontolöschung sofort aus dem aktiven Feedbacksystem entfernt. Zusätzlich ist technisch eine maximale Aufbewahrungsdauer von 365 Tagen samt täglichem Retention-Job vorgesehen. Die Dauer und die finalen Texte müssen vor Aktivierung rechtlich freigegeben werden. Bis dahin bleiben `privacy_notice_ready`, `app_store_declaration_ready` und der Raw-Text-Ländergate geschlossen.

## App-Store-Review-Notiz – Draft

> RewirePerform bietet an vier festen Programmpunkten freiwillige Produktfeedback-Checkpoints. Strukturierte Antworten sind unabhängig von optionalen Kommentaren nutzbar. Ein Kommentarfeld wird nur nach einer separaten, nicht vorangekreuzten Einwilligung geöffnet. Private Journale und Reflexionen werden nicht für diese Analyse verwendet. Nutzer können jede Freitext-Einwilligung in der App widerrufen; dadurch werden Kommentar und personenbeziehbare Ableitungen gelöscht. Die Daten werden nicht für Werbung, Tracking, Coach-Bewertungen oder automatisierte Entscheidungen verwendet.

## Release-Blocker

- qualifizierte Rechts-/Datenschutzfreigabe der finalen Texte und Rechtsgrundlagen;
- rechtliche Freigabe der technisch festgelegten 365-Tage-Höchstdauer und des automatisierten Löschlaufs;
- konkreter KI-/Machine-Empfänger oder bestätigter Verzicht auf echten Text-Export;
- finale App Privacy Details im App Store Connect auf Basis des echten RC;
- aktualisierte User Privacy Choices URL und Review Notes;
- Deutschland-Minor-/Guardian-Texte und Staging-Negativtests; Nicht-DE muss fail-closed bleiben;
- Apple-Altersrating anhand der finalen Funktionen, nicht nur der Zielgruppe.

## Primärquellen

- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Apple App Store Connect – App Privacy: https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy
- Apple App Store Connect – Age Rating: https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/
- DSGVO, insbesondere Art. 6, 7, 8 und 13: https://eur-lex.europa.eu/eli/reg/2016/679/oj
