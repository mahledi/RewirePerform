# V1.4 – offene Umsetzungspunkte

Status: `MIXED`. Coach-Status und Coach-Reminder sind technisch produktiv bereitgestellt; das neue longitudinale Evidence-System bleibt `PREPARATION_ONLY` und verarbeitet weiterhin keine realen Pilotdaten.

Der Prozent-/Nenner-Fix für die Coach-Aktivitätsanzeige gehört **nicht** in diese Liste: Er ist als Backend-Korrektur auf `origin/main` und in Production aktiv. Für Programmtag 1 gilt teamweit `1/1 = 100 %` bei abgeschlossenem Check-in beziehungsweise `0/1 = 0 %` ohne Abschluss.

## 1. Team-Beobachtung von Evidence-Freigaben trennen

- Die operative Team-Beobachtung eines Coaches muss unabhängig davon nutzbar sein, ob bereits alle Athletinnen und Athleten für eine spätere gemeinsame Evidence-Auswertung freigegeben sind.
- Coach-Beobachtungen bleiben eine getrennte Datenklasse. Andere Coaches und Athleten dürfen persönliche Coach-Notizen nicht lesen.
- Jarvis, Exporte und gemeinsame Evidence-Auswertungen erhalten ausschließlich die freigegebene, aggregierte Projektion; weiterhin ohne private Athleteninhalte und mit `n >= 5`.
- Individuelle Zustimmungs-, Guardian- oder Ablehnungsdetails dürfen nicht unnötig an den Coach-Client ausgeliefert werden.
- Vor Umsetzung sind Speicherung, RLS, Rollen, Widerruf, Aufbewahrung, Exportgrenzen und Tests verbindlich festzulegen.

Abnahme: Der Coach kann die Team-Ebene verwenden, während Evidence/Jarvis separat und korrekt gesperrt bleibt.

## 2. Coach-Dashboard zuverlässig aktualisieren – technisch erledigt

- Aktivitätsdaten werden beim erneuten Sichtbarwerden, beim Fokuswechsel, manuell und alle 60 Sekunden ausschließlich über das leichte Status-RPC aktualisiert.
- Bestehende Spielerzeilen und Zähler bleiben während Requests und bei Timeouts sichtbar; es gibt keinen Vollreload und keine Mental-State-Abfrage.
- Gleichzeitig laufende Refreshes werden zusammengeführt, nach zwölf Sekunden abgebrochen und als nicht blockierende Teilwarnung dargestellt.
- Ein sichtbarer Stand-Zeitpunkt und ein manueller Hintergrund-Refresh sind vorhanden.
- Heute und der gemeinsame Sieben-Tage-Zeitraum sind getrennt. Die Coach-Erinnerung ist fest formuliert, auf einmal täglich begrenzt und enthält keine privaten Inhalte.
- Production-Schema und Edge Function wurden am 1. September 2026 kontrolliert aktiviert. Website-Sichtbarkeit folgt dem freigegebenen Main-Deploy.

Verbleibende Abnahme: physischer Coach-Web-Smoke nach Main-Deploy und je ein realer APNs-/Web-Push-Versand. FCM bleibt ohne Android-Token und Production-Service-Account nicht physisch bewiesen.

## 3. Block 9 – Evidence-Aktivierung

Die technischen Block-9-Verträge, Aktivierungssperren, Widerrufs-/Löschpfade, Retention-Dry-Run und Quellen-Mapping-Gates sind lokal gebaut. Offen sind nicht mehr die technischen Guardrails, sondern deren tatsächliche fachliche/rechtliche Freigabe und die noch nicht genehmigten Quellen-Crosswalks.

Erst danach dürfen Production-Migration, Protokollaktivierung und ein separat geprüfter Backfill realer Pilotantworten erfolgen. Die vollständige Aktivierungsgrenze steht in `ACTIVATION_BOUNDARY.md`.

Abnahme: Rechtliche und produktseitige Freigaben sind belegt; Migration und Backfill besitzen getrennte Dry-Run-, Reconciliation-, Rollback- und Audit-Nachweise.

## 4. Offizielles Pilotfenster aktivieren

- Den in `PILOT_DATA_BOUNDARY.md` dokumentierten Baseline- und Aktivitäts-Cut fachlich bestätigen.
- Production-Migration zuerst ohne Fensterdaten anwenden und Security Advisors prüfen.
- Das konkrete Fenster erst nach separater Freigabe als `approved` eintragen.
- Reconciliation muss 28 vollständige Onboarding-Baselines erhalten, unvollständige Entwürfe, vier vorgezogene Pre-Assessments und historische Snapshots ausschließen.
- Erst danach darf ein separater, idempotenter Backfill der pseudonymisierten erlaubten Werte freigegeben werden.

Abnahme: Gleicher Dry-Run vor und nach Aktivierung, keine PII/Freitexte im Ergebnis, keine Veränderung an Konten, Teamzuordnung, Consent oder Guardian-Freigaben.

## 5. Tracking-System finalisieren – verbindliche Reihenfolge

1. Fachliche Quellen-Crosswalks für alle tatsächlich genutzten Quellen abnehmen; unbekannte oder nur hypothetische Verbindungen bleiben gesperrt.
2. Rechtsgrundlage, bestehende Einwilligung, Minderjährigen-/Guardian-Vertrag, Widerruf, Löschung, Aufbewahrung, DPIA-Schwelle sowie Privacy-/Store-Texte nachweisbar freigeben.
3. Die drei Evidence-Migrationen getrennt und ohne Protokollaktivierung anwenden; danach Security Advisors und Grant-/RLS-Smoke prüfen.
4. Für den TSV-U17-Lauf das Baseline-Fenster und das Aktivitätsfenster separat genehmigen. Baseline sind die vollständigen offiziellen Onboarding-Fragebögen vom 27.–31. August; In-Programm-Aktivität beginnt am 1. September 2026. Frühere Test-Pre-Assessments und historische Progress-Snapshots bleiben ausgeschlossen.
5. Reconciliation ohne Namen, E-Mails, Antworten oder Freitext ausführen und die erwarteten Ein-/Ausschlüsse festhalten.
6. Erst danach das Protokoll aktivieren und den idempotenten pseudonymisierten Backfill separat freigeben und prüfen.
7. Reale Athleten-, Coach-, interne Admin- und Jarvis-Oberflächen erst nach erfolgreichem Backfill an die jeweils zulässige Projektion anbinden.
8. Während des Piloten Missingness, Instrumentversionen, Abbrüche und Datenqualität beobachten; keine Kausal- oder Wirksamkeitsbehauptung aus Nutzung oder Korrelation ableiten.

Wichtig: Der Grenzvertrag ist gebaut, aber noch nicht aktiv. Bis zu seiner getrennten Freigabe nutzt das neue V1.4-Evidence-System keine realen Pilotdaten. Nach Aktivierung zählt nicht pauschal „alles ab dem 1. September“: Die legitime Baseline vom 27.–31. August bleibt erhalten, während In-Programm-Daten vor dem 1. September und alle Test-/QA-Daten ausgeschlossen bleiben.

## 6. Push-Bereitschaft und tägliche Teilnahme verbinden – eigener Folgeschritt

Die heutige operative Schnittmenge aus registriertem Push-Kanal und abgeschlossenem Check-in soll als eigene, pseudonymisierte und ausschließlich deskriptive Tracking-Stufe integriert werden. Sie ist nicht Teil der aktuellen Evidence-Aktivierung und wird nicht rückwirkend aus unvollständigen historischen Signalen rekonstruiert.

Verbindlich zu trennen sind:

1. ein zum jeweiligen Zeitpunkt registrierter Push-Kanal,
2. eine tatsächlich ausgelöste Erinnerung,
3. die Annahme durch APNs, FCM oder Web Push,
4. ein erfasstes Öffnungsereignis,
5. Beginn und Abschluss des zugehörigen Check-ins.

Ein registrierter Token beweist weder Betriebssystem-Berechtigung noch Anzeige auf dem Sperrbildschirm. Provider-Annahme beweist keine Wahrnehmung. Ein zeitlich folgender Check-in beweist keine kausale Wirkung der Erinnerung. Ausbleibende Nutzung darf nicht als Motivation, mentale Qualität oder Widerstand interpretiert werden.

Die spätere Auswertung darf nur identifierfrei beziehungsweise pseudonymisiert und für Coach-/Organisationsansichten ausschließlich aggregiert mit `n >= 5` erfolgen. Erforderlich sind zeitgebundene Kanal-Snapshots ab Aktivierung, klare Event- und Copy-Versionen, Instrument-/Plattformtrennung, Missingness, Consent-/Widerrufs-/Löschpfade und ein Vergleich über mehrere Tage. Die Momentaufnahme vom 1. September 2026 dient nur als operativer Plausibilitätsbeleg, nicht als Baseline oder Wirksamkeitsnachweis.

Abnahme: Für ein freigegebenes Programmfenster lässt sich ohne Namen, E-Mails oder private Inhalte nachvollziehen, wie viele Athleten erreichbar, adressiert, vom Provider akzeptiert, geöffnet und anschließend im Check-in aktiv waren. Jede dargestellte Differenz bleibt als deskriptive Assoziation gekennzeichnet; Kausalclaims sind technisch und redaktionell ausgeschlossen.
