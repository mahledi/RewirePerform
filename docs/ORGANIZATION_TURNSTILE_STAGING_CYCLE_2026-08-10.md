# Organization Inquiry Turnstile – Staging-Zyklus 2026-08-10

## Status

`STAGING_POSITIVE_E2E_VERIFIED_FAIL_CLOSED`

Dieser Nachweis gilt ausschließlich für das getrennte Supabase-Projekt
`zbeswjipayspgvcipzmx` (RewirePerform Staging). Production, App Store,
TestFlight, echte Nutzerdaten und Feedback Intelligence wurden nicht geöffnet.

## Gepinnte Ausgangslage

- getesteter lokaler Apple-/V1.1-Integrationsstand: `f23aac2`
- Edge Function: `submit-organization-access-request`, Version 5, `ACTIVE`
- öffentliche Cloudflare-Sitekey-ID: `0x4AAAAAAEL5OS-bpC7V7Eh_`
- Managed Turnstile, keine Pre-Clearance
- erlaubte Staging-Origin: exakt `http://localhost:4173`
- Datenschutzhinweis der Anfrage: exakt
  `organization-inquiry-v1.1-2026-08-10`
- private Turnstile-Werte sind nicht in diesem Nachweis enthalten

## Secret-Assurance nach Rückbau

| Name | SHA-256 | Zustand |
| --- | --- | --- |
| `TURNSTILE_SECRET_KEY` | `f187f4d1f24b3ee326d76610238bb2b1f344981abda22db238e6bb1ea5744def` | in Staging vorhanden |
| `ORGANIZATION_INQUIRY_ALLOWED_ORIGINS` | `cbb1830a69a59cc2bf204885b1460df689a05b8790aea547f19fcf45910274c8` | exakt `http://localhost:4173` |
| `ORGANIZATION_INQUIRY_PUBLIC_ENABLED` | `fcbcf165908dd18a9e49f7ff27810176db8e9f63b4352213741664245224f8aa` | exakt `false` |

## Positiver Einmalzyklus

1. Ein frischer Staging-Webbuild wurde aus dem aktuellen V1.1-Quellstand mit
   Staging-Projekt, öffentlichem Publishable Key und öffentlichem
   Turnstile-Sitekey erzeugt.
2. Das öffentliche Staging-Gate wurde ausschließlich für den Test temporär auf
   `true` gesetzt.
3. Der nicht schreibende Preflight mit erlaubter Origin und ohne
   Turnstile-Token lieferte erwartungsgemäß `400 invalid_request`.
4. Der Managed-Check aktivierte den Absende-Button ohne sichtbare Challenge.
5. Genau ein synthetischer Browser-Submit wurde ausgelöst und erfolgreich
   angenommen.
6. Die Datenbank enthielt danach exakt eine Anfrage und exakt ein
   `submitted`-Event. Es entstanden keine Organisation, kein Team, keine
   Organisations- oder Teammitgliedschaft und keine Einladung.
7. Exakt diese synthetische Anfrage wurde gelöscht; das Event wurde durch die
   vorhandene Löschkaskade mit entfernt.
8. Alle Zähler für den Marker waren anschließend wieder `0`.
9. Das öffentliche Staging-Gate wurde wieder auf `false` gesetzt. Der erneute
   HTTP-Aufruf lieferte `503 service_not_available`.

Synthetischer Marker:

- Organisation: `SYNTHETIC-V11-STAGING-20260810-1836`
- E-Mail: `synthetic-v11-one-shot-20260810-1836@example.invalid`
- Referenz: `RP-E94C44AEF7`

## Verifizierter Datenzustand vor der Löschung

| Objekt | Anzahl |
| --- | ---: |
| Organisationsanfrage | 1 |
| `submitted`-Event | 1 |
| Organisation | 0 |
| Team | 0 |
| Organisationsmitgliedschaft | 0 |
| Teammitarbeit | 0 |
| Einladung | 0 |

Die Anfrage war `single_team`, `submitted`, Quelle `web` und trug exakt die
Datenschutzversion `organization-inquiry-v1.1-2026-08-10`.

## Verifizierter Nullzustand nach der Löschung

| Objekt | Anzahl |
| --- | ---: |
| Anfrage des exakten Markers | 0 |
| Event der exakten Anfrage | 0 |
| Organisation aus der exakten Anfrage | 0 |
| beliebiger Marker dieses synthetischen Testmusters | 0 |

Es wurden keine echten Personen- oder Organisationsdaten gelesen. Es wurde
keine echte Anfrage bearbeitet, freigegeben oder abgelehnt.

## Release-Grenze

Dieser Zyklus beweist den positiven, botgeschützten Staging-Pfad und dessen
vollständigen Rückbau. Er aktiviert nicht die öffentliche Production-Annahme.
Production benötigt weiterhin eine separate Freigabe für die exakten
Production-Secrets, Origins, Migrationen und den finalen Datenschutz-/Store-
Abgleich.
