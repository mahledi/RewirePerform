# Mobile Hero: Scroll-Hint (Peek + Pfeil)

Nur Mobile. Desktop bleibt unverändert.

## Ziel
Beim Einloggen / Landen auf der Startseite soll auf Mobile sofort klar sein: hier geht es weiter nach unten — ohne dass der Hero unruhig oder „self-made" wirkt.

## Was geändert wird

**Datei:** `src/components/HeroSection.tsx` (einzige Datei)

### 1. Hero-Höhe (Section-Peek)
- Aktuell: `min-h-screen`
- Neu: `min-h-[88svh] md:min-h-screen`
- Wirkung: Auf Mobile ragt der obere Rand der nächsten Section (`WhySection`) ca. 12 % ins Viewport — klassisches „Content peek"-Signal. `svh` statt `vh` verhindert das iOS-URL-Bar-Springen. Desktop bleibt 100vh.

### 2. Animierter Scroll-Indikator (Mobile only)
Neues Element am unteren Hero-Rand, oberhalb des bestehenden `bg-gradient-to-t`-Fades, sichtbar nur `< md`:

- Position: `absolute bottom-6 left-1/2 -translate-x-1/2`, `z-20`, `md:hidden`
- Inhalt:
  - Mikro-Label `Mehr erfahren` in `text-[11px] uppercase tracking-[0.18em] text-muted-foreground`
  - `ChevronDown`-Icon (lucide-react, bereits verfügbar), `w-4 h-4 text-primary/80`
- Animation: sanftes vertikales Bouncen des Icons (2 px, 1.8s loop, ease-in-out), respektiert `prefers-reduced-motion` → Animation aus.
- Interaktion: `<button>` mit `onClick` → smooth-scroll zu `#why` via `document.getElementById('why')?.scrollIntoView({ behavior: 'smooth', block: 'start' })`
- Erscheinen: Framer-Motion fade-in mit `delay: 0.6`, damit es nach den CTAs kommt und nicht ablenkt.
- Fade-out beim Scrollen: optional, sobald `window.scrollY > 80` → `opacity-0` (verhindert, dass der Pfeil später noch sichtbar über Hero schwebt). Nur wenn schlank umsetzbar mit einem `useEffect` + `useState`.

### 3. CTA-Reihenfolge unverändert
Beide Buttons bleiben wie sie sind — der Scroll-Pfad wird nur durch den Indikator + Peek kommuniziert, nicht durch Umbau der CTAs. So bleibt die Hierarchie clean.

## Technische Details

- Bounce-Animation: inline via `style={{ animation: 'hero-bounce 1.8s ease-in-out infinite' }}` oder über eine kleine Keyframe-Erweiterung. Vorschlag: lokal mit Framer-Motion `animate={{ y: [0, 4, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}` — keine Tailwind-Config-Änderung nötig, konsistent mit den anderen Motion-Komponenten im Hero.
- Reduced-Motion: Framer respektiert das automatisch über `useReducedMotion()`-Hook.
- Bestehende `#why`-ID auf `Index.tsx` (`<div id="why">`) ist bereits vorhanden — kein Routing/IDs-Setup nötig.
- Keine neuen Dependencies, keine Änderung an Navbar, keine Touch von Desktop-Styles.

## Was NICHT angefasst wird
- Desktop-Hero (bleibt `min-h-screen`, kein Pfeil)
- Navbar (Mobile/Desktop)
- CTAs, Hero-Bild, Headline, Subtitle
- Andere Sections

## Verifikation
- Mobile (375 / 390 px): Beim Laden ist Pfeil sichtbar, oberer Rand der nächsten Section ragt knapp ins Bild, Tap auf Pfeil scrollt smooth zu `#why`.
- Desktop (≥768 px): visuell identisch zu jetzt.
- `prefers-reduced-motion`: Pfeil sichtbar, kein Bouncen.
