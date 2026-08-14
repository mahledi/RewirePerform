# RewirePerform 1.1 — Google Play Data Safety Draft

Stand: 14. August 2026
Status: konservativer Arbeitsentwurf; finaler signierter AAB lokal auditiert,
vor Übermittlung Dienstleistereinordnung und aktivierte Production-Gates bestätigen

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
| Können Nutzer Löschung anfordern? | Ja, technisch | In-App-Self-Service ist vorhanden; öffentliche Request-URL noch ergänzen |
| Tracking? | Nein | keine Werbung, kein Datenbroker, kein appübergreifendes Tracking |
| Daten „geteilt“? | voraussichtlich Nein | nur wenn Supabase, Vercel, Cloudflare und Resend vertraglich als zweckgebundene Dienstleister unter Googles Definition fallen; final juristisch bestätigen |

## Zu deklarierende Datentypen

| Google-Kategorie | Datentyp | Erhoben | Zweck | Pflicht/optional |
| --- | --- | --- | --- | --- |
| Personenbezogene Daten | Name | Ja | App-Funktionalität | für Konto/Profil erforderlich |
| Personenbezogene Daten | E-Mail-Adresse | Ja | Konto, Auth, Einladungen, Support | erforderlich; Guardian-E-Mail nur im U16-Weg |
| Personenbezogene Daten | Nutzer-IDs | Ja | Auth, Datenzuordnung, Sicherheit | erforderlich |
| Personenbezogene Daten | Telefonnummer | Bedingt | Organisationskontakt | optional, nur ausführliche Anfrage |
| Gesundheit und Fitness | Gesundheitsinformationen | Ja | Tages-Check-ins, Assessments, App-Funktionalität und bei Einwilligung interne Analyse | funktionsabhängig |
| Gesundheit und Fitness | Fitnessinformationen | Ja | Sportprofil, Trainings-/Wettkampf-/Ruhetagskontext, Personalisierung | funktionsabhängig |
| Nutzerinhalte | Sonstige nutzergenerierte Inhalte | Ja | private Journale/Reflexionen, Anfragehinweise und gegebenenfalls separat consentierte Feedback-Kommentare | überwiegend optional |
| Nutzerinhalte | Kundensupport | Bedingt | Bearbeitung freiwilliger Supportanfragen | optional; finalen tatsächlichen In-App-Weg bestätigen |
| App-Aktivität | App-Interaktionen | Ja | Fortschritt, Aufgaben, Check-ins, Checkpoints, Aktivitätszählungen, App-Funktionalität; bei Einwilligung Analytics | funktionsabhängig |
| App-Informationen und -Leistung | Sonstige Leistungsdaten | Ja | pseudonymisierte operative Fehlercodes und Route, Fehlerbehebung | automatisch, maximal 30 Tage laut Privacy-Text |
| Geräte- oder andere IDs | Geräte- oder andere IDs | Zu prüfen | Auth-/Sicherheits- und Turnstile-Metadaten | finaler SDK-/Network-Audit erforderlich |
| Standort | Ungefährer Standort | Zu prüfen | nur falls ein Dienstleister aus IP-/Gerätedaten Standort ableitet | Provider-/Network-Audit erforderlich |

Keine Crash-Dumps, Audiodateien, Kontakte, Fotos, Videos, Dateien oder präzise
Standortberechtigung sind im vorbereiteten Android-Manifest vorgesehen. Die
Spracheingabe darf erst nach dem Geräte-Smoke als rein lokal bezeichnet werden.

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

1. HTTPS und tatsächliche Netzwerkziele auf dem Android-Gerät beobachten.
2. Dienstleister-/„Shared“-Einordnung und optionale Datentypen juristisch
   bestätigen.
3. Die kanonische URL
   `https://rewireperform.com/account-deletion` ist live mit HTTP 200 und
   sichtbarer Löschanleitung geprüft und in Play eingetragen.
4. Tatsächlich aktive Feedback-, Kommentar-, Minor- und Jarvis-Gates gegen die
   Erklärung abgleichen; geschlossene Funktionen nicht als aktiv behaupten.
5. Zielgruppe 13+ und Google-Families-Anforderungen separat bestätigen.
