# App Store Connect V1.3 – Review-Vorbereitung

Stand: 28. August 2026  
Status: `PREPARED_NOT_SUBMITTED`  
Version: `1.3`  
Geplante Buildnummer: `17`, vor dem Archiv gegen App Store Connect verifizieren.

## Was ist neu in dieser Version

```text
Version 1.3 macht den 56-Tage-Weg klarer und den Teamstart einfacher:

• Science Bite, Mission und freiwillige Vertiefung sind über alle 56 Tage klar voneinander getrennt.
• Verpasste Programmtage bleiben übersichtlich auf die letzten drei relevanten Tage begrenzt.
• Coaches können Trainingseinheiten als wiederkehrende Acht-Wochen-Serie planen.
• Vor dem Programmstart ist direkt sichtbar, wer bereit ist und wem der Fragebogen noch fehlt.
• Bereits verwendete E-Mail-Adressen führen verständlich zu Anmeldung, Passwort-Reset oder einer anderen Adresse.
• Weitere Verbesserungen an Stabilität, Erinnerungen und Web-App-Nutzung.
```

Der Text darf beim Freeze nur übernommen werden, wenn alle genannten Punkte im
ausgewählten Build enthalten und physisch geprüft sind.

## App-Review-Notes – V1.3-Entwurf

```text
RewirePerform ist eine nicht-medizinische Mental-Performance- und Reflexions-App für Athletinnen und Athleten. Die App stellt keine Diagnose, bietet keine Behandlung und verspricht keine garantierte Wirkung. Für die Kernfunktionen ist eine Anmeldung erforderlich.

Die bereitgestellten Review-Konten enthalten ausschließlich synthetische Daten. Bitte verwenden Sie die im App-Store-Connect-Feld hinterlegten, nicht ablaufenden Zugangsdaten.

Empfohlener Prüfpfad:
1. Mit dem Athletenkonto anmelden und auf „Heute“ den aktuellen Programmtag öffnen.
2. Daily Flow prüfen: Science Bite erklärt den Mechanismus, die Mission enthält die heutige Handlung und „Genauer verstehen“ ist eine freiwillige, eigenständige Vertiefung.
3. Plan, Pre-Training und privates Journal öffnen. Texteingabe bleibt auch ohne Mikrofonfreigabe möglich.
4. Unter Einstellungen die Einführung, Benachrichtigungseinstellungen und „Konto & Daten“ öffnen. Die Account-Löschung ist dort direkt verfügbar.
5. Mit dem Coach-Konto anmelden. Vor Programmstart zeigt die Teamansicht ausschließlich Bereitschaft/fehlenden Fragebogen. Trainings können als Acht-Wochen-Serie wiederholt werden; Wettkämpfe werden nicht automatisch wiederholt.

Privacy-Grenzen:
- Coaches sehen Teilnahme- und Statusinformationen sowie freigegebene, ausreichend große Teamaggregate.
- Coaches sehen keine privaten Journaltexte, freien persönlichen Reflexionen, Rohantworten oder individuellen psychologischen Scores.
- Freiwillige Produktfeedback-Kommentare bleiben von strukturierten Auswertungen getrennt.
- Keine Daten werden für Werbung, Cross-App-Tracking, automatisierte Einzelentscheidungen oder Modelltraining verwendet.

Hinweise zu Version 1.3:
- Bei einer möglicherweise bereits verwendeten E-Mail zeigt die Registrierung aus Sicherheitsgründen einen neutralen Hinweis und bietet Anmeldung, Passwort-Reset oder Adressänderung an; sie bestätigt nicht, ob ein bestimmtes Konto existiert.
- Die Ansicht verpasster Tage lädt ausschließlich die letzten drei relevanten vorherigen Programmtage und lädt nach Bestätigung keine immer älteren Tage nach.
- Benachrichtigungen und Spracheingabe sind optional. Die App bleibt bei abgelehnten Berechtigungen nutzbar.

Es ist kein Kauf erforderlich. Die App verwendet Standard-HTTPS/TLS und deklariert keine nicht ausgenommene Verschlüsselung.
```

## Zugangsdaten und Kontakt

Die folgenden Werte ausschließlich direkt in App Store Connect eintragen und
nicht in Git dokumentieren:

- nicht ablaufendes synthetisches Athletenkonto;
- nicht ablaufendes synthetisches Coach-Konto in einem rein synthetischen Team;
- echte erreichbare Review-Kontaktperson;
- überwachte E-Mail-Adresse;
- erreichbare Telefonnummer im internationalen Format mit `+49`.

Ein Admin-Konto ist nur dann an Apple zu geben, wenn eine geschützte
Admin-Funktion für die Prüfung der öffentlich angebotenen App wirklich nötig
ist. Interne Jarvis-/Operationsflächen gehören nicht automatisch zum
Reviewer-Pfad.

## App-Privacy-Delta

Die bekannten V1.3-Produktänderungen erzeugen nach aktuellem Codeaudit keine
neue Apple-Datenkategorie:

- Kalender-Serien verwenden den bereits vorhandenen Trainings-/Teamkalender.
- E-Mail-Konflikt und Einladungskorrektur verwenden die bereits deklarierte
  E-Mail-Adresse und Auth-Funktionalität.
- 56-Tage-Texte und das feste Fenster für verpasste Tage verändern keine neue
  Datenart.
- Reminder-Härtung verändert Zustellung und Endpunktverwaltung, nicht den
  erklärten Zweck.

Vor Submit müssen die sichtbaren App-Store-Privacy-Antworten trotzdem gegen
den final signierten Build geprüft werden. Insbesondere bleiben Name, E-Mail,
User-ID, Health/Fitness, Other User Content, Customer Support, Product
Interaction und Other Diagnostic Data entsprechend der tatsächlichen Runtime
zu behandeln; Tracking bleibt nur dann `No`, wenn weiterhin kein Werbe-,
Cross-App- oder Datenbroker-Tracking existiert. Diese Datei ersetzt keine
rechtliche Endprüfung.

## Screenshots

- Apple übernimmt beim Anlegen einer neuen Version die bestehende
  Versionsmetadatenbasis. Ein komplett neuer Screenshot-Satz ist deshalb nicht
  automatisch nötig.
- Beim Freeze werden die vorhandenen iPhone- und iPad-Slots gegen den finalen
  Build verglichen.
- Nur Szenen mit sichtbarem Text-/UI-Drift werden in gleicher Größe,
  Gestaltung, Reihenfolge und ausschließlich mit synthetischen Daten ersetzt.
- Besonders prüfen: Daily Flow/Science Bite, Coach-Vorstartstatus und alle
  Szenen, deren sichtbarer Inhalt durch die 56-Tage-Trennung verändert wurde.
- Keine Browserleisten, Testdaten, echte E-Mails, Teamcodes, privaten Journale,
  Ladespinner oder Berechtigungsdialoge im finalen Material.

## Upload- und Submission-Wahrheit

- Ein zusätzlicher interner oder externer TestFlight-Rollout ist nicht
  zwingend, wenn Mahles finaler physischer Smoke grün ist.
- Der signierte Build muss trotzdem zu App Store Connect hochgeladen und von
  Apple verarbeitet werden, bevor er der Version 1.3 zugeordnet werden kann.
- Bis `Submit for Review` kann der ausgewählte Build gewechselt werden.
- Nach `Submit for Review` sind Screenshots nicht mehr frei austauschbar; daher
  Screenshot- und Metadaten-Freeze davor abschließen.
- Die Review-Dringlichkeit wird erst nach der eigentlichen Einreichung über
  Apples Expedited-Review-Anfrage oder den Developer-Support begründet; sie ist
  kein Ersatz für vollständige Metadaten oder einen prüfbaren Build.

## Montag: Final-Freeze in Reihenfolge

1. `origin/main` aktualisieren und alle Wochenendänderungen inventarisieren.
2. Prüfen, dass keine freigegebene V1.3-Arbeit nur außerhalb von Main liegt.
3. V1.3-Integrationskandidat auf den finalen Main-SHA setzen.
4. Version `1.3` und tatsächlich nächste freie iOS-Buildnummer setzen.
5. Frische Dependencies und vollständige CI auf dem Freeze-SHA ausführen.
6. Bestätigte Production-Umgebung laden, `app:build`, Capacitor Sync und
   Embedded-Target-Prüfung ausführen.
7. Xcode Signing, Archive und Privacy Report auf demselben SHA prüfen.
8. Physischer iPhone-Smoke: Login, Daily Flow, verpasste Tage, Coach-Vorstart,
   Kalender-Serie, Benachrichtigungsberechtigung, Account-Löschung und Links.
9. Öffentliche Privacy-, Support- und Marketing-URLs prüfen.
10. Screenshots gegen den Build vergleichen und nur nötige Slots ersetzen.
11. Version 1.3 in App Store Connect anlegen, Metadaten prüfen, Build hochladen,
    Verarbeitung abwarten und exakt diesen Build auswählen.
12. Export Compliance, Age Rating, App Privacy, Review-Kontakt und Review Notes
    sichtbar prüfen.
13. Erst dann `Add for Review` und `Submit for Review`.
14. Nach erfolgreicher Einreichung bei echtem Zeitdruck die beschleunigte
    Prüfung mit dem konkreten Mannschaftsstart und ohne Übertreibung beantragen.

## Offizielle Apple-Quellen

- https://developer.apple.com/help/app-store-connect/update-your-app/create-a-new-version
- https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds
- https://developer.apple.com/help/app-store-connect/manage-builds/choose-a-build-to-submit
- https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app
- https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information
- https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots

