# Verständnis-Checks anspruchsvoller gestalten

## Problem

Die 181 Fragen in `src/content/dailyContent.ts` haben ein erkennbares Muster:
- **Richtige Antwort** = oft die längste Option mit nuancierter Formulierung
- **Distraktoren** = kurz, plakativ, offensichtlich falsch („Ich pushe mich härter", „Maximale Leistung erbracht")

→ Spieler können raten ohne zu lesen. Kein echtes Verstehen nötig.

## Ziel

Jede Frage soll:
1. **Optionen gleichlang** (±15 % Zeichen, alle 1 Satz)
2. **Alle 4 plausibel** für jemanden, der den Tag nur halb gelesen hat
3. **Eine eindeutig richtig**, aber Unterscheidung erfordert Nachdenken über die *Kernaussage* des Tages (nicht über Wortlänge)
4. **Distraktoren = häufige Missverständnisse** (z. B. Leistungs-Framing, Selbstoptimierung, Härte) — nicht offensichtlicher Unsinn
5. **Erklärung** schärft warum-richtig *und* warum-falsch (1 Satz)

## Vorgehen

**Automatisiert per Lovable AI Gateway** (gemini-2.5-pro, einmaliges Build-Skript, kein Runtime-Call):

1. Skript `scripts/rewrite-comprehension.ts` schreiben:
   - Liest aktuelle Pools aus `dailyContent.ts`
   - Schickt pro Tag den **Tagesinhalt** (Matrix + DailyContent) + **alte Fragen** an Gemini
   - Prompt mit Regeln (1–5) + Few-Shot-Beispiel guter/schlechter Fragen
   - Bekommt JSON zurück mit überarbeiteten Optionen + Erklärungen
   - **Erhält** `id`, `target`, `stem`, `correctOptionId` (nur Texte ändern)
   - Validiert: Längen-Toleranz, alle 4 Optionen vorhanden, korrekteOption-ID existiert
2. Tag-für-Tag in einer neuen Datei `dailyContent.generated.ts` rausschreiben → manuell diffen → bei OK in `dailyContent.ts` mergen
3. Build + Smoke-Test im Admin-Spieler-Simulator (Tage 1, 14, 28, 42, 56)

## Sicherheits-Netz

- **Kein Live-AI im User-Flow** — alles offline-vorgeneriert, statisch im File
- **Backup** der alten Pools als `dailyContent.backup.ts` bevor überschrieben wird
- Bei jedem Tag: Wenn AI-Output Validierung nicht besteht → alten Pool behalten, Tag in Log markieren
- Du reviewst stichprobenartig 5–10 Tage bevor merge

## Technische Details

- Datei: `src/content/dailyContent.ts` (Zeilen ~87–~2400, `COMPREHENSION_POOLS`)
- Modell: `google/gemini-2.5-pro` über Lovable AI Gateway (`LOVABLE_API_KEY`)
- Regex-Fallback fürs JSON-Parsing (Memory-Regel)
- Skript-Run: `bun run scripts/rewrite-comprehension.ts`
- Keine DB-Änderungen, keine UI-Änderungen, kein Edge-Function-Deploy

## Was sich NICHT ändert

- `ComprehensionCheck.tsx` UI bleibt 1:1
- Anzahl Fragen pro Tag bleibt
- `id`, `target`, `stem`, `correctOptionId` bleiben — nur Optionstexte + Erklärungen werden geschärft
- Matrix-Tage, Tasks, Science Bites unberührt
