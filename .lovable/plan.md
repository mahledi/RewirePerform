## Was du willst

Eine **simple, offline-fähige Admin-Ansicht** zum Durchblättern aller 56 Programmtage — damit du auch ohne Netz (Zug, unterwegs, Mac mit WLAN aus) am Programm-Content arbeiten / ihn reviewen kannst. Kein Athleten-Flow, keine Supabase-Daten, keine AI.

## Warum es jetzt nicht geht

Der existierende Admin (`/admin`) ruft beim Mount Supabase-Funktionen auf (`get_admin_overview_stats`, `get_admin_teams_summary` etc.). Schlägt einer fehl → React-State bleibt im Loading/Error → wirkt für dich wie „Offline". Außerdem lädt `/admin` viel JS (Recharts, Tabellen), was beim ersten Offline-Besuch evtl. nicht im Cache lag.

## Lösung: Eigenständige Offline-Route `/admin/content`

Eine neue Seite, **die nichts von Supabase will**. Komplett aus dem Bundle (alle 56 Tage stecken bereits in `dailyContent.ts`, `matrixDays.ts`, `scienceBites.ts` — zusammen ~220 KB).

### Was die Seite zeigt

- Liste aller 56 Tage (gruppiert nach Phase / Woche), klickbar
- Pro Tag in einer Detail-Ansicht:
  - Matrix-Day Header (Phase, lens, primaryMechanism)
  - Tasks (title, action, why)
  - Science Bite
  - Comprehension Pool (alle Fragen + richtige Antwort markiert + Erklärung)
- **Edit-Notizen-Feld** pro Tag (lokal in `localStorage` gespeichert) — damit du beim Reviewen Verbesserungsideen festhalten kannst, die du später in den Code übernimmst
- **Export-Button:** Alle Notizen als JSON / Markdown runterladen → einfach in den nächsten Lovable-Prompt kopieren

### Offline-Garantien

1. **Route-Guard:** Prüft `user` aus AuthContext (Session liegt offline im localStorage von supabase-js → klappt). Kein DB-Roundtrip.
2. **Bundle-Splitting deaktivieren** für diese Route → alles in einen Chunk, der mit der App-Shell vorgeladen wird.
3. **Service Worker:** Ist bereits korrekt konfiguriert (`precacheAndRoute` + NetworkFirst-Fallback auf `index.html`). Sobald du die Route einmal online aufrufst, ist sie offline da.
4. **Online/Offline-Indikator** oben rechts (kleiner grauer Dot + „Offline") via `navigator.onLine` — nur informativ, blockiert nichts.

### Was sich NICHT ändert

- Bestehender `/admin` bleibt 1:1 (Stats, Teams, Feedback, etc. — online-only, wie bisher).
- Athleten-Flow, Coach-Flow, Onboarding: unangetastet.
- Keine DB-Migration, keine neuen Tabellen, keine RLS-Änderung.
- Keine AI-Calls.

## Technische Details

**Neue Dateien:**
- `src/pages/AdminContent.tsx` — die Offline-Content-Browser-Seite
- `src/components/admin/DayContentDetail.tsx` — Detail-Render für einen Tag
- `src/lib/adminNotes.ts` — kleines `localStorage`-Wrapper (`getNote(day)`, `setNote(day, text)`, `exportAll()`)

**Anpassungen:**
- `src/App.tsx` — neue Route `/admin/content` hinter `<ProtectedRoute>` + Admin-Rolle-Check (Rolle wird nach Login einmalig in `localStorage` gecached, damit es offline klappt)
- `src/contexts/AuthContext.tsx` (winzig) — Rolle nach erstem Login persistieren
- `src/pages/Admin.tsx` — kleiner Link/Button „📚 Content offline durchblättern" oben, der zu `/admin/content` führt

**Roll-out:**
1. Bauen & publishen.
2. Du öffnest **einmal online** `/admin/content` auf deinem Mac in Chrome → Service Worker cached alles.
3. Ab dann: WLAN aus → Route funktioniert vollständig.

## Test

- Online: Route lädt, alle 56 Tage durchklickbar, Notizen speichern + Export-Download funktioniert.
- Chrome DevTools → Application → Service Workers → „Offline" → Reload → Route lädt weiter, Notizen bleiben, Export funktioniert.
