# App Store Screenshot Storyboard V1

Status: **DRAFT — OWNER COPY AND VISUAL APPROVAL REQUIRED**

Source build: `origin/main` at
`3fb868b3ab16d6686cb472e128efb4042e43a939`.

This document defines the technical and visual production frame. It does not
approve final marketing claims, final copy, or upload to App Store Connect.

## Product-page intent

The screenshots form one short visual story rather than a collection of raw
screen captures:

- athlete experience first;
- real RewirePerform UI inside a cinematic frame derived from the approved
  first-run design language;
- one clear benefit per image;
- the final two images may introduce the coach experience;
- no implication that V1 is fully individualized;
- no efficacy, medical, diagnostic, causal, or guaranteed brain-change claim.

## Locked visual system

- Background: RewirePerform Midnight `#0D0E12`.
- Primary accent: Rewire green `#2EAD89`.
- Primary text: Off-white `#EEF0F2`.
- Use only the locked B2 Normal R logo asset. Do not redraw, recolor, crop,
  animate, or add glow, shadow, gradient, or 3D effects to the mark.
- The real app interface remains the dominant visual element.
- Headline: one short statement, normally no more than two lines.
- Supporting line: optional and limited to one concise sentence.
- Use restrained depth, green ambient light, and the same calm premium
  character as the approved first-run experience.
- Do not add generic athlete photography merely as decoration.

## Required production canvases

Create purpose-built layouts rather than stretching one family into the other:

- iPhone 6.9-inch portrait: one accepted Apple size, preferably
  `1320 x 2868`.
- iPad 13-inch portrait: one accepted Apple size, preferably
  `2064 x 2752`.
- PNG, RGB, no alpha channel.

The first three images must communicate the product even when seen alone in
App Store search.

Current Apple validation:

- Apple's official screenshot specification accepts `1320 x 2868` for a
  6.9-inch iPhone portrait screenshot and `2064 x 2752` for a 13-inch iPad
  portrait screenshot.
- Apple permits one to ten screenshots in PNG, JPEG, or JPG format and rejects
  alpha channels/transparency.
- App Review Guideline 2.3.3 requires screenshots to show the app in use and
  explicitly permits text and image overlays. Every draft therefore keeps a
  real product surface as the central visual instead of using title art alone.
- Reference:
  <https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/>
- App Review Guidelines:
  <https://developer.apple.com/app-store/review/guidelines/#accurate-metadata>

## Proposed ten-image story

All copy below is a candidate and requires Mahle's explicit approval before
final rendering.

### 1. Core idea — athlete Dashboard / Heute

Candidate headline:

> Mentales Training, neu gedacht.

Candidate support:

> Nach Prinzipien von Lernen und Neuroplastizität — strukturiert für deinen Sportalltag.

UI source:

- authenticated athlete Dashboard;
- current program day;
- visible primary action;
- no real name or identifying content.

Truth boundary:

- describes the design principles of the system;
- does not claim proven efficacy, guaranteed neuroplastic change, or a medical
  outcome.

### 2. Daily system — Science Bite and real tasks

Candidate headline:

> Wissen wird zur Anwendung.

Candidate support:

> Verstehen. Konkret üben. Wiederholen. Reflektieren.

UI source:

- real Science Bite and real practical tasks in a controlled two-screen
  composition;
- no editorial placeholders or private answer content.

### 3. Calendar context — Plan

Candidate headline:

> 56 Tage. Ein klarer Rhythmus.

Candidate support:

> Training, Wettkampf und Regeneration in einer gemeinsamen Linie.

UI source:

- real Plan tab;
- weekly strip;
- daily timeline;
- training, competition, and rest context where naturally present.

Truth boundary:

- may show the existing calendar connection;
- must not claim full personalization or automatic individual adaptation.

### 4. Progress — Entwicklung

Candidate headline:

> Sieh, wie konsequent du dranbleibst.

Candidate support:

> Programmtage, Serien und Anwendungen — ohne Bewertung deiner Person.

UI source:

- real Development tab;
- current day out of 56;
- adherence, streak, active applications, and phase progress;
- no psychological score or raw assessment answer.

### 5. Transfer — Pre-Training

Candidate headline:

> Dein Fokus, wenn es zählt.

Candidate support:

> Eine klare mentale Routine für Training und Wettkampf.

UI source:

- real Pre-Training experience;
- sport-neutral cue and action;
- no phrase such as "mit auf den Platz".

### 6. Reflection and privacy — Journal

Candidate headline:

> Reflektieren — und privat bleiben.

Candidate support:

> Deine Antworten und Journaltexte bleiben außerhalb der Coach-Ansicht.

UI source:

- real Journal structure;
- fictional, non-sensitive sample text only if text is needed;
- prefer empty or neutral structured fields over realistic personal content.

### 7. Measurement network — 56-day path

Candidate headline:

> Nicht ein Test. Ein Verlauf.

Candidate support:

> Tägliche Praxis und drei Messfenster machen deinen 56-Tage-Weg sichtbar.

UI source:

- real first-run measurement explanation;
- daily practice, three measurement windows and optional team review structure;
- no personal scores, raw answers or efficacy claim.

### 8. Entry model — Solo and Team

Candidate headline:

> Solo oder im Team.

Candidate support:

> Starte selbstständig oder verbinde dich mit deinem Teamcode.

UI source:

- real first-run Solo/Team decision;
- real Team-code requirement may be suggested but no usable code is shown.

### 9. Coach overview — Coach Dashboard

Candidate headline:

> Ein Team. Ein gemeinsamer Rhythmus.

Candidate support:

> Aktivität und Umsetzung im Überblick — ohne private Antworten.

UI source:

- real current Coach Dashboard;
- synthetic team and athlete labels;
- status and privacy-safe aggregate information only.

Truth boundary:

- no selection, talent, starting-lineup, career, or performance recommendation;
- no individual psychological interpretation.

### 10. Coach privacy boundary — team structure

Candidate headline:

> Überblick für Coaches. Privates bleibt privat.

Candidate support:

> Teamstatus sehen — ohne private Journaltexte oder persönliche Freitexte.

UI source:

- real privacy-safe coach status surface;
- no private athlete material;
- no individual coach score in a team summary.

## Data and capture rules

- Use only dedicated synthetic App Review or screenshot accounts.
- Never show a real athlete, coach, club, email address, Team code, access
  token, journal entry, free-text answer, or notification content.
- Freeze locale to German and appearance to the production dark theme.
- Use a coherent synthetic date, program day, activity state, and team state.
- Capture the native app without Safari or browser chrome.
- Remove loading spinners, keyboards, permission prompts, toasts, debug
  indicators, and stale offline banners before capture.
- Preserve truthful empty states where production data is unavailable; never
  invent a feature to fill a screenshot.

## Approval gates

1. Mahle approves the ten-image order or requests removals.
2. Mahle approves every headline and support line.
3. A technical review maps every statement to real V1 behavior.
4. Synthetic capture states are reviewed for privacy and truthfulness.
5. iPhone and iPad drafts are visually inspected at native resolution.
6. Mahle gives final visual approval before any App Store Connect upload.
