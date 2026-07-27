# Admin Data & Export Center

Stand: 27. Juli 2026

## Ziel

Der Adminbereich besitzt einen einzigen, nachvollziehbaren Einstieg fuer
Auswertung und Export. Die Daten bleiben auch ohne MahleOS oder ein KI-System
manuell erreichbar.

## Informationsarchitektur

Die acht Hauptbereiche sind:

1. Uebersicht
2. Tage
3. Teams
4. Coach-Zugaenge
5. Pilotsteuerung
6. Daten & Exporte
7. Feedback
8. Datenqualitaet

`Daten & Exporte` buendelt:

- **Ergebnisse:** aktueller NLZ-/Evidence-Stand, Nutzung, Adherence,
  Messabdeckung, Outcomes und Claim-Grenzen.
- **Gesamtdaten:** portfolioartige Production-Kennzahlen,
  Programmevaluation, Kohorten und Missingness.
- **Team-Export:** Auswahl eines Mannschaftslaufs und Erzeugung eines
  unveraenderlichen, pruefsummenbelegten Data Locks.
- **Solo-Export:** sportartenbezogene Solo-Evidence und unveraenderlicher
  Data Lock.
- **Programmverstaendnis:** ausschliesslich interne, aggregierte Auswertung
  dazu, ob Tagesthema und konkrete Anwendung bei den Athleten angekommen sind.

Die operative Erstellung, Aktivierung, Zuordnung und Archivierung von
Programmlauefen bleibt getrennt in `Pilotsteuerung`. Dadurch stehen
Schreibaktionen nicht zwischen Reporting- und Exportfunktionen.

## Verstaendnisdaten

Die neue Admin-Auswertung verwendet ausschliesslich bereits erhobene,
strukturierte Verstaendnischecks. Sie verlaengert den Tagesablauf fuer
Athleten nicht.

Sie zeigt:

- Anzahl unterschiedlicher Athleten;
- abgeschlossene Checks und beantwortete Kontrollfragen;
- aggregierte Quote nach Woche und Tag;
- Tagesinhalte mit einer Quote unter 70 Prozent als internen Klaerungshinweis;
- den jeweiligen Kontrollpunkt, damit der betroffene Inhalt eindeutig
  zugeordnet werden kann.

Die Kontrollfrage ist nur das Messinstrument. Bewertet wird nicht, ob die
Frage gut geschrieben ist, sondern ob die Athleten das Tagesthema und seine
Anwendung verstanden haben. Eine niedrige Quote ist trotzdem kein
automatischer Beweis fuer ein Inhaltsproblem. Sie kann auch durch
Aufmerksamkeit oder Zufall entstehen und muss zusammen mit Stichprobe,
Programmtag und freiwilligem Nutzerfeedback bewertet werden.

## Datenschutzgrenze

Nicht ausgegeben werden:

- Nutzer-IDs, Namen oder E-Mail-Adressen;
- gewaehlte Antwortoptionen einzelner Athleten;
- Journale oder freie Reflexionen;
- individuelle Check-in-Verlaeufe;
- individuelle psychologische Werte.

Quoten, richtige und falsche Antworten werden erst ab mindestens fuenf
unterschiedlichen Athleten angezeigt. QA- und Testdaten sind standardmaessig
ausgeschlossen. Generierte, aber nicht beantwortete Fragen zaehlen nicht als
falsche Antwort.

## Nutzungs- und Exportgrenze

Team- und Solo-Evidence werden fuer externe Weiterverarbeitung nur aus einem
versionierten Data Lock exportiert. Live-Ansichten bleiben internes
Monitoring. Das Programmverstaendnis besitzt bewusst keinen Export und bleibt
eine interne Produktqualitaetsansicht. Es ist kein Wirksamkeitsnachweis und
kein Bestandteil von Investor-, Vereins- oder Website-Unterlagen.

## Technische Belege

- `get_admin_comprehension_insights(false)` ist serverseitig admin-only.
- Der SQL-Verifikationstest prueft Rollen, QA-Ausschluss, `n < 5`,
  unbeantwortete Fragen und private Felder.
- Komponenten- und Strukturtests pruefen Fehlerzustand, Navigation und die
  Trennung von Pilotsteuerung und Evidence-Export.
- Die interne Evidence-Vorschau deckt Desktop und iPhone ohne horizontalen
  Seitenueberlauf ab.

## Aktivierung

Die neue Migration ist in diesem Branch nur vorgeschlagen. Sie ist nicht in
Production angewendet. Bis zu einer ausdruecklichen Freigabe bleibt die neue
Verstaendnisansicht dort ohne Daten.
