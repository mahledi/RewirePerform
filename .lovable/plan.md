# Fix: Black-Screen auf der veröffentlichten App

## Was kaputt ist

Die veröffentlichte Version (`science-fueled-athlete.lovable.app`) zeigt einen schwarzen Bildschirm. Die Sandbox-Preview funktioniert. Ursache ist eindeutig nachgewiesen:

- Das ausgelieferte JS-Bundle (`/assets/index-bRAPu7bO.js`, ~2 MB) enthält **kein einziges Vorkommen** unserer Supabase-Projekt-URL (`twceqincrbrenyuqukpj`) und keinen Anon-Key.
- D.h. beim Build der Publish-Pipeline waren `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY` leer.
- `createClient(undefined, undefined)` wirft sofort → React-Root crasht → leerer `<div id="root"></div>`.

Das ist **keine Folge** der Edge-Function-Aufräumarbeiten ("ohne Supabase"). Es ist eine Folge davon, dass `src/integrations/supabase/client.ts` im Rahmen der Portability-Initiative auf reine Env-Variablen umgestellt wurde — die Lovable-Publish-Pipeline injiziert diese Variablen aber nicht in den Build, und es gibt keinen Fallback.

## Was zu tun ist

### 1. Robusten Fallback im Supabase-Client

`src/integrations/supabase/client.ts` so anpassen, dass es

- weiterhin bevorzugt `import.meta.env.VITE_SUPABASE_*` benutzt (Portability bleibt),
- aber bei fehlenden Werten auf die fest hinterlegten Projekt-URL und Publishable-Key zurückfällt (Lovable-Publish funktioniert wieder).

Der Publishable-Key ist ein öffentlicher Anon-Key (RLS schützt die Daten) und darf laut Lovable-Vorgaben im Code stehen.

### 2. Verifikation

- Republish auslösen.
- `curl https://science-fueled-athlete.lovable.app/` und das verlinkte `/assets/index-*.js` herunterladen.
- Prüfen, dass die Projekt-Ref im Bundle vorkommt.
- Seite im Browser laden, Konsole muss frei von Supabase-Init-Fehlern sein, Landing-Page rendert.

### 3. Kein Rückbau der Portability

- `.env.example`, `scripts/validate-env.mjs`, GitHub-Workflow und `docs/PORTABILITY.md` bleiben unverändert.
- Auf fremden Hosts (Vercel etc.) wirken weiterhin die echten Env-Vars; der Fallback greift dort nicht, weil die Vars gesetzt sind.

## Technische Details

```text
client.ts (neu, vereinfacht):

  const url = import.meta.env.VITE_SUPABASE_URL
    || "https://twceqincrbrenyuqukpj.supabase.co";
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    || "<aktueller anon key>";
  export const supabase = createClient<Database>(url, key, { auth: { ... } });
```

Hinweis: `src/integrations/supabase/client.ts` ist normalerweise als "auto-generated, do not edit" markiert. Hier ist die manuelle Bearbeitung trotzdem korrekt, weil genau diese Datei im Portability-Schritt schon manuell auf Env-Vars umgebaut wurde und die Lovable-Generierung sie aktuell nicht überschreibt.

## Nicht Teil dieses Plans

- Keine Änderungen am Questionnaire, an `qaSyntheticAnswers.ts`, am Test-/Fragenkatalog oder an Edge Functions.
- Kein Wechsel zurück auf alte AI-Edge-Function-Calls.
