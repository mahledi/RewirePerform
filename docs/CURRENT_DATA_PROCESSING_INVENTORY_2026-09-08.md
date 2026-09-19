# RewirePerform – aktuelles Datenverarbeitungs-Inventar

Stand: 8. September 2026  
Status: `CURRENT_CODE_AND_READ_ONLY_PRODUCTION_CHECK__NO_NEW_PROCESSING_ACTIVATED`

## Zweck

Dieses Inventar beschreibt in normalen Worten, welche Daten die heute vorhandenen Produktfunktionen verarbeiten, wofür sie verwendet werden und wer sie sehen darf. Es ist die technische Grundlage für Datenschutzerklärung, Store-Angaben und die spätere V4-Entscheidung. Es ist keine Rechtsfreigabe und aktiviert weder das longitudinale Evidence-System noch einen Backfill.

## Aktuell verwendete Daten

| Bereich | Tatsächliche Daten | Zweck | Sichtbarkeit | Aufbewahrung / Löschung | Evidence-Status |
|---|---|---|---|---|---|
| Konto und Profil | E-Mail, Passwort-Hash beim Auth-Anbieter, Rolle, Name, Sport, Position, Team und Sportklassifikation | Anmeldung, Rollen- und Teamzugang, passende Produktdarstellung | Nutzer selbst; eng begrenzte Team-/Adminfunktionen | Solange das Konto besteht; Entfernung aus dem aktiven System bei Kontolöschung | Direkte Identifikatoren ausgeschlossen |
| Programmlauf | Instanz, Teamlauf, Startdatum, Status, aktueller Tag und Phase | Richtigen 56-Tage-Lauf und Tagesinhalt bestimmen | Nutzer selbst; Coach nur operative Teilnahmeinformationen | Solange das Konto beziehungsweise der Programmlauf besteht | Nur pseudonymisiert und nach gültiger freiwilliger Freigabe vorgesehen |
| Tagesabschluss | geöffnete und erledigte Tage, Abschlusszeitpunkte, Aufgabenstatus, Variante und Bearbeitungsdauer | Fortschritt, Serie, Wiederaufnahme und eigene Entwicklung anzeigen | Nutzer selbst; Coach sieht operative Abschlussinformationen | Solange das Konto besteht | Completion beschreibt Nutzung, nicht mentale Qualität oder Wirkung |
| Täglicher Check-in | Ereignisart; Stimmung, Energie, Fokus, Stress, Erholung, Schlafqualität, körperliche Bereitschaft, Motivation/Bereitschaft, Leistungsdruck, Verbindung zum sportlichen Umfeld; erledigte Schritte | Tagesflow, eigene Verlaufsansicht und ausreichend große Teamtendenzen | Einzelwerte nur Nutzer; Coach nur Abschlussstatus und geschützte Teamaggregate ab mindestens fünf berechtigten Personen | Solange das Konto besteht | Aktueller enger Pilotumfang verwendet höchstens freigegebene strukturierte Werte; keine Freitexte |
| Assessments und Fragebögen | versionierte Antworten, interne Scores, Messzeitpunkt, Bearbeitungsstand | Startprofil, eigene Pre-/Mid-/Post-Ansicht und fachlich begrenzte Pilotmessung | Individuell nur Nutzer; keine Rohantworten oder Einzelscores für Coaches | Solange das Konto besteht | Nur getrennt nach Instrument und freigegebenem Crosswalk; keine Kausalbehauptung |
| Transfer und Verständnis | strukturierte Auswahlantworten, Programmtag, Verständnis-/Richtigkeitsstatus | Anwendung und Verständnis des Tagesinhalts dokumentieren | Nutzer selbst; Auswertung nur nach gültiger Freigabe und geschützten Outputregeln | Solange das Konto besteht | Enger Core; kein Freitext und kein Gesamt-„Mental-Score“ |
| Journale und private Reflexionen | Journaltitel, strukturierte Antworten, Dankbarkeit und freie Reflexion | Ausschließlich private Wiederanzeige im eigenen Konto | Nur Nutzer selbst; niemals Coach, Jarvis oder Gruppenanalyse | Solange das Konto besteht; Löschung mit dem Konto | Vollständig ausgeschlossen; höchstens reine Abschlussanzahl ohne Inhalt |
| Kalender und Training | eigene oder teambezogene Trainings-, Wettkampf- und Ruhetage, Uhrzeiten, Zeitzone und Erinnerungsplanung | Tageskontext, Visualisierung, Planung und optionale Erinnerungen | Nutzer selbst; Teamtermine nach Teamrolle | Solange Konto beziehungsweise Teamzuordnung besteht | Nicht als Leistungsnachweis verwenden |
| Push und Erinnerungen | Push-Berechtigung, Browserabonnement oder APNs-/FCM-Gerätetoken, Erinnerungszeiten, Typ, Versand-, Öffnungs- und Fehlerzeitpunkt | Vom Nutzer aktivierte Zustellung und Fehlerbehebung | Nutzer selbst sowie technisch/administrativ eng begrenzte Zustellprüfung | Gerätetoken bis Deaktivierung oder Kontolöschung; Zustellprotokolle höchstens 90 Tage | Keine Push-zu-Check-in-Verhaltensanalyse im aktuellen Umfang |
| Coach-Sicht | letzte Aktivität, erledigte Tage, Abschlussquote, Serie, Check-in-/Journalanzahl und Inaktivitätshinweis | Operative Begleitung des Programms | Zugeordnete Coaches | Abgeleitet aus laufenden Produktdaten | Keine individuellen Zustandswerte, Assessmentwerte oder privaten Inhalte |
| Teamtendenzen | serverseitig aggregierte Zustands- und Aktivitätswerte | Teamüberblick und zeitliche Teamtendenz | Zugeordnete Coaches beziehungsweise eigene Teamansicht | Aus den zugrunde liegenden Produktdaten abgeleitet | Ausgabe erst ab mindestens fünf berechtigten Personen; Schwelle ist kein Wirksamkeitsbeweis |
| Coach-Beobachtungen | fünf strukturierte Bereiche zu direkt beobachtbarem Sportverhalten | Eigene strukturierte Coach-Dokumentation | Einzelbeobachtung nur für den eingebenden Coach; weitere Ausgaben nur nach ausdrücklich freigegebenem Vertrag | Solange der zugehörige Datensatz und berechtigte Zugriff bestehen | Derzeit aus Pilot-, Jarvis- und externen Auswertungen ausgeschlossen; V4 erforderlich |
| Feedback Intelligence | freiwillige Auswahlantworten an Tag 10, 24, 39 und 55; optionaler Produktfeedback-Kommentar nur mit zusätzlicher Freitextfreigabe | Interne Produktverbesserung und geschützte Gruppenzusammenfassung | Auswahlantworten nur über minimierte Gruppenoutputs; Kommentare nur menschliche Adminprüfung | Personenbeziehbare Kommentare/Ableitungen höchstens 365 Tage und früher bei Widerruf, Kontolöschung oder Zweckende | Getrennt vom Evidence-Core; Jarvis erhält keine Kommentare oder privaten Texte |
| Direktes Support-Feedback | Nachricht, Kategorie, Zeitpunkt sowie minimierte Plattform-, Versions-, Online- und Routenangaben | Fehler, Vorschläge und Support bearbeiten | Nutzer selbst und berechtigte Administratoren | Löschung mit Konto; eine kürzere automatische Regelfrist ist noch nicht eingerichtet | Nicht mit Feedback Intelligence mischen; kein Jarvis-Zugriff |
| Technische Fehlerereignisse | normalisierter Fehlercode, bereinigte Route, Plattform, App-Version, Zeitpunkt und Teststatus | Störungen erkennen und beheben | Eng begrenzte Admin-/Betriebsansicht | Höchstens 30 Tage | Keine normale Aktivitätsanalyse und keine privaten Inhalte |
| Team-/Organisationsanfragen | Name, E-Mail, Funktion und angegebene Organisations-/Projektinformationen; Telefonnummer nur optional | Anfrage beantworten und Zusammenarbeit vorbereiten | Berechtigte interne Bearbeitung und notwendige Dienstleister | Nicht weiterverfolgte Anfragen spätestens zwölf Monate nach Abschluss | Kein Athleten- oder Evidence-Datensatz |

## Aktuell ausdrücklich nicht aktiviert

- keine vollständige longitudinale Verbindung aller Quellen im neuen V1.4-Evidence-Modell;
- kein Production-Backfill historischer Spielerdaten in dieses Modell;
- keine Coach-Beobachtungen als personenbezogene Evidence-Quelle;
- keine Push-Empfang-zu-Check-in-Verhaltensanalyse;
- keine externen Match-, Veo-, Wearable- oder Fitnessdaten;
- keine Journal-, Reflexions- oder sonstige private Freitextanalyse;
- kein externer KI-Anbieter für Athleten- oder Produktfeedbackdaten;
- keine Rankings, Diagnosen, automatisierten Einzelentscheidungen oder Kausalclaims.

## Mit dieser Bereinigung korrigiert

1. Die öffentliche Erklärung nennt jetzt alle zehn tatsächlich erhobenen Check-in-Bereiche statt nur Stimmung, Energie und Fokus.
2. Kalender-/Trainingsdaten, Tagesabschlusszeiten, direkte Supportnachrichten und technische Fehlerdaten sind als vorhandene Datenwege sichtbar beschrieben.
3. Coach-Beobachtungen sind eindeutig aus aktueller Pilot-, Jarvis- und externer Auswertung ausgeschlossen.
4. Die frühere breitere Guardian-Formulierung wird transparent als nicht aktivierter Bereich erklärt; sie wird nicht als stillschweigende Freigabe verwendet.

## Noch offen, bevor V4 oder das neue Evidence-System aktiviert werden darf

- neue, getrennte V4-Entscheidungen für Coach-Evidence, Push-Verhaltensauswertung und externe Leistungsdaten;
- fachliche Crosswalk-Freigabe für Development Index, Assessments, Verständnis, Transfer und Daily State;
- kompakte DSFA und fokussierte externe Prüfung der Verantwortlichkeit, Art.-9-Einordnung und Minderjährigenlogik;
- finale Parität von Datenschutzerklärung, Consent-Screens, App Store Connect, Google Play und signiertem Binary;
- feste kürzere Löschfrist und technische Routine für direktes Support-Feedback;
- getrennte Staging-, Migration-, Aktivierungs- und Backfill-Freigaben.

## Prüfnachweis

- Source of Truth: aktuelles `origin/main` am 8. September 2026;
- Supabase Production wurde nur lesend geprüft; keine Inhalte privater Antworten wurden gelesen;
- keine Datenbankzeile, Einwilligung, Rolle, Migration, Edge Function oder Feature-Flag wurde verändert;
- die Änderungen dieses Branches betreffen ausschließlich transparente Copy, Dokumentation und zugehörige Tests.
