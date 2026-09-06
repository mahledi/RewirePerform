# Jarvis Consumer Acceptance – Feedback Intelligence 0.2 Draft

Stand: 2026-08-05
Consumer-Ergebnis: `ACCEPTED_LOCAL_UNSIGNED_DE_ONLY_NOT_ACTIVATED`
Aktivierung: `AWAITING_PRODUCER_PACKAGE`

## Deutschland-only Scope-Amendment

Jarvis hat die ersetzende 10-Dateien-Fassung lokal und bytegenau bestätigt. Die
frühere 9-Dateien-Fassung ist verworfen.

- Manifest SHA-256: `e209bd40d239fd9e8a4d84419b25c2cd1ae081bdc81e8c57d89060fd108e03fe`
- Package SHA-256: `faf2101dd64f2e0d215db4dd2933c19b69c76bdc0a76526e2144778f74619537`
- Machine-Export SHA-256: `95f6ea0f50607ff96cb28fe9d532e94a4c294eaa625239bf061637c6ac8c5c3a`
- Länder-Policy SHA-256: `0898a586f602b02d1ac5137c3f01bd2f2a3b6f6b6b88eb9f36548d266683bcde`
- Alle zehn Dateihashes stimmen.
- Alle vier Exportquellen filtern hart auf `DE`.
- Der synthetische Producer-Test exportiert fünf DE-Items und schließt ein AT-Subject aus.
- 25 fokussierte Consumer-Contract-/Scope-/Privacy-Tests grün.
- 1.265 vollständige Jarvis-Tests grün.
- 20 Cloud-Runner-Tests, TypeScript und Deployment-Dry-Run grün.
- Lokaler Consumer-Commit: `f923c8248078e4b0f416642b1bc804ac7830b41c`.

`AWAITING_PRODUCER_PACKAGE` und alle Real-Read-Gates bleiben geschlossen. Es gab
keinen Push, Merge, Deployment, Credential, Netzwerktransport oder echten Read.

## Frühere Byte-Prüfung

- Producer-Manifest SHA-256: `50b4c4ed95ccdd55367d4f1161075180c648d8d89d25e44582d6ff2f66d642d0`
- Producer-Paket SHA-256: `a35376a71ffd3c9554972ab63a01a48adaafa5f93d4fed7515368d0c880ece72`
- Alle neun im Manifest aufgeführten Dateien wurden vom Consumer bytegenau bestätigt.
- Der Producer-Envelope wird ohne Feldumbenennung synthetisch validiert.

## Explizites Consumer-Delta

Der bisherige Consumer war in zwei zulässigen Fällen zu streng:

1. Eine `feedback_reference` gehört zu einem Submit und darf deshalb über mehrere Fragen sowie mehrere Optionen einer Multi-Select-Antwort wiederholt werden.
2. Ein widerrufener Consent darf seinen minimierten historischen Receipt-Nachweis behalten; `comment` bleibt dabei zwingend ausgeschlossen und `valid_at_export` falsch.

Jarvis hat ausschließlich seinen isolierten Validator angepasst. Jede andere Referenz-, Consent-, Schema- oder Privacy-Abweichung bleibt fail-closed.

## Consumer-Nachweis

- 23 fokussierte Contract-/Privacy-Tests grün.
- 1.263 vollständige Jarvis-Tests grün.
- Producer-SQL-Vertrag read-only grün.
- Consumer-Commit: `a4115143ea42cca13182f1b0447461666fa87052`.
- Kein Push, Merge, Deployment, Credential, Netzwerktransport oder echter Read.

## Unverändert offene Gates

- unveränderlicher, freigegebener und signierter Producer-Commit;
- feste Rohtext-Retention plus automatisierter Löschlauf;
- Legal-/Privacy- und App-Store-Freigabe;
- Deutschland-Minor-/Guardian-Entscheidungen; Nicht-DE bleibt `out_of_scope`;
- benannter Machine-/KI-Processor oder bestätigter Verzicht auf echten Text-Export;
- dedizierter Machine-Actor/Credential;
- synthetischer Staging-Read und Native-Device-Validierung;
- gesonderte Push-/Merge-/Deployment-/Production-Freigaben.

## Abhängigkeitssicherheit

Die transitive `brace-expansion`- und `fast-uri`-Kette wurde auf gepatchte Versionen aktualisiert. Der Production-Audit enthält danach keine High- oder Critical-Funde; zwei moderate React-Router-Hinweise bleiben und verlangen laut npm eine gesondert zu testende Major-Migration auf React Router 7. Der vollständige Development-Audit enthält zusätzlich einen High-Hinweis für den lokalen Vite-Development-Server; dessen angebotene Behebung ist ebenfalls ein Major-Upgrade. Diese Upgrades sind ein eigener Release-Hardening-Block und wurden nicht ungeprüft in den Feedback-Branch gezogen.
