# Risikomatrix

| Stufe | Bedeutung | Beispiele | Agentenautonomie |
|---|---|---|---|
| R1 | reine Wissens-/Dokuarbeit | Analyse, Pack, Quellenkarte | selbststaendig im vereinbarten Scope |
| R2 | lokal reversible Produktarbeit | Copy, isolierter UI-Polish, Tests | nach Umsetzungsauftrag; kein Push ohne Freigabe |
| R3 | kernflow- oder release-relevant | Daily Flow, Assessments, PWA, Push, Capacitor, Performance | Plan, breite Tests, Mahle vor Release |
| R4 | Daten-/Privacy-/Produktionsrisiko | Auth, RLS, Migration, Consent, Coach-Daten, Exporte, Production | vorherige ausdrueckliche Freigabe zwingend |
| R5 | rechtlich/wissenschaftlich/irreversibel | Loeschung echter Daten, Gesundheitsclaim, Minderjaehrigen-Consent, Store-Rechtsangaben | Mahle plus passende Fach-/Rechtspruefung |

## Bereichsmatrix

| Bereich | Standardrisiko | Stop-Bedingung |
|---|---:|---|
| Programmsprache | R2/R3 | fachlicher Mechanismus oder Claim wuerde sich aendern |
| Landing/UI | R2 | Auth-/Trackingverhalten betroffen |
| Daily Tracking | R3/R4 | DB-Vertrag oder Completion-Integritaet betroffen |
| Coach Dashboard | R3/R4 | individuelle sensitive Daten koennten sichtbar werden |
| Admin Evidence | R3/R4 | Export-/Consent-/Claim-Grenze aendert sich |
| Auth/Rollen/Teamcodes | R4 | immer vor Mutation freigeben |
| Supabase Migration/RLS | R4 | immer vor Apply freigeben |
| Production-Daten | R5 | kein Write/Delete ohne schriftlichen Scope und Rollback |
| App Store Privacy | R5 | keine finale Aussage ohne Ist-Abgleich |
| Push/Web/PWA | R3 | VAPID/cron/native Verhalten betroffen |
| Payments | R5 | nicht vorhanden; Architektur- und Rechtsentscheidung noetig |
| MahleOS-Verbindung | R3/R4 | Schreibzugriff oder automatische Aktionen geplant |

## Freigaberegel

Eine niedrigere technische Aenderung wird automatisch hochgestuft, sobald sie sensible Daten, Minderjaehrige, Rollen, externe Systeme, produktive Nutzer oder wissenschaftliche Aussagen beruehrt.

