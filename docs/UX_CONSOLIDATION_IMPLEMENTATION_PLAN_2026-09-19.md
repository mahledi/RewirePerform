# UX Consolidation – technischer Umsetzungsplan

Status: `APPROVED_FOR_IMPLEMENTATION`

## Ziel

Mehrere zusammengehörige UX-Arbeiten werden in einem Integrationsblock gebaut,
aber als getrennte Teilprodukte geprüft. Englisch, Store-Texte, Store-Upload
und die Aktivierung des longitudinalen Evidence-Systems gehören nicht in
diesen Block.

## Teilblöcke

### U1 – Journal

- Die aktive Journalfrage ist die einzige inhaltliche Hauptfläche des Screens.
- Eine Frage pro Schritt, großes Textfeld, optionales Einsprechen direkt an der
  Eingabe, dezenter Fortschritt und klare Weiter-/Speichern-Aktion.
- Tageskontext, frühere Einträge und zusätzliche Erklärung werden aus dem
  Schreibmoment entfernt beziehungsweise stark nachgeordnet.
- Dankbarkeit und optionale freie Reflexion behalten ihre heutige Speicherung,
  Validierung und Wortgrenze.

Eigene Prüfung: Pflichtantwort, Vor/Zurück, Entwurf/Wiederaufnahme, Voice,
Dankbarkeitsgrenze, Offline-/Save-Fehler und Abschluss.

### U2 – Feedback-Einstieg

- Einladung auf eine kurze Überschrift, einen Nutzensatz, die verlässliche
  Dauer und eine primäre Startaktion reduzieren.
- Freiwilligkeit, Privacy und spätes Nachholen bleiben erhalten, werden aber
  visuell nachgeordnet.
- Später erinnern und Nichtteilnahme bleiben funktional unverändert.

Eigene Prüfung: regulär, verspätet, Start, später, nicht teilnehmen, Rückkehr in
laufenden Bogen und Mobile-Textfit.

### U3 – kurzer Website-Systemflug

- Athleten-Schritt 4 zeigt das Journal statt „Entwicklung erkennen“.
- Navigation wird leichter und klarer; Inhalt und Produktbild tragen die
  Aufmerksamkeit.
- Teamzustand beschreibt Beobachtung, nicht vermeintliche Empfehlung.
- Wiederholungen mit dem ausführlichen Website-Teil werden sprachlich und
  visuell konsistent gehalten.

Eigene Prüfung: alle vier Athleten- und Teamzustände, Tastatur, Reduced Motion,
390 × 844 und Desktop.

### U4 – detaillierter Athletenflug

- Auf maximal sieben Szenen verdichten.
- Aktuelle echte Produktlogik zeigen: Heute, Daily Flow, Mission/Check,
  Pre-Training-Abruf, Ruhetag-Visualisierung, cleanes Journal, eigener Verlauf
  und Einstieg in sinnvoll zusammengefassten Szenen.
- Veraltete oder überladene Journal-/Entwicklungsbilder ersetzen.

Eigene Prüfung: Vor/Zurück, Szenenreihenfolge, Kamera-Fit, Abschluss,
390 × 844, 320 × 568 und Desktop.

### U5 – Athletenverlauf und historischer Teampuls

- Abgleichsergebnis: Der vorhandene V1.5-Block ist bereits vollständig im
  aktuellen `main` enthalten; der ursprüngliche Commit ergibt dort ein leeres
  Cherry-pick. Deshalb keine zweite Integration und kein doppeltes Diff.
- Athlet: eigener Check-in-Verlauf und Veränderung zum vorherigen Check-in.
- Athlet: anonymes „Gemeinsam dran“ ohne Namen, Rangliste oder Einzelwerte.
- Coach: aktueller und historischer Teampuls; frühere Wochen aufklappbar.
- Mindestgruppe `n >= 5` und private Daten bleiben unverändert geschützt.

Eigene Prüfung: Unit-Tests der Gruppierung/Veränderung, leere/gesperrte Daten,
Athlet-/Coach-Rendering und bestehende Privacy-Tests. Repository-Migrationen und
Function-Code werden integriert; ein Production-Apply oder Function-Deploy ist
nicht Bestandteil dieses UI-/Main-Blocks.

## Gemeinsame Integration

1. Neuer Branch vom aktuellen `origin/main`.
2. U5-Commit übernehmen und Konflikte gegen Main fachlich auflösen.
3. U1 bis U4 mit kleinen, nachvollziehbaren Diffs implementieren.
4. Pro Teilblock gezielte Tests ausführen und bei Fehlern den jeweiligen Block
   isoliert korrigieren.
5. Danach vollständige Typprüfung, gesamten Testlauf, Production-Build,
   `git diff --check` sowie Desktop-/Mobile-Smokes ausführen.
6. Erst wenn alles grün ist: Commit, Push, Pull Request, CI abwarten und in
   `main` mergen. Automatisches Website-Deployment anschließend getrennt als
   Provider- und Live-Status prüfen.

## Nicht in diesem Block

- vollständige englische Solo-App;
- Solo-Learning-Feedback und neue Datenerhebung;
- Tracking-/Evidence-Production-Aktivierung oder Backfill;
- Auth-, Consent-, RLS- oder Account-Löschänderungen;
- TestFlight, App Store Connect oder Apple Review.
