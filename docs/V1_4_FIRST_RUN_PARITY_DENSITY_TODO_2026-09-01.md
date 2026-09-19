# V1.4 First-Run Parity & Density — offenes Handoff

Status: **OPEN / NICHT IMPLEMENTIERT**
Scope dieses Dokuments: Produkt- und QA-Vertrag für einen späteren, eigenen UI-Block. Dieses Dokument behauptet weder fertige Screens noch eine Freigabe für Merge, Deploy, TestFlight oder Store.

## Warum ein eigener Parity-Pass nötig ist

Die produktiven Coach- und Athletenoberflächen wurden nach den aktuellen First-Run-Szenen weiterentwickelt. Beide Vorstellungsflows besitzen derzeit je zehn Szenen und erklären einzelne Bereiche mehrfach. Der nächste Pass soll deshalb nicht den Inhalt neu erfinden, sondern die sichtbare Textlast reduzieren und die Vorschau wieder an die echte App-Semantik binden.

## Festes Ziel

- höchstens **7 Szenen pro Rolle**;
- eine Hauptaussage und eine klar erkennbare Produktoberfläche pro Szene;
- keine neue Produktlogik, keine neuen Privacy- oder Wirkungsclaims;
- vorhandene Rollen-, Team-, Consent- und Datenschutzgrenzen bleiben unverändert;
- alle Beispielnamen, Beispieltermine, Prozentwerte, Teamgrößen und Verläufe sind im jeweiligen Screen sichtbar als **Beispielansicht** oder **Beispielwerte** gekennzeichnet.

## Coach-Parität

Die Vorschau muss die aktuelle Navigation `Übersicht · Zustand · Entwicklung · Toolkit · Team` und diese aktuellen Teilnahmebegriffe verwenden:

- `Check-ins heute`;
- `7-Tage-Rhythmus`;
- pro Athlet `Heute erledigt` oder `Heute offen`;
- `Letzte 7 Programmtage: x/y Check-ins`;
- Aktion `Offene Check-ins erinnern` mit der bestehenden freundlichen Reminder-Vorschau.

Die Entwicklungsszene muss den aktuellen Eligibility-Vertrag korrekt zeigen:

- `Team` bleibt gesperrt, solange `teamEligible = false`;
- `Einzel` bleibt für Athleten mit `observationAvailable = true` nutzbar;
- keine Aussage darf suggerieren, der Coach sehe Journaltexte, Freitext, Einzel-Check-in-Antworten oder individuelle psychologische Scores.

Empfohlene Verdichtung auf maximal sieben Coach-Szenen:

1. Übersicht mit `Heute` und `7-Tage-Rhythmus`;
2. aggregierter Zustand ab Mindestgruppe;
3. heutige Teilnahme plus freundlicher Reminder;
4. heutiger Athletenfokus und praktische Coach-Linie;
5. Entwicklung mit klar getrenntem Team-/Einzel-Eligibility-Zustand;
6. Team, Einladungen, Kalender und Programmstart;
7. Privacy-Grenze plus nächster echter Einstieg.

## Athleten-Parität

Der produktive Daily Flow für Training/Wettkampf besteht aktuell aus genau vier Stufen:

1. `Science Bite`;
2. `Dein Tages-Puls`;
3. `Deine Mission`;
4. `Verständnis-Check`.

`Pre-Training` und `Tagesjournal` sind eigenständige heutige Oberflächen außerhalb dieses Vier-Stufen-Flows. Die First-Run-Erzählung darf sie nicht als zusätzliche Daily-Flow-Schritte zählen.

Die verdichtete Vorschau muss aktuelle echte Szenen zeigen:

- Science Bite in der ruhigen fokussierten Flow-Fläche;
- Mission als eine zusammenhängende konkrete Handlung;
- Pre-Training mit heutigem Fokus vor der Einheit;
- Journal als private Reflexion nach dem Tag;
- Entwicklung als Verlauf der eigenen Wiederholungen, nicht als Personenbewertung.

Empfohlene Verdichtung auf maximal sieben Athleten-Szenen:

1. Heute-Dashboard mit den tatsächlich anstehenden Elementen;
2. Science Bite plus Tages-Puls als Einstieg in den Vier-Stufen-Flow;
3. Mission plus Verständnis-Check als Abschluss desselben Flows;
4. Pre-Training;
5. privates Tagesjournal;
6. Entwicklung und Messfenster ohne Wirkungsübertreibung;
7. Solo-/Team-Einstieg und nächster echter Schritt.

## Mobile-Abnahme

Pflichtgrößen:

- `390 × 844` als primäre aktuelle Mobile-Ansicht;
- `320 × 568` als enger Belastungstest.

Für jede Szene prüfen:

- kein horizontaler Overflow;
- Hauptüberschrift, Visual und primäre Aktion ohne verdeckte Inhalte erreichbar;
- Footer/Weiter-/Zurück-Aktionen bleiben bedienbar;
- keine sichtbare Textwand und keine abgeschnittenen Labels;
- Touch-Ziele mindestens 44 px;
- Reduced Motion behält die vollständige Orientierung;
- Beispielwerte sind auch auf 320 px eindeutig als Beispiel markiert.

## Nicht Teil dieses offenen Blocks

- keine Änderung an Registrierung, Auth, Teambeitritt, Consent oder Fragebogen;
- keine Änderung an Coach-Datenzugriff oder Evidence-Berechnung;
- keine neue Mess-, Tracking- oder Push-Funktion;
- keine Store-Screenshots oder Store-Texte, bevor die reale First-Run-Parität implementiert und mobil geprüft ist.
