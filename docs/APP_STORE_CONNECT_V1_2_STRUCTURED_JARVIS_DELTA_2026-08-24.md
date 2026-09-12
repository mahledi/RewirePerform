# App Store Connect V1.2 – Structured-only Jarvis Delta

Stand: 24. August 2026
Status: finaler Textentwurf für den tatsächlichen V1.2-Datenweg; vor Submission
gegen den bytegenauen Release Candidate und die sichtbaren ASC-Antworten prüfen.

## App-Privacy-Einordnung

Es entsteht keine zusätzliche Apple-Datenart. Der interne Jarvis-Pfad verarbeitet
einen minimierten Ausschnitt der bereits deklarierten **Product Interaction**:
freiwillige strukturierte Feedback-Auswahlantworten, Programmtag und
Aktivitätszählungen.

- **Linked to User:** Ja im RewirePerform-Producer, solange die Datensätze für
  Einwilligung, Widerruf und Löschung der Programminstanz zugeordnet sind.
- **Zweck:** App Functionality und Analytics zur internen Produktverbesserung.
- **Tracking:** Nein.
- **Weitergabe an externe KI-Anbieter:** Nein.
- **Automatisierte Einzelentscheidung/Profiling:** Nein.
- **Modelltraining/Fine-Tuning:** Nein.

Optionales Produktfeedback als **Other User Content** bleibt getrennt: Es ist nur
nach eigener Einwilligung in der geschützten menschlichen Admin-Ansicht lesbar
und wird nicht an Jarvis übermittelt.

## Review Notes – ergänzender Text

> RewirePerform bietet an den Programmtagen 10, 24, 39 und 55 freiwillige und
> überspringbare Produktfeedback-Checkpoints. Strukturierte Auswahlantworten
> können durch ein intern und lokal betriebenes Auswertungssystem zu
> beschreibenden Gruppenergebnissen zusammengefasst werden. Der Transport
> enthält keine Namen, E-Mail-Adressen oder direkten Nutzerkennungen. Technisch
> notwendige pseudonyme Paketreferenzen werden nur vorübergehend im
> Arbeitsspeicher verarbeitet, nicht im Ergebnis ausgegeben und nicht dauerhaft
> gespeichert. Ergebnisse werden pro Frage nur ab mindestens fünf
> unterschiedlichen freigegebenen Teilnehmenden ausgegeben.
>
> Ein optionaler Produktfeedback-Kommentar ist separat einwilligungspflichtig
> und ausschließlich für die geschützte menschliche Admin-Prüfung vorgesehen.
> Kommentare, Journale, private Reflexionen, Supporttexte und Coach-Notizen
> werden nicht an das Auswertungssystem übermittelt. Die Daten werden weder für
> Werbung oder Tracking noch für automatisierte Entscheidungen oder das
> Training eines KI-Modells genutzt. Bei Minderjährigen werden die jeweils
> aktuellen altersgerechten Athleten- und gegebenenfalls Guardian-Freigaben beim
> Export erneut geprüft.

## Vor dem Einreichen sichtbar prüfen

1. Product Interaction ist als erhoben, mit Nutzer verknüpft, für App
   Functionality und Analytics sowie nicht für Tracking angegeben.
2. Other User Content bildet ausschließlich den optionalen Kommentar ab.
3. Privacy URL zeigt den Stand vom 24. August 2026 und denselben structured-only
   Jarvis-Datenweg.
4. Review Notes behaupten keine Freitextanalyse, externe KI, individuelle
   Athletenbewertung oder wissenschaftliche Wirksamkeit.
5. Der ausgewählte Build enthält exakt diese Datenschutzerklärung und die
   Feedback-UI, bevor V1.2 zur Prüfung gesendet wird.
