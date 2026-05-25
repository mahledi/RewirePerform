# Echtes Hero-Bild als Social-Preview

## Problem
Aktuell zeigt `public/og-image.png` ein KI-generiertes Bild — anderer Athlet, andere Komposition als die echte Startseite. Du willst die echte Ansicht (alles oberhalb von "Zugang sichern").

## Lösung

### 1. Echten Screenshot der Live-Seite aufnehmen
- `browser--navigate_to_url` → `https://rewireperform.com`
- Viewport auf 1200×630 setzen (Standard-OG-Format, deckt Hero bis knapp vor die Buttons ab)
- Warten bis Hero-Bild + Fonts geladen sind (poll bis `img[alt*="Athlet"]` complete ist)
- `browser--screenshot` → speichern als `public/og-image.png` (überschreibt das KI-Bild)

Falls 1200×630 den Bereich "über Zugang sichern" nicht sauber framed: Viewport auf 1200×800 und auf 1200×630 zentriert zuschneiden (ImageMagick via `nix run nixpkgs#imagemagick`).

### 2. Cache-Bust
`index.html` referenziert das Bild bereits mit `?v=2`. Nach dem Tausch auf `?v=3` hochzählen, damit WhatsApp/iMessage/LinkedIn die neue Version ziehen.

## Nicht angefasst
- Einladungs-Nachrichten (Text + Link bleiben wie zuletzt umgesetzt)
- Auth-Deeplink-Logik
- Landingpage-Code

## Hinweis zu Social-Previews
WhatsApp/iMessage/LinkedIn cachen OG-Bilder aggressiv pro URL. Der `?v=3`-Trick erzwingt Neuladen. Erst nach **Publish** wird das neue Bild live (Preview-URL wird von Social-Crawlern nicht gelesen).
