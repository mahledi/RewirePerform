# Review-Handoff: Minderjaehrigen- und Guardian-Flow

Stand: 18. Juli 2026

Branch: `codex/minor-guardian-flow-20260718`

Worktree: `/Users/NeuroRewiremahle/Social Media/RewirePerform/worktrees/minor-guardian-flow-20260718`

Basis: `ed46da009915`

## Review-Ziel

Unabhaengig pruefen, ob der Branch einen technisch vollstaendigen, fail-closed Minderjaehrigen-Flow liefert, ohne Produktion, Supabase oder reale Guardian-Adressen veraendert zu haben.

## Harte Invarianten

- Verein und Trainer haben keine Rolle im Guardian-Flow und erhalten keine Guardian-Kontaktdaten oder Entscheidungen.
- Unter 16 braucht positive Guardian-Entscheidung und eigene Athletenzustimmung fuer dieselbe Policy-Version.
- Mit 16 oder 17 entscheidet der Athlet im Deutschland-Flow selbst; kein Guardian-Kontakt.
- Produkttracking beginnt erst nach Produktfreigabe und bleibt vom freiwilligen Datenbeitrag getrennt.
- Das aktuelle Transfer-Evidence-Protokoll sammelt keine Minderjaehrigendaten.
- Auch bei Erwachsenen erzeugt die neue Alters-Selbstauskunft keine Transfer-Evidence-Freigabe; die bestehende separate Admin-Verifikation bleibt unveraendert erforderlich.
- Coach-Einzelansicht bleibt auf operative Aktivitaet beschraenkt; private Antworten und Einzelwerte bleiben ausgeschlossen.
- Teamaggregate filtern Consent und aktuelle Autorisierung vor der n>=5-Schwelle.
- Guardian-E-Mails sind rein transaktional; keine Werbung, externen Bilder oder Tracking-Pixel.
- Guardian-Adresse verschluesselt; Token nur gehasht; keine Payload- oder PII-Logs.
- Migration setzt Enforcement standardmaessig auf `false`; Aktivierung braucht einen erfolgreichen Preflight.
- Widerruf sperrt neue geschuetzte Writes serverseitig.
- Kein Push, Merge, Deploy, Supabase-Migrationslauf oder echter E-Mail-Versand aus diesem Branch.

## Primaere Dateien

- `supabase/migrations/20260718122735_minor_guardian_authorization_v1.sql`
- `supabase/functions/_shared/minorGuardian.ts`
- `supabase/functions/minor-guardian-user/index.ts`
- `supabase/functions/minor-guardian-public/index.ts`
- `supabase/functions/team-mental-state/index.ts`
- `src/content/minorPolicy.ts`
- `src/contexts/MinorAuthorizationContext.tsx`
- `src/components/minor-consent/MinorAuthorizationGate.tsx`
- `src/pages/MinorConsent.tsx`
- `src/pages/GuardianDecision.tsx`
- `src/pages/AccountSettings.tsx`
- `src/pages/Privacy.tsx`
- `src/pages/Imprint.tsx`
- `scripts/verify-minor-guardian-sql.mjs`
- `scripts/verify-minor-guardian-preview.mjs`
- `docs/MINOR_GUARDIAN_FLOW_IMPLEMENTATION_SPEC_2026-07-18.md`
- `docs/MINOR_GUARDIAN_LEGAL_REVIEW_PACKET_2026-07-18.md`

## Reproduzierbare Pruefungen

```bash
npm ci
npm run typecheck
npm test
npm run test:evidence:sql
npm run test:minor:sql
npx --yes deno check --no-lock --node-modules-dir=none \
  supabase/functions/_shared/minorGuardian.ts \
  supabase/functions/minor-guardian-user/index.ts \
  supabase/functions/minor-guardian-public/index.ts \
  supabase/functions/team-mental-state/index.ts
npm run test:minor-preview
VITE_SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co \
VITE_SUPABASE_PUBLISHABLE_KEY=test-publishable-key \
VITE_SUPABASE_PROJECT_ID=abcdefghijklmnopqrst \
VITE_APP_ENV=production npm run build
npm run app:verify
npm run app:verify:xcode
npm run lint
npm audit --omit=dev
git diff --check
```

Die PGlite-Pruefung fuehrt die komplette Migration in isoliertem PostgreSQL aus. Sie testet Adult-, 16/17- und Unter-16-Zustaende, Guardian-Entscheidung, eigene Zustimmung, Datenbeitrag, Evidence-Trennung, Preflight, Enforcement, Schreibsperren, Guardian-Widerruf, Rollenrechte und Retention.

Die Browserpruefung rendert alle Review-Zustaende in Desktop-Chromium und iPhone-WebKit, kontrolliert horizontalen Overflow, Page-/Console-Errors und unerwartete Backendzugriffe und schreibt lokale Screenshots nach `test-results/minor-guardian-preview/`.

## Aktueller lokaler Ergebnisstand

Abnahme vom 18. Juli 2026 auf diesem Branch:

- `npm run ci`: PASS; Produktionsbuild, 43 Testdateien und 227 Tests, Evidence-SQL, Minderjaehrigen-SQL und statische App-Store-Pruefung erfolgreich;
- Deno-Typecheck aller vier betroffenen Edge-Function-Dateien: PASS;
- `npm run privacy:verify`: 14/14 PASS, keine Invariantenfehler und keine vom Skript erkannten Release-Blocker;
- Chromium- und iPhone-WebKit-Pruefung: PASS, kein horizontaler Overflow, keine Page-/Console-Errors und keine unerwarteten Backendzugriffe;
- strikte Produktions-/Edge-Umgebungsvalidierung: PASS;
- `npm run app:verify:xcode`: 8/8 Basischecks PASS; Xcode 26.6, iOS-26.5-SDK, Simulator-Runtime und App-Scheme sind lokal verfuegbar; Signing und Archivierung sind damit noch nicht freigegeben;
- `npm audit --omit=dev`: 0 bekannte produktive Schwachstellen;
- `npm run lint`: 0 Fehler, 15 bestehende Repository-Warnungen;
- voller Development-Audit: zwei Vite-/esbuild-Hinweise; die angebotene Behebung erzwingt ein separates Vite-Major-Upgrade und ist nicht Bestandteil dieses isolierten Blocks.

Bei einem kuenstlich parallelen Lastlauf blieb einmalig ein bestehender Recovery-E-Mail-Test im Ladezustand. Der unveraenderte Test bestand direkt danach isoliert mit 8/8 sowie im abschliessenden, allein ausgefuehrten Gesamt-CI. Der E-Mail-Flow-Agent sollte diese Timing-Beobachtung bei seiner Integration mitpruefen.

## Besondere Review-Fragen

1. Decken die Datenbank-Trigger alle personenbezogenen Produkt-Write-Pfade ab, auch kuenftige RPCs?
2. Bleibt der Rollout bei bestehenden Athleten sicher, bis Enforcement nach dem Preflight explizit aktiviert wird?
3. Ist die Trennung zwischen Produkttracking, freiwilligem Datenbeitrag und deaktivierter Minderjaehrigen-Evidence ueberall konsistent?
4. Kann eine Race Condition zwischen Save und Widerruf noch einen nachlaufenden Write erlauben?
5. Sind Token-, Rate-Limit-, Origin-, Verschluesselungs- und Retention-Regeln ausreichend und korrekt operationalisiert?
6. Entspricht die Trainer-Sicht exakt dem dokumentierten Feldvertrag?
7. Sind Guardian- und Athletensprache sachlich, sportartenneutral, verstaendlich und frei von Druck?
8. Welche Punkte aus dem Rechtspruefpaket muessen vor dem ersten realen 15-Jaehrigen geaendert werden?

## Bekannte externe Gates

- qualifizierte deutsche Rechts-/Privacy-Pruefung;
- echte Supabase-Staging-Migration mit RLS/RPC-/Race-Tests;
- echte Resend-Zustellung sowie bestaetigtes Open-/Link-Tracking-Aus;
- Backup-Rotation und Restore-Runbook;
- Xcode-Archiv, echter iPhone-Test, VoiceOver, Dynamic Type und Offline;
- App Store Connect Privacy, Altersfreigabe und Review Notes gegen finalen Binary-Report.

Ein positiver lokaler Review ist keine produktive Freigabe.
