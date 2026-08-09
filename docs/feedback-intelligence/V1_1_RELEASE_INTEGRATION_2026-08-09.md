# V1.1 Release-Integration 2026-08-09

## Bedeutung

Der App-Store-/Pilot-Kandidat und die vollständige Feedback-Intelligence-Härtung sind in einem isolierten Release-Branch zusammengeführt. Diese Integration ist lokal vollständig geprüft, aber noch nicht für Production, echte Feedbackdaten oder App-Store-Auslieferung aktiviert.

## Integrierter Stand

- Release-Branch: `codex/v1-1-release-final-20260809`
- Integrationscommit: `773149fbcfee1be966ba176bd009de7c846c82d0`
- App-/Store-Basis: `403f72ecec7080233f5f4e5b5a0f6072e69d4863`
- Feedback-Producer: `79fca2016dcc4a93e37743bd377a20bc4b36aa4b`
- Keine Production-Migration, kein Credential, kein Netzwerkread und keine Gate-Aktivierung in diesem Integrationsschritt.

## Semantische Konfliktauflösung

Vier Byte-/Evidence-Konflikte wurden nicht pauschal mit `ours` oder `theirs` aufgelöst. Die jeweils aktuelle Producer-Evidence wurde erhalten und gegen den finalen kombinierten Stand erneut geprüft. Das umfasst Gateway-, Privilege-Audit- und Postdeploy-Manifeste sowie deren Validator-Test.

## Supply-Chain-Härtung und Repin

Der vollständige Audit fand eine moderate Vite-Schwachstelle. Vite wurde von 5.4.19 auf 6.4.3 aktualisiert; `npm audit` meldet danach null Schwachstellen.

Da `package.json` Teil des synthetischen Feedbackpakets ist, wurde der Package-Pin transparent aktualisiert:

- Manifest SHA-256: `714414378cce60f16058c533108e1fbc4479e62d5b71f8babe3ee93bd87ba906`
- Ursprüngliches Package SHA-256: `2750be372f447d2389f8d5405ef1daff3a45dcc358fae0120cf18411de0f2eb4`
- Release-Package SHA-256: `717008942dcc8750dbdca0da1ceb787f0766d11d844ed83bc51500b1cdfeaac4`
- Einzige Paketdatei mit neuen Bytes: `package.json`
- Feedback-, Consent-, Privacy-, Rechte-, Runtime- und synthetische Evidence-Dateien unverändert.

## Verifikation

- `npm run ci`: 128 Vitest-Dateien / 732 Tests grün.
- TypeScript, Production-Build und sämtliche SQL-/Security-Harnesses grün.
- App-Store-Static-Readiness grün.
- `npm audit`: 0 Schwachstellen.
- ESLint: 0 Fehler; 18 bereits vorhandene Warnungen.
- Xcode-Readiness: 9/9; unsigned Simulator-Build grün.
- Der Embedded-Production-Check bleibt erwartungsgemäß fail-closed, weil in diesem isolierten Lauf keine Production-Werte oder Secrets gelesen wurden.

## Geschlossene Gates

RewirePerform-`main` bleibt geschlossen, weil ein Merge automatisch Production berühren kann. Ebenfalls geschlossen bleiben Production-Deployment, echte Feedbackreads, Credentials, Privacy-/Legal-/Minor-Aktivierung und App-Store-Auslieferung. Ein Draft-PR darf CI und Preview sichern, autorisiert aber keine dieser Aktionen.
