# Evidence & Outcomes Layer - Known Limitations

Stand: 20. Juli 2026

Dieses Dokument beschreibt bewusst konservativ, was RewirePerform mit dem
aktuellen Tracking- und Evidence-System messen und was es nicht beweisen kann.

## 1. Mannschaftslaeufe existieren, sind aber keine Kontrollgruppen

`program_runs` bindet einen benannten Mannschaftslauf an ein Team, ein
Startdatum und die zugeordneten `program_instances`. Damit koennen Daten einem
konkreten Pilotlauf zugeordnet werden.

Der Coach-Outcome-Screen verwendet aktuell den aktiven Lauf. Historische oder
abgeschlossene Laeufe werden ueber explizite Dossiers und Data Locks
ausgewertet. Eine automatische statistische Gegenueberstellung von Lauf 1 gegen
Lauf 2 ist noch kein freigegebener Outcome-Vertrag.

Ein Mannschaftslauf ist keine Kontrollgruppe. Er verbessert Zuordnung und
Reproduzierbarkeit, erzeugt allein aber keine Kausalevidenz.

## 2. Beobachtete Entwicklung ist kein allgemeiner Kausalnachweis

Das System kann Programmnutzung, wiederholte In-App-Antworten, strukturierte
Coach-Beobachtungen und Pre-/Mid-/Post-Verlaeufe messen.

Zulaessige Beschreibung:

- beobachtete Veraenderung waehrend des Programms
- aggregierter Team- oder Solo-Verlauf
- Athleten berichteten eine Veraenderung
- Coaches beobachteten ein bestimmtes Verhalten

Ohne vorab definiertes Vergleichs- oder randomisiertes Design unzulaessig:

- RewirePerform verursachte sportliche Leistungssteigerung
- RewirePerform fuehrte zu Sieg oder Qualifikation
- die App hat das Gehirn nachweislich umverdrahtet
- eine Veraenderung ist garantiert oder universell

## 3. In-App-Messung ist nicht gleich Wettkampfleistung

Check-ins, Transfer-Pulse, Frageboegen und Assessments messen Antworten und
Verhalten innerhalb des festgelegten App-Protokolls. Sie koennen relevante
mentale Prozesse abbilden, beweisen aber ohne externe sportnahe Outcomes keinen
Transfer auf Ergebnis, Technik, Taktik oder Wettkampfleistung.

Selbstbericht, Coach-Beobachtung und objektivere Performance-Tasks muessen im
Reporting getrennt bleiben.

## 4. Mindestgruppe und Unsicherheit

- Sensible Aggregate bleiben unter `n = 5` verborgen.
- Werte bei `n = 5` bis `9` werden als kleine Datenbasis beziehungsweise
  `low_confidence` markiert.
- Pre-/Post-Aenderungen brauchen mindestens fuenf gueltige Paare.
- Fehlende Messungen und Drop-out werden berichtet, nicht still aufgefuellt.

Die Grenze schuetzt Privatsphaere. Sie macht kleine Gruppen nicht automatisch
statistisch belastbar.

## 5. Aktuelle Autorisierung bleibt erforderlich

Neue Evidence wird nur fuer eine aktive Programminstanz und ein aktives,
versioniertes Protokoll erhoben. Ein abgeschlossener Lauf kann in einer
dynamischen Auswertung bleiben, solange der aktuelle Consent und bei
Minderjaehrigen die erforderlichen aktuellen Receipts weiterhin gueltig sind.

Ein Widerruf entfernt die Person aus neuen dynamischen Aggregaten. Bereits
erzeugte Data Locks werden nicht still veraendert. Deren Invalidierungs-,
Aufbewahrungs- und Loeschregel muss vor einem realen Minderjaehrigenpilot
fachlich und rechtlich final festgelegt werden.

## 6. Coach-Zugriff bleibt begrenzt

Coaches duerfen operative Aktivitaet sehen, zum Beispiel letzte Aktivitaet,
absolvierte Tage, Completion Rate, Streak, Check-in-Anzahl und Journal-Anzahl.

Coaches erhalten nicht:

- Journal- oder Reflexionstext
- einzelne Mood-, Energie-, Fokus- oder Stresswerte
- einzelne Assessment-Antworten oder Scores
- psychologische Labels oder Persoenlichkeitsurteile
- einzelne Evidence-Beitraege fuer Teamvergleiche

Der Teamzustand wird serverseitig aggregiert und gibt keine Athleten-ID aus.

## 7. Solo-Sport-Taxonomie ist eine Analysehilfe

Die strukturierte Einteilung nach Sportkategorie, Teilnahmeformat und Niveau
wird aus bereits vorhandenen Onboarding-Antworten abgeleitet. Sie ermoeglicht
vergleichbare Solo-Aggregate, ist aber keine validierte sportwissenschaftliche
Klassifikation und keine Leistungsdiagnose.

Unbekannte oder mehrdeutige Sportarten muessen als `unknown_or_other` sichtbar
bleiben, statt sicher klingend falsch zugeordnet zu werden.

## 8. Data Locks sichern Reproduzierbarkeit, nicht Wahrheit

Ein Data Lock friert ein Aggregat, Analysemanifest, Source-Cutoff und SHA-256-
Pruefsumme ein. Das beweist, welcher Datenstand ausgewertet wurde und ob der
Payload spaeter veraendert wurde.

Ein Data Lock beweist nicht automatisch:

- dass die zugrunde liegenden Antworten inhaltlich wahr sind
- dass Missingness zufaellig ist
- dass eine Skala fuer jeden Kontext validiert oder lizenziert ist
- dass eine beobachtete Veraenderung von RewirePerform verursacht wurde

## 9. Lokale und produktive Evidenz sind getrennt

Der Integrationskandidat vom 20. Juli besteht lokale Unit-, Vertrags- und
PostgreSQL-kompatible Negativtests. Seine neuen Migrationen und Edge Functions
sind noch nicht auf Production aktiviert.

Vor jeder externen Aussage muessen Production-Migrationsstand, Function-Grants,
RLS/JWT, Consent-Population, Testdatenfilter, Pruefsummen und Exportinhalt erneut
gegen das reale Zielsystem verifiziert werden.
