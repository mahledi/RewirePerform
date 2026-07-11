# UI- und UX-Regeln

- `RP-UX-01 | CONFIRMED_FROM_CHAT` Die App wirkt ruhig, hochwertig, professionell und vertrauenswuerdig.
- `RP-UX-02 | CONFIRMED_FROM_CHAT` Keine billige, generische oder sichtbar KI-generierte Gestaltung.
- `RP-UX-03 | CONFIRMED_FROM_BOTH` Mobile und iPhone/Homescreen sind primaere Nutzungskontexte.
- `RP-UX-04 | CONFIRMED_FROM_CHAT` Nach Navigation oder `Weiter` beginnt der neue Abschnitt sofort und unsichtbar oben, ohne Scrollanimation oder Wartegefuehl.
- `RP-UX-05 | CONFIRMED_FROM_CHAT` Buttons geben beim Druecken sofort visuelles Feedback; lange Saves zeigen einen ruhigen Ladezustand.
- `RP-UX-06 | CONFIRMED_FROM_CHAT` Pflichtangaben blockieren den naechsten Schritt direkt, statt erst am Abschluss Fehler zu melden.
- `RP-UX-07 | CONFIRMED_FROM_CHAT` Voice Input ist optional; Tippen bleibt immer moeglich. Transkript muss beim Stoppen erhalten bleiben.
- `RP-UX-08 | CONFIRMED_FROM_CHAT` Ein Mikrofon-Button reicht als Hinweis; wiederholte Einsprech-Tipps an jedem Textfeld wirken unruhig und unprofessionell.
- `RP-UX-09 | CONFIRMED_FROM_CHAT` Coach-Zahlen muessen direkt erfassbar sein; dekorative oder analyseintensive Graphen sind im Teamzustand unerwuenscht.
- `RP-UX-10 | CONFIRMED_FROM_CHAT` Keine bedeutungsleere `Team-Bereitschaft`-Gesamtzahl.
- `RP-UX-11 | CONFIRMED_FROM_CHAT` Coach-Texte beschreiben neutrale Beobachtungen und geben keine `du solltest`-Anweisungen.
- `RP-UX-12 | CONFIRMED_FROM_CHAT` FAQ startet kompakt und wird bewusst aufgeklappt.
- `RP-UX-13 | CONFIRMED_FROM_CHAT` Landingpage zeigt schon im ersten Viewport einen sichtbaren Beginn des naechsten Inhalts, ohne unprofessionellen Pfeil oder stoerenden Browserleisten-Button.
- `RP-UX-14 | CONFIRMED_FROM_CHAT` Keine Karten in Karten und keine unnötig dekorative Dashboard-Struktur.
- `RP-UX-15 | CONFIRMED_FROM_CHAT` Text darf auf keinem Viewport ueberlaufen, gequetscht oder von Controls verdeckt werden.
- `RP-UX-16 | CONFIRMED_FROM_CHAT` Sportartenneutral formulieren und unnötige Sportart-Abfragen in Teambeitritt/Solo-Registrierung vermeiden.
- `RP-UX-17 | CONFIRMED_FROM_BOTH` Spielertexte: klar, direkt, ernst, nicht akademisch, nicht kumpelhaft, nicht kindlich.
- `RP-UX-18 | CONFIRMED_FROM_CHAT` Eine reale Situation zuerst, dann konkrete Handlung, dann kurzer Nutzen; Fachbegriffe nur sofort erklaert.
- `RP-UX-19 | CONFIRMED_FROM_CODE` Offline-/Reconnect-Zustand wird dezent, zugänglich und ohne Datenverlustversprechen ueber den belegten Draft-Umfang hinaus angezeigt.
- `RP-UX-20 | INFERRED` Accessibility soll bei neuen Interaktionen mindestens semantische Rollen, Tastaturbedienung, sichtbaren Fokus und Screenreader-Status umfassen; bisher nur teilweise systematisch belegt.

## Wiederkehrende Fehlermuster

- Zu viele Charts und unklare Scores statt direkter Information.
- abstrakte Kurztexte, obwohl der lange Science Bite verstaendlich ist.
- mobile Spruenge in die Mitte eines Flows.
- doppelte Update-/Reload-Mechanismen und Safari-PWA-Reload-Loops.
- Ladezustand ohne Feedback.
- wiederholte Hilfetexte, die das Interface lauter machen.
- Formulierungen, die Spieler wie Fachpublikum behandeln.

