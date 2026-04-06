

# Analyse-Edge-Function um Inner Excellence erweitern

## Aktuelle Situation
Der System-Prompt in `analyze-questionnaire/index.ts` enthält keine Erwähnung von Inner Excellence. Die KI analysiert die Antworten zwar (sie werden als Q&A-Paare übergeben), aber ohne explizite Anweisung, die Inner Excellence-Dimensionen gezielt auszuwerten.

## Änderungen

**Datei:** `supabase/functions/analyze-questionnaire/index.ts`

### 1. System-Prompt erweitern (Zeile 50-73)

Den Analyse-Auftrag um Inner Excellence-spezifische Dimensionen ergänzen:

- **Neue Analyse-Dimension** im Prompt: "Inner Excellence Profil" — Bewertung von Präsenz, Growth Mindset, Ego-Freiheit und emotionaler Kontrolle
- Anweisung, die Inner Excellence Fragen (ie-01 bis ie-25) besonders zu gewichten für:
  - Growth vs. Result Mindset Score
  - Präsenz-Level  
  - Ego-Freiheit Score
  - Emotionale Regulation

### 2. JSON-Output-Struktur erweitern

Neues Feld `inner_excellence_profile` zum erwarteten JSON hinzufügen:

```json
"inner_excellence_profile": {
  "growth_mindset_score": 0-100,
  "presence_level": "low/medium/high",
  "ego_freedom_score": 0-100,
  "emotional_control_score": 0-100,
  "core_insight": "..."
}
```

### 3. Tool-Schema anpassen (Zeile ~85-150)

Das `create_mental_profile` Tool-Schema um die `inner_excellence_profile`-Properties erweitern, damit die KI strukturiert antwortet.

### 4. dominant_category aktualisieren

In der Beschreibung des `dominant_category`-Feldes `inner_excellence` als möglichen Wert ergänzen.

## Betroffene Datei

| Datei | Änderung |
|---|---|
| `supabase/functions/analyze-questionnaire/index.ts` | System-Prompt + Tool-Schema um Inner Excellence erweitern |

