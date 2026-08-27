# V1.3 – Acht-Wochen-Trainingsserie im Teamkalender

Status: gemeinsamer Web-Code für die kontrollierte Aufnahme in App-Version 1.3.

## Produktvertrag

- Eine vom Coach ausgewählte Kalenderwoche ist das Trainingsmuster.
- Ausschließlich Einträge vom Typ `training` werden anhand ihres Wochentags wiederholt.
- Der Plan umfasst acht Wochen. Solange kein Programmstart festgelegt ist, beginnt er frühestens am aktuellen Tag beziehungsweise am Montag einer zukünftig ausgewählten Musterwoche.
- Noch freie Tage innerhalb des Zeitraums werden als `rest` geplant.
- Wettkämpfe werden nie aus der Musterwoche kopiert.
- Bereits vorhandene Trainings, Ruhetage und Wettkämpfe werden weder überschrieben noch gelöscht.
- Der Coach sieht Zeitraum und Änderungsumfang vor der Übernahme und muss den vorbereiteten Kalender anschließend ausdrücklich speichern.
- Jeder einzelne Tag bleibt danach im bestehenden Kalender als Training, Wettkampf oder Ruhetag änderbar.

## Release-Grenze

Die Funktion liegt im gemeinsamen React-/Web-Code. Ein Web-Deploy verändert keine bereits verteilte native Version 1.2. Der nächste native Build aus diesem Main-Stand nimmt sie kontrolliert als Bestandteil von Version 1.3 auf.
