# Risk Matrix

| Stufe | Bedeutung | Beispiele | Freigabe |
|---|---|---|---|
| R1 | read-only, Dokumentation | Analyse, Bericht, Regelpflege | im Task-Scope autonom |
| R2 | lokal reversibel | Copy, isolierter UI-Polish, lokale Tests | ausdruecklicher Umsetzungsauftrag; kein Push |
| R3 | Kernflow/Release | Daily Flow, Assessment, PWA, Push, Capacitor | Plan, breite Tests, Mahle vor Release |
| R4 | Daten/Privacy/Production | Auth, RLS, Migration, Consent, Coach-Daten, Exporte | vorherige Mahle-Freigabe zwingend |
| R5 | rechtlich/wissenschaftlich/irreversibel | echte Loeschung, Minderjaehrigenrecht, Endclaims, Store-Rechtsangaben | Mahle plus passende Fachpruefung |

Eine Aufgabe wird automatisch auf R4/R5 hochgestuft, sobald sie sensible Daten, Rollen, Minderjaehrige, externe Systeme, Production oder wissenschaftliche Endbedeutung beruehrt.

Die fuenf offenen Blocking Decisions sperren alle betroffenen R4/R5-Aktionen. R1/R2 bleiben erlaubt, solange sie keine sensitive Vorentscheidung treffen.

