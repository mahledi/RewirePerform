

# Inner Excellence als Steuerungsdaten in adapt-program integrieren

## Ansatz: Kompakte Kontext-Zeile + 1 kurze Leitlinie

Kein eigenes Regelwerk, keine Schwellenwert-Logik. Stattdessen: Die KI bekommt die Scores als Kontext und eine kurze Anweisung, diese Prinzipien in alle Aufgaben einzuweben.

## Änderungen

**Datei:** `supabase/functions/adapt-program/index.ts`

### 1. Inner Excellence Profil ins ATHLETEN-PROFIL einfügen (Zeile 14-19)

Neue Zeile nach den bestehenden Profil-Daten:

```
- Inner Excellence: Growth Mindset ${growth_mindset_score}/100, Präsenz: ${presence_level}, Ego-Freiheit: ${ego_freedom_score}/100, Emotionskontrolle: ${emotional_control_score}/100
- Core Insight: ${core_insight}
```

Die Werte werden aus `analysis.inner_excellence_profile` gelesen (mit Fallback-Defaults falls nicht vorhanden).

### 2. Eine kompakte Leitlinie ergänzen (nach den bestehenden REGELN, ~Zeile 70)

```
INNER EXCELLENCE (DURCHGEHEND):
Die Inner Excellence Scores sind Kern-Prinzipien maximaler Performance. Webe sie natürlich in ALLE Aufgaben ein – nicht als separate Kategorie, sondern als Grundhaltung:
- Niedrige Scores → Übungen betonen diesen Aspekt stärker (z.B. Prozess-Fokus statt Ergebnis bei niedrigem Growth Mindset, Atemtechniken bei niedriger Emotionskontrolle)
- Hohe Scores → Nutze sie als Hebel ("Deine Stärke ist Präsenz – baue darauf auf")
- Der Core Insight ist die tiefste Erkenntnis über den Athleten. Lass ihn die Tonalität und Ausrichtung ALLER Aufgaben beeinflussen.
```

### 3. Sichere Datenextraktion

Am Anfang von `buildSystemPrompt()` das Inner Excellence Profil sicher auslesen:

```typescript
const ieProfile = analysis.inner_excellence_profile || {};
const growthMindset = ieProfile.growth_mindset_score ?? "N/A";
const presenceLevel = ieProfile.presence_level ?? "N/A";
const egoFreedom = ieProfile.ego_freedom_score ?? "N/A";
const emotionalControl = ieProfile.emotional_control_score ?? "N/A";
const coreInsight = ieProfile.core_insight ?? "Noch nicht ermittelt";
```

## Ergebnis

Die KI kennt die Inner Excellence Scores und den Core Insight des Athleten. Sie entscheidet selbst, wie sie diese in die täglichen Aufgaben einwebt – ob als Fokus einer Visualisierung, als Framing einer aMCC-Challenge, oder als Tonalität im Science Bite. Keine starre Regellogik, sondern intelligente Steuerung durch Kontext.

## Betroffene Datei

| Datei | Änderung |
|---|---|
| `supabase/functions/adapt-program/index.ts` | `buildSystemPrompt()` um IE-Profil-Daten und eine kurze Leitlinie erweitern |

