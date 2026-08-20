# RewirePerform V1.2 – Feedback Intelligence Readiness

Stand: 20. August 2026
Status: lokal vorbereitet; keine Production-, Jarvis- oder App-Store-Aktivierung

## Verbindlicher V1.2-Scope

- Feedback-Checkpoints an Tag 10, 24, 39 und 55;
- freiwillige, überspringbare Auswahlantworten;
- optionaler Produktfeedback-Freitext erst nach einer zusätzlichen ausdrücklichen Entscheidung;
- ein Nein zum Freitext lässt Auswahlfragen, Programm und sportliche Teilnahme unverändert;
- keine Journale, privaten Reflexionen, Supporttexte, Namen, E-Mail-Adressen, Team- oder Coach-IDs;
- kein Coach-Zugriff auf Einzelantworten oder Kommentare;
- bewusst freigegebene Produktfeedback-Kommentare sind ausschließlich in der geschützten, pseudonymisierten
  und nur lesenden Admin-Ansicht zugänglich;
- Jarvis erhält in dieser V1.2-Auslieferung keine Produktfeedbackdaten;
- kein externer KI-Anbieter und kein zweiter Rohtextspeicher.

## Technische Gates

Der vollständige V1.2-Client verlangt:

```text
VITE_RELEASE_LINE=1.2
VITE_FEEDBACK_INTELLIGENCE_V1_ENABLED=true
VITE_FEEDBACK_TEXT_V1_ENABLED=true
```

Die Datenbank öffnet den Textpfad nur, wenn zusätzlich alle serverseitigen Gates aktiv sind. Für Athletinnen
und Athleten unter 16 muss eine gültige Guardian-Freigabe für exakt denselben Scope vorliegen. Die Person
entscheidet trotzdem an jedem Checkpoint selbst. Ab 16 erfolgt die Freitextentscheidung selbst.

Die V1.2-Aktivierungsfunktion ist owner-only und atomar. Sie pinnt die vier Fragebogenversionen, die aktuelle
Freitext-Einwilligung, 365 Tage maximale Rohtextaufbewahrung, den internen Verarbeitungsmodus und den deutschen
Minderjährigenweg. Die Migration zu installieren aktiviert nichts.

## Widerruf und Löschung

Die Freitext-Einwilligung ist pro Checkpoint nachvollziehbar und in den Einstellungen widerrufbar. Ein Widerruf
löscht den Kommentar und personenbeziehbare Analyseableitungen. Strukturierte Auswahlantworten bleiben davon
getrennt. Kontolöschung und Zweckende greifen zusätzlich. Bereits wirklich anonyme Aggregate dürfen nur ohne
Rückschlussmöglichkeit bestehen bleiben.

## Vor einer Production-Aktivierung

1. finalen V1.2-Datenschutzhinweis und dazu passende App-Store-Privacy-Angaben veröffentlichen;
2. echte Verantwortlichenentscheidung zu Rechtsgrundlage, Zweck, Datenumfang, Empfängern, Aufbewahrung,
   Widerruf und Minderjährigenweg unter einer finalen Controller-Assessment-Referenz dokumentieren;
3. synthetischen Staging-Smoke für Erwachsene, 16–17, unter 16 mit Guardian, Ablehnung, Widerruf und Löschung;
4. sämtliche Jarvis-/Machine-Reader gegen echte Daten technisch geschlossen lassen;
5. neuen bytegenauen iOS-Build erstellen und auf iPhone und iPad physisch testen;
6. erst danach den owner-only Production-Aufruf freigeben.

Eine externe Kanzleiprüfung ist kein technisches Aktivierungsgate. Die Controller-Assessment-Referenz darf aber
nur auf eine reale, abgeschlossene und zum tatsächlich aktivierten Datenweg passende Verantwortlichenentscheidung
verweisen. Sie ist selbst kein Nachweis, dass die Umsetzung rechtmäßig ist.
