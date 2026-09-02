# RewirePerform 1.4 (20) – TestFlight-Testplan

Status: `SIGNED_IPA_BUILT__TESTFLIGHT_UPLOAD_PENDING`

## Ziel

Dieser Plan prüft den signierten iOS-Kandidaten 1.4 (20) vor einer getrennten App-Review-Freigabe. Ein erfolgreicher Build oder Upload allein gilt nicht als bestandener Gerätetest.

## Pflichtlauf auf einem echten iPhone

1. Version 1.4 (20) aus TestFlight installieren und die App kalt starten.
2. Mit einem freigegebenen Athletenkonto anmelden und Dashboard, Tagesinhalt, Check-in, Mission und Verständnis-Check kurz öffnen.
3. Im Tagesjournal alle aktiven Fragen beantworten.
4. In der Dankbarkeit genau sieben Wörter eingeben. Der untere, noch deaktivierte Button muss deutlich `7 von 8 Wörtern` anzeigen.
5. Das achte Wort ergänzen. Der Button muss auf `Tag abschließen` wechseln und bedienbar werden.
6. Journal speichern, `Frühere Einträge` öffnen und den gerade gespeicherten Eintrag aufklappen.
7. Über jeder Antwort muss die wirkliche damalige Frage stehen; `Reflexion 1`, `Reflexion 2` oder `Reflexion 3` darf nicht mehr erscheinen.
8. Wenn vorhanden, je einen Trainingstag-, Ruhetag- und Wettkampftag-Eintrag prüfen. Die Frage muss zum jeweiligen Kontext passen.
9. App vollständig schließen, erneut öffnen und prüfen, dass der gespeicherte Eintrag weiterhin korrekt angezeigt wird.

## Kurzer Regressionslauf

- Pre-Training öffnet nur im vorgesehenen Zeitfenster und schließt zum geplanten Start.
- Lokaler Programmtag und Tageswechsel stimmen auf dem Gerät.
- Push-Berechtigung und ein realer APNs-Empfang funktionieren; Provider-Annahme allein reicht nicht.
- Coach-Webansicht lädt Teilnahme und Entwicklung nach Fokuswechsel erneut, ohne private Journalinhalte zu zeigen.
- Minderjährigen-/Guardian-Sperren und freiwilliger Datenbeitrag bleiben voneinander getrennt.
- Einstellungen nennen intern pseudonymisierte strukturierte Daten; die Datenschutzerklärung nennt die früheste Löschung beziehungsweise spätestens 365 Tage für personenbezogene Evidence-Daten.

## Erwartete Grenze des Builds

Der V1.4-Evidence-Core ist im Quellstand vorbereitet und fail-closed. Dieser TestFlight-Build aktiviert keine neue Production-Migration, keinen echten Evidence-Backfill und keine reale Jarvis-/Coach-Auswertung. Journaltexte und Freitexte bleiben vollständig ausgeschlossen.

## Vor App Review noch erforderlich

- Mahles dokumentiertes Ergebnis des Pflichtlaufs auf einem echten iPhone;
- App Store Connect Privacy-Angaben gegen `PrivacyInfo.xcprivacy` prüfen;
- entscheiden, ob die noch offene First-Run-Parity-Überarbeitung vor 1.4 gebaut oder ausdrücklich auf später verschoben wird;
- für eine spätere reale Evidence-Aktivierung: externe qualifizierte Rechtsprüfung, kompakte DSFA, Quellen-Mappings und getrennte Production-/Backfill-Freigaben;
- abschließende, separate Bestätigung unmittelbar vor `Zur Überprüfung einreichen`.
