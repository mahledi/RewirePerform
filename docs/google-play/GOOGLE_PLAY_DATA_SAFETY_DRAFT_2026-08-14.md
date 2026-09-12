# RewirePerform 1.1 — Google Play Data Safety Draft

Stand: 20. August 2026
Status: finaler Code-/Binary-Entwurf für die Play-Eingabe; noch nicht an Google
übermittelt

## Plattformwahrheit

Android, iOS und Web nutzen dasselbe Supabase-Production-Projekt, dieselben
RPCs und Edge Functions sowie dieselben Auth-, Consent-, Minor-, Guardian-,
Feedback- und RLS-Gates. Android besitzt keinen eigenen Datenbestand oder
Jarvis-Reader. Der Transport unterscheidet sich nur technisch: Android nutzt
für den allgemeinen Supabase-Client WebView-`fetch`; Ziel und Datenvertrag
bleiben gleich.

Google Play versteht bereits die Übertragung vom Gerät an das Backend als
Erhebung. Deshalb bildet dieser Entwurf den gesamten Android-App-Datenweg ab,
nicht nur den engeren Jarvis-Export.

## Globale Antworten

| Frage | Entwurf | Begründung/Gate |
| --- | --- | --- |
| Erhebt oder teilt die App Nutzerdaten? | Ja | Konto-, Programm-, Inhalts- und Interaktionsdaten werden an Supabase übertragen |
| Alle Daten bei Übertragung verschlüsselt? | Ja | ausschließlich HTTPS; finalen Binary-/Network-Smoke bestätigen |
| Können Nutzer Löschung anfordern? | Ja | In-App-Self-Service und `https://rewireperform.com/account-deletion` sind live |
| Tracking? | Nein | keine Werbung, kein Datenbroker, kein appübergreifendes Tracking |
| Daten „geteilt“? | Nein | Supabase, Vercel, Cloudflare und Resend sind in der veröffentlichten Datenschutzerklärung als weisungsgebundene Auftragsverarbeiter/Dienstanbieter beschrieben; keine Werbung, Datenbroker oder unabhängige Drittverwendung |

## Zu deklarierende Datentypen

| Google-Kategorie | Datentyp | Erhoben | Zweck | Pflicht/optional |
| --- | --- | --- | --- | --- |
| Personenbezogene Daten | Name | Ja | App-Funktionalität | für Konto/Profil erforderlich |
| Personenbezogene Daten | E-Mail-Adresse | Ja | Konto, Auth, Einladungen, Support | erforderlich; Guardian-E-Mail nur im U16-Weg |
| Personenbezogene Daten | Nutzer-IDs | Ja | Auth, Datenzuordnung, Sicherheit | erforderlich |
| Personenbezogene Daten | Telefonnummer | Bedingt | App-Funktionen, Mitteilungen des Entwicklers | optional, nur bei freiwilliger Organisationsanfrage |
| Personenbezogene Daten | Sonstige Daten | Ja | Altersgruppe, Rolle, Sport-/Organisationsprofil; App-Funktionen und Personalisierung | teils erforderlich; kein Geburtsdatum |
| Gesundheit und Fitness | Gesundheitsdaten | Ja | strukturierte Tageszustände und Assessments; App-Funktionen, Personalisierung und nur bei Einwilligung Analyse | funktionsabhängig |
| Gesundheit und Fitness | Fitnessdaten | Ja | Sportprofil und Trainings-/Wettkampf-/Ruhetagskontext; App-Funktionen, Personalisierung und nur bei Einwilligung Analyse | funktionsabhängig |
| App-Aktivitäten | Andere von Nutzern erstellte Inhalte | Ja | private Journale/Reflexionen und freiwillige Anfragehinweise; ausschließlich App-Funktionen | optional; ausdrücklich nicht für Analytics/Jarvis |
| App-Aktivitäten | App-Interaktionen | Ja | Fortschritt, Aufgaben, Check-ins und Funktionsnutzung; App-Funktionen und Analyse | automatisch/funktionsabhängig |
| App-Informationen und -Leistung | Diagnosedaten | Ja | minimierte Fehlercodes, Route und Funktionsstatus; Analyse/Fehlerbehebung | automatisch, maximal 30 Tage |
| Geräte- oder andere IDs | Geräte- oder andere IDs | Nein | kein Advertising-ID-, Firebase-Installation-ID- oder eigenes Geräte-ID-SDK im AAB | nicht auswählen |
| Standort | Ungefährer/genauer Standort | Nein | keine Standortberechtigung und keine Standortfunktion; aus IP abgeleitete Standortdaten werden von RewirePerform nicht als Produktdatum verwendet | nicht auswählen |

Keine Crash-Dumps, Audiodateien, Kontakte, Fotos, Videos, Dateien oder
Standortdaten werden durch den ausgelieferten App-Code erhoben. Das Manifest
enthält keine entsprechenden Berechtigungen. Die Spracheingabe verwendet die
lokale Android-Spracherkennung; die App speichert oder überträgt keine
Audiodatei.

Der finale signierte AAB-/Dependency-Audit enthält keine Werbe-, Billing-, Firebase-/FCM-,
Crash- oder Marketing-Analytics-SDKs und keine Mikrofon-, Kamera-, Kontakt-,
Standort-, Speicher- oder Werbe-ID-Berechtigung.

## Jarvis-Grenze

Jarvis ist nicht automatisch aktiv und nicht an Google Play gekoppelt. Der
aktuelle Production-Reader hat kein Passwort; Machine-Key, Reader-URL und
Machine-/Real-Data-/Production-Gates bleiben geschlossen.

Ein später separat freigegebener Jarvis-Read darf ausschließlich gepinnte,
pseudonyme Feedback- und Aktivitätsdaten verarbeiten: strukturierte Antworten,
Frage-/Skalen-/Versionsmetadaten, Programmtag, pseudonyme Referenzen,
Consent-Metadaten und minimierte Aktivitätszählungen. Freiwillige
Produktfeedback-Kommentare sind nur mit beim Export erneut gültigem Consent
und bei unter 16 zusätzlich passendem Guardian-Scope zulässig.

Ausgeschlossen bleiben Namen, E-Mail, direkte Nutzer-/Programm-/Team-/Coach-
IDs, Journal- und Reflexionstexte, Supporttexte, einzelne Check-in-Werte,
Transferdetails und psychologische Individualprofile. Jarvis speichert keinen
zweiten Rohtextbestand.

Der Export enthält derzeit kein `platform`-Feld. Jarvis kann Android und iOS
daher nicht zuverlässig getrennt analysieren. Ein solches Feld wäre ein neuer,
minimierter und privacy-geprüfter Contract-Delta und darf nicht still ergänzt
werden.

## Vor Übermittlung zwingend schließen

1. In Schritt 3 der Play Console `Sonstige personenbezogene Daten` ergänzen;
   `Andere von Nutzern erstellte Inhalte` ist bereits korrekt ausgewählt.
   Außerdem `Andere App-Leistungsdaten` durch `Diagnosedaten` ersetzen.
2. Für alle ausgewählten Typen die oben festgelegten Zwecke, `erhoben: ja`,
   `geteilt: nein` und erforderlich/optional exakt eintragen.
3. Die kanonische URL
   `https://rewireperform.com/account-deletion` ist live mit HTTP 200 und
   sichtbarer Löschanleitung geprüft und in Play eingetragen.
4. Feedback Intelligence und Jarvis bleiben für V1.1 geschlossen und werden
   nicht als aktive Datennutzung deklariert.
5. Zielgruppe 13+ und Google-Families-Antworten separat bestätigen.

## Play-Console-Zwischenstand am 20. August

Schritt 4 ist begonnen. `Name`, `E-Mail-Adresse`, `Nutzer-IDs` und
`Telefonnummer` stehen auf „Abgeschlossen“. Unter App-Aktivitäten sind
`App-Interaktionen` und `Andere von Nutzern erstellte Inhalte` korrekt
ausgewählt. Offen sind deren Einzelantworten, beide Typen unter
Gesundheit/Fitness sowie der korrigierte Diagnosedatentyp. Vor dem Weitergehen
muss `Sonstige personenbezogene Daten` ergänzt werden.
