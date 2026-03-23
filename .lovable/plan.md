
# "Zugang" Buttons → Registrierung verlinken

## Problem
- **Navbar**: "Zugang" Button hat keinen onClick → tut nichts
- **HeroSection**: "Zugang sichern" navigiert zu `/questionnaire` statt `/auth`
- **CTASection**: "Jetzt Zugang sichern" navigiert zu `/questionnaire` statt `/auth`

## Lösung
Alle drei Buttons auf `/auth` verlinken, damit die Registrierung/Login-Seite erscheint.

## Änderungen

| Datei | Was |
|-------|-----|
| `src/components/Navbar.tsx` | `useNavigate` importieren, `onClick={() => navigate("/auth")}` zum Button |
| `src/components/HeroSection.tsx` | Button-Navigation von `/questionnaire` → `/auth` |
| `src/components/CTASection.tsx` | Button-Navigation von `/questionnaire` → `/auth` |

Der Questionnaire wird dann nach der Registrierung im Dashboard-Flow gestartet, nicht direkt von der Landing Page.
