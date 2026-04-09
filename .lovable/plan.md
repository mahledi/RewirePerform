

# Neue Seiten: Feedback, Datenschutz, FAQ & App-Installation + Persistent Login

## Übersicht

Vier neue Features, die das System für die Mannschaft komplett nutzbar machen:

1. **Settings/Info-Seite** — Zentrale Anlaufstelle im Dashboard mit: Feedback-Formular, Datenschutz, FAQ, App-Installation-Anleitung
2. **Persistent Login** — Session bleibt nach Browser-Schließung erhalten (kein erneutes Einloggen)
3. **Feedback-System** — Spieler können strukturiertes Feedback geben (wird in DB gespeichert)
4. **Navigation** — Zugang zu allem über das Dashboard (z.B. Settings-Icon)

## Änderungen

### 1. Neue Seite: `src/pages/Settings.tsx`
Einzelne übersichtliche Seite mit Accordion-Sektionen:

**Feedback-Sektion:**
- Formular mit Typ-Auswahl (Bug, Vorschlag, Allgemein) + Freitext
- Wird in neuer `feedback` Tabelle gespeichert
- Bestätigungs-Toast nach Absenden

**Datenschutz-Sektion:**
- Klare Erklärung was gespeichert wird, wer Zugriff hat
- Was der Coach sieht vs. nicht sieht
- Daten-Löschung: Wie man seinen Account löschen kann
- DSGVO-konform formuliert

**FAQ-Sektion (Accordion):**
- "Was ist MindGame?" — Intention und Ziel
- "Wie funktioniert das Programm?" — Fragebogen → Analyse → tägliche Aufgaben
- "Was sind die täglichen Aufgaben?" — Knowledge-First, dann Übung
- "Wie verändert mich das?" — Wissenschaftliche Grundlage, Neuroplastizität
- "Sieht mein Coach meine Antworten?" — Nein, nur Aktivitätsstatus
- "Kann ich meine Daten löschen?" — Ja, Account-Löschung
- "Wie oft sollte ich das machen?" — Täglich, 10-15 Min

**App-Installation-Sektion:**
- Schritt-für-Schritt Anleitung mit Screenshots-Beschreibung
- iOS: Safari → Teilen → "Zum Home-Bildschirm"
- Android: Chrome → Menü → "Zum Startbildschirm hinzufügen"
- Erklärung dass es wie eine echte App funktioniert

### 2. DB-Migration: `feedback` Tabelle
```sql
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL DEFAULT 'general',
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own feedback" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own feedback" ON public.feedback FOR SELECT USING (auth.uid() = user_id);
```

### 3. Persistent Login (`src/pages/Auth.tsx`)
Beim `signInWithPassword` die Option `persistSession: true` ist bereits Standard bei Supabase — aber wir stellen sicher, dass kein Code die Session manuell invalidiert. Keine Code-Änderung nötig, da Supabase standardmäßig die Session in localStorage persistiert und automatisch Refresh-Tokens nutzt.

### 4. Route & Navigation
- `src/App.tsx`: Neue Route `/settings` hinter `ProtectedRoute`
- `src/pages/Dashboard.tsx`: Settings-Icon (Zahnrad) in der oberen Leiste verlinkt zu `/settings`
- Back-Button auf Settings-Seite zurück zum Dashboard

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `src/pages/Settings.tsx` | Neue Seite mit Feedback, Datenschutz, FAQ, App-Install |
| `src/App.tsx` | Route `/settings` hinzufügen |
| `src/pages/Dashboard.tsx` | Settings-Icon in Header |
| DB-Migration | `feedback` Tabelle mit RLS |

