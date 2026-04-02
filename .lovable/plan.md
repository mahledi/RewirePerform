

# Neurokognitive Psychologie Integration

## Konzept

Drei Bereiche werden mit neurokognitiver Tiefe angereichert -- alles im "Snackable" Format (30-60 Sek):

1. **Science Bites** werden massiv um Gehirn-Themen erweitert
2. **KI-Aufgaben** erhalten einen neurokognitiven Rahmen ("Warum dein Gehirn das tut")
3. **Neuer Questionnaire-Block** "Dein Gehirn verstehen" misst Metakognition

---

## 1. Science Bites erweitern

**Datei:** `src/components/dashboard/ScienceBite.tsx`

12-15 neue Bites zu neurokognitiven Kernthemen:

| Thema | Beispiel-Bite |
|---|---|
| Amygdala-Hijack | "Nach einem Fehler übernimmt deine Amygdala in 12ms die Kontrolle -- schneller als dein bewusstes Denken. Das ist kein Versagen, sondern ein 200.000 Jahre altes Schutzprogramm." (LeDoux, 1996) |
| Ego als Survival | "Dein Ego vermeidet Risiko nicht aus Schwäche, sondern weil das Gehirn Fehler als Bedrohung fürs soziale Überleben wertet. Predictive Processing schützt dich vor dem 'schlimmsten Fall'." (Friston, 2010) |
| Energiesparer | "Das Gehirn verbraucht 20% deiner Energie, obwohl es nur 2% deiner Körpermasse ausmacht. Neue Bewegungsmuster kosten mehr Energie -- deshalb bevorzugt es Autopilot." (Raichle, 2006) |
| Default Mode Network | "Im DMN grübelst du über vergangene Fehler. Sportler mit höherer Achtsamkeit können dieses Netzwerk gezielt unterbrechen." (Brewer et al., 2011) |
| Metakognition | "Wenn du WEISST, dass dein Gehirn gerade in den Schutzmodus schaltet, bist du schon halb raus. Das ist Metakognition." (Flavell, 1979) |
| Neuroplastizität | "Jede bewusste Wiederholung stärkt die Myelinschicht deiner Nervenbahnen. Dein Gehirn wird buchstäblich umgebaut." (Fields, 2008) |
| Threat vs. Challenge | "Dasselbe Druckgefühl kann als Bedrohung oder Challenge interpretiert werden. Die Interpretation verändert deine Hormonantwort." (Blascovich, 2008) |
| Prefrontaler Kortex | "Unter Stress fährt der PFC herunter -- genau der Teil, der für Entscheidungen zuständig ist. Atemübungen reaktivieren ihn in 90 Sekunden." (Arnsten, 2009) |

---

## 2. KI-Prompt Tuning (adapt-program)

**Datei:** `supabase/functions/adapt-program/index.ts`

System-Prompt wird um einen neurokognitiven Block erweitert:

```text
NEUROKOGNITIVE RAHMUNG:
Jede science_bite MUSS dem Spieler erklären, welcher Gehirn-Mechanismus 
bei der Aufgabe aktiv ist. Verwende diese Konzepte:

- AMYGDALA-HIJACK: Erkläre, wie Fehler den Fight-or-Flight-Modus triggern
- EGO/SURVIVAL: Das Gehirn schützt uns vor sozialem Ausschluss durch 
  Risikovermeidung -- das ist evolutionär sinnvoll, aber limitierend
- ENERGIEHAUSHALT: Neue Muster kosten mehr Glukose als Routinen. 
  Deshalb fühlt sich Wachstum anstrengend an -- das ist normal
- METAKOGNITION: "Ich bemerke, dass ich gerade..." -- allein das Benennen 
  reduziert Amygdala-Aktivität um 50% (Lieberman et al., 2007)
- DEFAULT MODE NETWORK: Grübeln nach Fehlern ist kein Charakter-Schwäche, 
  sondern ein aktives Netzwerk das man unterbrechen kann
- NEUROPLASTIZITÄT: Jede bewusste Rep formt neue neuronale Pfade

Formuliere science_bites so, dass der Spieler versteht: "Mein Gehirn tut 
das nicht GEGEN mich, sondern FÜR mich -- aber ich kann es umprogrammieren."
```

---

## 3. Neuer Questionnaire-Block "Dein Gehirn verstehen"

**Datei:** `src/data/questionnaireData.ts`

Neue Kategorie `neurocognition` mit 4 Fragen:

| ID | Frage | Typ |
|---|---|---|
| nc-01 | "Wenn du einen Fehler machst -- wie schnell bemerkst du, dass dein Kopf anfängt zu grübeln?" | Scale 1-10 (Nie → Sofort) |
| nc-02 | "Wie oft ertappst du dich dabei, Risiken im Spiel zu vermeiden, um Fehler zu verhindern?" | Scale 1-10 (Nie → Ständig) |
| nc-03 | "Beschreibe den typischen Gedanken, der dir nach einem Fehler als erstes durch den Kopf geht." | Freitext |
| nc-04 | "Wenn du weißt, dass alle zuschauen -- spielst du dann eher 'sicher' oder probierst du Neues aus?" | Choice: Sicher spielen / Neues ausprobieren / Kommt drauf an |

Kategorie-Intro: "Dein Gehirn ist kein Gegner -- es ist ein Werkzeug. Diese Fragen helfen uns zu verstehen, wie dein 'mentales Betriebssystem' aktuell eingestellt ist."

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `src/components/dashboard/ScienceBite.tsx` | 12-15 neue neurokognitive Bites |
| `supabase/functions/adapt-program/index.ts` | Prompt-Erweiterung um Neuro-Rahmung |
| `src/data/questionnaireData.ts` | Neue Kategorie + 4 Fragen |

Keine Datenbank-Migration nötig -- die neuen Fragen nutzen die bestehende Questionnaire-Infrastruktur.

