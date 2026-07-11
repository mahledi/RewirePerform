# Produktentscheidungen und Historie

| ID | Phase | Entscheidung | Problem / Begruendung | Status |
|---|---|---|---|---|
| DEC-01 | Grundprodukt | 56-Tage-System mit taeglicher Anwendung | Entwicklung braucht Wiederholung statt einmaligen Content | `CONFIRMED_FROM_BOTH`, gueltig |
| DEC-02 | Content | Wissenschaftliche Tiefe bleibt, Athletensprache wird vereinfacht | Abstrakte Sprache verhindert Umsetzung | `CONFIRMED_FROM_CHAT`, aktuell |
| DEC-03 | Daily | Kalenderkontext Training/Wettkampf/Ruhe passt Anwendung an | Aufgaben duerfen keine nicht stattfindende Sportszene erfinden | `CONFIRMED_FROM_BOTH`, gueltig |
| DEC-04 | Coach | Teamzustand als direkte Zahlen, keine Graphen-/Readiness-Ueberladung | Coach soll erkennen statt analysieren muessen | `CONFIRMED_FROM_CHAT`, im Mental-Tab umgesetzt |
| DEC-05 | Privacy | Coach sieht keine privaten Texte oder Einzel-Psychowerte | Vertrauen und Datenschutz | `CONFIRMED_FROM_BOTH`, unverhandelbar |
| DEC-06 | Evidence | Mindest-n 5, Low Confidence bis n 10 | Schutz und ehrliche Interpretation | `CONFIRMED_FROM_BOTH`, gueltig |
| DEC-07 | Evidence | Keine Kausalclaims ohne Kontrollgruppe | Wissenschaftliche Integritaet | `CONFIRMED_FROM_BOTH`, gueltig |
| DEC-08 | Assessments | Validierte Pre/Mid/Post plus eigener Development Index | Veraenderungsanker ohne lange neue Frageboegen | `CONFIRMED_FROM_BOTH`, gueltig mit Claim-Grenze |
| DEC-09 | Tracking | Program Runs fuer eindeutig abgegrenzte Teampiloten | Alte individuelle Instanzen konnten Kohorten vermischen | `CONFIRMED_FROM_CODE`, neu umgesetzt |
| DEC-10 | Tracking | Finaler Daily Save atomar und idempotent | Completion durfte nicht ohne Check-in entstehen | `CONFIRMED_FROM_CODE`, neu umgesetzt |
| DEC-11 | Infrastruktur | GitHub + eigenes Supabase + Vercel, Lovable nicht als Runtime-Abhaengigkeit | Hosting- und Plattformunabhaengigkeit | `CONFIRMED_FROM_BOTH`, aktueller Code zeigt eigenes Supabase-Projekt |
| DEC-12 | PWA | Kein App-Shell-Precache, minimaler Service Worker | Safari lieferte stale HTML/Chunks und Reload-Loops | `CONFIRMED_FROM_BOTH`, umgesetzt |
| DEC-13 | Push | Web Push bleibt; native iOS Push spaeter separat | Capacitor WebView ist nicht gleich Browser Web Push | `CONFIRMED_FROM_CODE`, gueltig |
| DEC-14 | App Store | Capacitor-Premium-WebView nutzt denselben `dist`-Build | Schneller iOS-Weg ohne Produktduplikation | `CONFIRMED_FROM_CODE`, gueltig |
| DEC-15 | AI | Keine lokale KI als aktueller Kern; zuerst Sprache und Produktursache verbessern | KI-Hilfe darf schlechte Grundsprache nicht kaschieren | `CONFIRMED_FROM_CHAT`, aktuell |
| DEC-16 | Journal | Voice optional, Tippen gleichwertig, keine wiederholten Voice-Hinweise | Ruhe und Professionalitaet | `CONFIRMED_FROM_BOTH`, umgesetzt |
| DEC-17 | Missed Days | Kompakter Rueckblick statt vollstaendiges Nachholen | Puenktlichkeit bleibt priorisiert, Kontext geht nicht verloren | `CONFIRMED_FROM_BOTH`, umgesetzt |
| DEC-18 | Launch | Kontrollierter Pilot vor Massenrollout | Qualitaet und Datenintegritaet zuerst | `CONFIRMED_FROM_BOTH`, gueltig |

Neubewertung ist noetig, wenn neue rechtliche Anforderungen, ein echtes Studiendesign, native App-Funktionen, andere Zielgruppen oder belastbare Pilotdaten die bisherigen Grenzen veraendern.
