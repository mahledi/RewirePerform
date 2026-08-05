# RewirePerform V1.1 — Audit der 56-Tage-Inhaltskarte

Status: **Planungspruefung, keine empirische Wirkungsaussage und keine Production-Aenderung**
Gepruefter Entwurf: `REWIREPERFORM_56_DAY_CONTENT_MAP_V1_1_DRAFT.md`
Bestandsabgleich: `CURRENT_56_DAY_CONTENT_CROSSWALK_V1_1_DRAFT.md`

## 1. Was verifiziert ist

- Die Karte enthaelt jeden Programmtag von 1 bis 56 genau einmal.
- Jeder der 56 bisherigen Tageskerne ist mindestens einem neuen Zieltag zugeordnet.
- Alle sieben Werkzeuge haben Aufbau-, Rueckkehr- und spaetere Vertiefungs- oder Integrationskontakte.
- Dasselbe Hauptwerkzeug fuehrt nie an zwei unmittelbar aufeinanderfolgenden Tagen.
- Tag 28 ruft alle bis dahin eingefuehrten Werkzeuge ab. Deshalb werden die laengeren sichtbaren Hauptkontakt-Abstaende von W3 und W4 nicht zu kontaktlosen Lernpausen.
- Der Plan enthaelt genau einen sichtbaren Tagesanker. Unterstuetzende Werkzeuge werden nicht als zweite Mission dargestellt.
- Rest-, Trainings- und Wettkampftage veraendern nicht die vorab festgelegte Lernlinie.
- Es gibt keinen angenommenen Druck, Gegner, Fehler, Konflikt oder sportartspezifischen Trigger, der am realen Tag eintreten muss.
- Verpasste Tage werden nicht nachgearbeitet. Nur die letzten drei koennen als kurze Lernzusammenfassung gelesen werden.
- Der Entwurf veraendert keine Produktdatei, Datenbank, Messung, Einwilligung, Bewertung, Privacy-Grenze oder App-Store-Logik.

## 2. Quantitativer Architekturcheck

| Werkzeug | Fuehrende Kontakte | Geplante Zusatzkontakte | Bewertung im Entwurf |
|---|---:|---|---|
| W1 Zurueck zur Aufgabe | 9 | Integration 28/42/56 und Unterstuetzer | hohe Dichte ist sinnvoll, weil W1 der Rueckweg vieler Werkzeuge ist |
| W2 Die Aufgabe zaehlt | 10 | Integration 28/42/56 und Unterstuetzer | hohe Dichte ist sinnvoll, weil W2 die Handlungsqualitaet ordnet |
| W3 Fehler nutzen | 7 | Integration 28/42/56 sowie W3/W5- und W3/W4-Verbindungen | ausreichend fuer Entwurf; reale Erinnerung muss im Pilot geprueft werden |
| W4 Mit dem arbeiten, was ist | 7 | Integration 28/42/56 sowie W4/W3- und W4/W7-Verbindungen | ausreichend fuer Entwurf; Trennung zu W7 ist ein Golden-Day-Gate |
| W5 Nicht automatisch folgen | 8 | Integration 28/42/56 und mehrere Unterstuetzerrollen | angemessen fuer die hoehere innere Unterscheidung |
| W6 Unsicherheit pruefen | 8 | Integration 28/42/56 und W6/W2-Verbindungen | angemessen; Sicherheits- und Ueberforderungsgrenzen bleiben Pflicht |
| W7 Blick oeffnen | 6 | Integration 42/56 und taeglicher Dankbarkeits-Mikrokontakt | geringere Hauptdichte ist plausibel, darf aber nicht mit Positivdenken verwechselt werden |

Die Zahlen sind eine nachvollziehbare Designverteilung, kein Nachweis fuer einen optimalen neurobiologischen Abstand.

## 3. Rollenpruefung — plausible Bewertung, nicht echter Usertest

### 15-jaehriger Athlet mit geringer Metakognition

Plausibel besser als heute, weil sieben stabile Cues statt fast taeglich neuer Selbstgespraeche auftauchen und eine Mission als ein Block wirkt. Hauptrisiko bleiben abstrakte Woerter in der spaeteren Vertiefung. `Reaktionskette`, `dienlich`, `tolerierbar`, `inneres Ereignis` und aehnliche Begriffe duerfen nicht ungeprueft in die Athleten-Copy gelangen.

### Athlet mit nur zwei Trainingseinheiten pro Woche

Der Inhalt ist nicht verloren, weil ein Ruhetag eine konkrete fruehere Sportszene erneut durchgehen kann und derselbe Werkzeugkern spaeter wiederkehrt. Offen bleibt empirisch, ob diese Form genug Aufmerksamkeit erhaelt oder trotz guter Architektur als weniger relevant erlebt wird.

### Athlet ohne passenden Trigger am heutigen Tag

Der Plan verlangt keine erfundene Anwendung. Der Athlet kann ehrlich `nicht aufgetreten` erkennen und eine fruehere Szene nutzen. Das verhindert falsche Erfolgsantworten. Ob die UI dies ohne Enttaeuschung vermittelt, muss in den Golden Days getestet werden.

### Skeptischer oder schnell klickender Athlet

Ein Cue und eine Mission reduzieren Oberflaechenlast. Aktiver Abruf darf aber nicht zu einem leicht erratbaren Multiple-Choice-Ritual werden. Der Flow braucht kurze freie Erinnerung, bevor Hilfen sichtbar werden, ohne Athleten fuer Nichtwissen zu bestrafen.

### Fortgeschrittener oder professioneller Athlet

Die Werkzeuge bleiben sportlich relevant; Tiefe entsteht spaeter ueber feinere Unterscheidung und Verbindungen. Das System darf diese Reife nicht behaupten. Optionale Vertiefung kann spaeter mehr Tiefe anbieten, ohne den Jugend-Pflichtflow aufzublasen.

## 4. Kritische Verwechslungs- und Belastungsgates

Ein Golden Day faellt durch, wenn mindestens einer dieser Punkte eintritt:

1. W1 und W2 klingen wie dieselbe Aufforderung.
2. W3 und W5 wirken beide nur wie `negativen Gedanken ignorieren`.
3. W4 und W7 wirken beide wie `positiv denken`.
4. W6 klingt wie pauschales Risiko, Mutbeweis oder das Uebergehen realer Gefahr.
5. Ein Unterstuetzer erzeugt sichtbar eine zweite heutige Aufgabe.
6. Ein Integrationspunkt verlangt, sieben Inhalte neu zu erklaeren oder sieben Antworten zu produzieren.
7. Ein Ruhetag behauptet eine Anwendung, die nicht stattgefunden hat.
8. Dankbarkeit wertet reale negative Erfahrungen ab oder konkurriert mit dem Tagesanker.
9. Eine spaete Formulierung behauptet Identitaets-, Gehirn- oder Leistungsveraenderung, die nicht gemessen wurde.
10. Ein 15- oder 16-Jaehriger kann nach einmaligem Lesen nicht in eigenen einfachen Worten sagen, was heute zu tun ist.

## 5. Rest-Day-Problem — konkrete Loesung im Entwurf

Ein Ruhetag verbraucht keinen einmaligen Inhalt mehr. Er erfuellt innerhalb derselben Lernlinie eine von drei Funktionen:

- **Aufbau:** Mechanismus verstehen und eine echte fruehere Szene erkennen.
- **Rueckkehr:** Werkzeug ohne neuen Theorieblock erinnern und eine fruehere Szene erneut durchgehen.
- **Vertiefung:** einen Entscheidungspunkt in einer frueheren Szene genauer erkennen.

Die sportliche Anwendung wird nicht vorgetaeuscht. Sie entsteht bei einem spaeteren realen Kontakt mit demselben Werkzeug. Damit bleibt das Pflichtprogramm 56 Tage lang, ohne Lernen vollstaendig von einem zufaelligen heutigen Ereignis abhaengig zu machen.

Noch nicht belegt ist, dass diese Loesung bei realen Athleten gleich gut wirkt wie eine Anwendung im Training. Genau diese Frage gehoert in Pilot und Feedback-System.

## 6. Noch offene Arbeit vor dem Bauen

Diese Punkte sind keine neue Foundation-Entscheidung, sondern die naechsten Qualitaetsgates:

1. Item-genauer Crosswalk aller 56 Science Bites, 168 Tasks, 225 Journalfragen und 181 Verstaendnisfragen mit `behalten`, `verbinden`, `optional`, `neu formulieren` oder `echte Redundanz`.
2. Vollstaendige Copy und Flow der zehn Golden Days.
3. Rollen- und Schnellklicktest der Golden Days sowie Verstaendlichkeitspruefung der sieben Werkzeuggrenzen.
4. User-Freigabe, erst danach Ausrollen auf alle 56 Tage.
5. Vollstaendiger Inhalts-, Logik-, Privacy-, Mobile-, Accessibility- und App-Store-Readiness-Review vor jeder Integration.

## 7. Empirisch offene Kernfragen

- Erinnern Athleten nach 7, 14, 28 und 56 Tagen Cue, Bedeutung und reale Anwendung auseinanderhaltbar?
- Erleben Athleten die Rueckkehr als Wiedererkennen und Koennen statt als langweilige Wiederholung?
- Funktionieren Rest-Day-Szenen als Vorbereitung und Abruf oder werden sie weniger ernst genommen?
- Bleibt genau ein Tagesanker im Kopf, obwohl der Inhalt fachlich weiterhin breit ist?
- Koennen juengere Athleten die Werkzeugpaare W1/W2, W3/W5, W4/W7 und W5/W6 praktisch unterscheiden?
- Fuehrt die reduzierte sichtbare Menge zu mehr realer Nutzung, ohne wichtige Mechanismen zu verlieren?

Diese Fragen werden nicht durch den Entwurf beantwortet. Sie bestimmen spaeter Pilotinterviews, freiwillige Feedback-Abfragen und Nutzungsanalysen.
