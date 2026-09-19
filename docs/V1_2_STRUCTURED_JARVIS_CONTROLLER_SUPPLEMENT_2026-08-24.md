# V1.2 Structured-only Jarvis – Controller-Ergänzung

Stand: 24. August 2026
Ergänzt, aber verändert nicht rückwirkend:
`controller-assessment-de-feedback-v1.2:mahle-herzog-final-2026-08-21`

## Entscheidung

Der Verantwortliche entscheidet für V1.2, dass das intern und lokal betriebene
Jarvis-System ausschließlich freiwillige strukturierte Auswahlantworten aus den
Feedback-Checkpoints und dafür minimierte Aktivitätszählungen verarbeiten darf.
Zweck ist allein eine beschreibende, gruppierte Zusammenfassung zur internen
Produktverbesserung.

Die am 21. August festgelegte Freitextgrenze bleibt unverändert: freiwillig und
ausdrücklich freigegebene Produktfeedback-Kommentare bleiben ausschließlich in
der geschützten menschlichen Admin-Ansicht. Jarvis erhält sie nicht.

## Verbindliche Daten- und Ergebnisgrenzen

- Jarvis erhält keine Kommentare oder sonstigen Freitexte.
- Ausgeschlossen bleiben Namen, E-Mail-Adressen, direkte Nutzerkennungen,
  Team-/Coach-IDs, Journale, private Reflexionen, Supporttexte, Coach-Notizen,
  einzelne psychologische Profile und Rohwerte aus privaten Check-ins.
- Der Transport darf pseudonyme Paketreferenzen enthalten, damit Antworten
  derselben Person innerhalb eines einzelnen Pakets korrekt gezählt werden.
  Diese Referenzen werden nur im Arbeitsspeicher verarbeitet, nicht in der
  Zusammenfassung ausgegeben und nicht dauerhaft gespeichert.
- Jarvis darf nur beschreibende Gruppenzusammenfassungen pro Frage bzw.
  ausgegebener Gruppe mit mindestens fünf unterschiedlichen freigegebenen
  Teilnehmenden erzeugen. Kleinere Gruppen bleiben vollständig unterdrückt.
- Es gibt keine automatisierte Entscheidung, Bewertung oder Maßnahme über
  einzelne Athleten und keine kausale Wirksamkeitsaussage.
- Die Daten werden nicht zum Training oder Fine-Tuning eines KI-Modells genutzt.
- Kein externer KI-Anbieter und kein Werbe-, Profiling- oder Trackingdienst
  erhält diese Produktfeedbackdaten.

## Einwilligung und Minderjährige

Der strukturierte Jarvis-Pfad darf nur Daten verwenden, die bereits für die
freiwillige interne Pilot-/Produktverbesserung freigegeben sind. Beim Export
müssen die aktuelle Datenbeitragsversion und die run-spezifische
Teilnahmeberechtigung erneut geprüft werden. Für Minderjährige gilt zusätzlich
der aktive altersgerechte Pfad; unter 16 müssen Guardian- und
Athletenautorisierung aktuell und passend sein, ab 16 die aktuelle eigene
Autorisierung. Fehlende, veraltete oder widerrufene Freigaben schließen die
betroffene Person fail-closed aus.

Diese Ergänzung ändert weder den separaten Kommentar-Consent noch dessen
Guardian-Notice-Hash. Eine spätere Jarvis-Freitextanalyse, ein externer
KI-Anbieter oder eine individuelle Athletenanalyse wären ein neuer Datenweg und
benötigten eine neue Entscheidung und Information.

## Aktivierungsgrenze

Diese Verantwortlichenentscheidung allein öffnet keinen Production-Zugang.
Vor einem echten Read müssen gleichzeitig belegt sein:

1. ein eigener byte-gepinnter structured-only Producer-/Consumer-Vertrag;
2. technisch unmöglicher Kommentartransport bis zum Jarvis-Consumer;
3. erneute Consent-/Guardian-/Widerrufsprüfung beim Export;
4. `n >= 5` pro ausgegebener Frage/Gruppe sowie keine Persistenz pseudonymer
   Referenzen;
5. ein Reader mit genau einem erlaubten Feedback-RPC und ohne Tabellen-,
   `public`- oder `net`-Funktionszugriff;
6. eine mit dem realen Datenweg übereinstimmende Datenschutzerklärung und
   App-Store-Deklaration;
7. separat kontrollierte Credentials, Runtime-Gates und ein exakt einmaliger
   positiver Production-Smoke.

Diese Datei dokumentiert eine Produkt- und Verantwortlichenentscheidung. Sie
ist keine externe Rechtsberatung, behördliche Bestätigung oder pauschale
Freigabe anderer Datenwege.
