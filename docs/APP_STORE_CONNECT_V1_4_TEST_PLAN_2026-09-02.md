# RewirePerform 1.4 – TestFlight-Testplan

Status: `TESTFLIGHT_GREEN__APP_REVIEW_SUBMITTED`

## Ziel

Dieser Plan prüft den nächsten signierten iOS-Kandidaten 1.4 vor einer getrennten App-Review-Freigabe. Ein erfolgreicher Build oder Upload allein gilt nicht als bestandener Gerätetest.

## Pflichtlauf auf einem echten iPhone

1. Die neue Version 1.4 aus TestFlight installieren und die App kalt starten.
2. Mit einem freigegebenen Athletenkonto anmelden und Dashboard, Tagesinhalt, Check-in, Mission und Verständnis-Check kurz öffnen.
3. Im Tagesjournal alle aktiven Fragen beantworten.
4. In der Dankbarkeit genau sieben Wörter eingeben. Der untere, noch deaktivierte Button muss deutlich `7 von 8 Wörtern` anzeigen.
5. Das achte Wort ergänzen. Der Button muss auf `Tag abschließen` wechseln und bedienbar werden.
6. Journal speichern, `Frühere Einträge` öffnen und den gerade gespeicherten Eintrag aufklappen.
7. Über jeder Antwort muss die wirkliche damalige Frage stehen; `Reflexion 1`, `Reflexion 2` oder `Reflexion 3` darf nicht mehr erscheinen.
8. Wenn vorhanden, je einen Trainingstag-, Ruhetag- und Wettkampftag-Eintrag prüfen. Die Frage muss zum jeweiligen Kontext passen.
9. App vollständig schließen, erneut öffnen und prüfen, dass der gespeicherte Eintrag weiterhin korrekt angezeigt wird.
10. An einem Ruhetag die Visualisierung starten und auf `Für später planen` tippen. Es darf nichts abgeschlossen werden; stattdessen muss die Zeit-Auswahl erscheinen.
11. Eine künftige Uhrzeit wählen, `Erinnerung setzen` drücken und die Rückkehr zum Dashboard bestätigen. Zum gewählten Zeitpunkt muss die Erinnerung wieder in die Visualisierung führen.

## Kurzer Regressionslauf

- Pre-Training öffnet nur im vorgesehenen Zeitfenster und schließt zum geplanten Start.
- Lokaler Programmtag und Tageswechsel stimmen auf dem Gerät.
- Push-Berechtigung und ein realer APNs-Empfang funktionieren; Provider-Annahme allein reicht nicht.
- Coach-Webansicht lädt Teilnahme und Entwicklung nach Fokuswechsel erneut, ohne private Journalinhalte zu zeigen.
- Minderjährigen-/Guardian-Sperren und freiwilliger Datenbeitrag bleiben voneinander getrennt.
- Einstellungen nennen intern pseudonymisierte strukturierte Daten; die Datenschutzerklärung nennt die früheste Löschung beziehungsweise spätestens 365 Tage für personenbezogene Evidence-Daten.

## Erwartete Grenze des Builds

Der V1.4-Evidence-Core ist im Quellstand vorbereitet und fail-closed. Dieser TestFlight-Build aktiviert keine neue Production-Migration, keinen echten Evidence-Backfill und keine reale Jarvis-/Coach-Auswertung. Journaltexte und Freitexte bleiben vollständig ausgeschlossen.

## Ergebnis für 1.4

- Der Pflichtlauf auf dem echten iPhone ist vollständig grün bestätigt.
- Build `1.4 (21)` wurde TestFlight bereitgestellt und am 3. September 2026 zur App-Prüfung eingereicht.
- Die App-Store-Datenschutzangaben wurden gegen `PrivacyInfo.xcprivacy` abgeglichen. Dieser Build fügt keine neue Datenkategorie und kein neues app-übergreifendes Tracking hinzu; eine Änderung der Store-Angaben war daher nicht erforderlich.
- Die noch offene First-Run-Parity-Überarbeitung ist nicht Teil von Build 21 und wird nicht als gelieferte 1.4-Funktion behauptet.

## Weiterhin getrennt und nicht mit 1.4 aktiviert

- Für eine spätere reale Evidence-Aktivierung bleiben externe qualifizierte Rechtsprüfung, kompakte DSFA, Quellen-Mappings und getrennte Production-/Backfill-Freigaben erforderlich.
