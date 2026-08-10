# RewirePerform 1.1 – App-Store-RC-Handoff vom 10. August 2026

## Ziel B

Eine pilotfähige Version 1.1, die Athleten und Coaches vor der Anmeldung
wahrheitsgetreu in ihren jeweiligen Bereich führt, den finalen 56-Tage-Ablauf
enthält, strukturierte Feedback-Checkpoints sicher verarbeitet, professionelle
Team-/Coach-Verbindungen bereitstellt und den freigegebenen Datenumfang intern
über Jarvis auswertbar macht.

## Belegter Stand A

### Produkt und Einstieg

- Vor der Anmeldung wird ausschließlich die gewünschte Einführung **Athlet**
  oder **Coach** gewählt. Diese UX-Auswahl vergibt keine technische Rolle.
- Athleten sehen den freigegebenen zehnteiligen Athleten-Flug und gelangen
  anschließend in Solo-Registrierung oder Teambeitritt. Ein Teamcode bleibt
  erhalten.
- Coaches sehen einen eigenen zehnteiligen, ausschließlich auf realen
  Funktionen basierenden Flug. Bestehende Zugänge führen zum Login;
  Team-/Organisationsstarts zur persönlichen Anfrage; Co-Coach-Beitritte nur
  über eine persönliche, E-Mail-gebundene Einladung.
- Rollen- und Teamzugriffe bleiben serverseitig geprüft. Es gibt keinen
  öffentlichen Coach-Code und keine automatische Coach-Rolle.
- Die persönliche Coach-Einladung ist als strenger Universal Link
  `/organization/invite?token=<64 Zeichen>` vorbereitet.

### Inhalt und Feedback

- Der finale 56-Tage-Inhalt ist im echten Daily-Flow-Pfad integriert.
- Rest Days enthalten zwei Minuten ruhige 4/6-Atmung und drei klare
  Visualisierungsphasen; danach geht es zurück zum Dashboard.
- Strukturierte Feedback-Checkpoints liegen an Tag 10, 24, 39 und 55.
- Die sichtbare Terminologie ist in Version 1.1.2 einheitlich
  **Visualisierung**. IDs, Skalen, Antwortoptionen, Reihenfolge, Consent,
  Guardian-Regeln und Transfer-Pulse-Semantik wurden dabei nicht verändert.
- Das Semantikpaket ist als v0.3.3 und das Machine-Gateway gegen genau diese
  Bytes neu gepinnt. Frühere v0.3.2-Staging-Evidence autorisiert v0.3.3 nicht.

### Verbindungen und Website

- Athleten- und Coach-Einladungen besitzen getrennte, professionelle
  Share-Texte und Social-Preview-Seiten.
- Website-Fallback und App-Store-Banner sind lokal integriert.
- Die Website leitet Menschen ohne installierte App sicher weiter; installierte
  iOS-Apps erhalten den Universal Link.
- Kurze Einzelteam-Anfrage und ausführliche Organisationsanfrage sind getrennt.
- Co-Coach-Einladungen sind einmalig, sieben Tage gültig und an die bestätigte
  E-Mail-Adresse gebunden.
- Live-Audit am 10. August: App-Store-Eintrag und Website antworten mit HTTP
  200. Die aktuelle Production-Website liefert für WhatsApp-Teamlinks aber noch
  die generische Website-Vorschau; der Smart-App-Banner und der
  `/organization/invite`-AASA-Pfad sind noch nicht aus dem lokalen 1.1-Stand
  ausgerollt.

### Lokale Nachweise auf der integrierten Codebasis `0a459a5`

- `npm run ci`: 142 von 142 Testdateien und 799 von 799 Tests grün.
- `npm run test:e2e`: 81 bestanden, 4 plattformbedingt übersprungen, 0 Fehler;
  Desktop, iPhone Hoch-/Querformat und iPad Hoch-/Querformat.
- Production-Webbuild, sämtliche Feedback-, Guardian-, Minor-, Privacy-,
  Access-, Deletion-, App-Store- und SQL-Gates grün.
- Production-Target `bqsbxesmybthwtxmowfz`, Capacitor-iOS-Sync und eingebettetes
  iOS-Target waren auf der unmittelbar vorherigen produktbytegleichen Basis
  grün; `c132feb` verändert ausschließlich zwei E2E-Testdateien.
- `npm audit --omit=dev`: 0 Befunde.
- `git diff --check`: grün; Worktree sauber.
- Der Rollen-/Coach-Flug wurde auf dem iPhone physisch vom Product Owner als
  vollständig grün freigegeben. Der nachfolgende Terminologie-/Test-Pin ändert
  diese UI-Bytes nicht.
- Jarvis hat v0.3.3 und den v0.2.1/v0.3.3-Gateway-Pin lokal unabhängig
  akzeptiert: 16 von 16 Semantikdateien und 18 von 18 Gatewaydateien bytegenau,
  1.442 von 1.442 Jarvis-Tests grün. Consumer-Commit:
  `71f853da86a0d6450233c695702747d52059cd6e`.
- Das neue fail-closed Combined-Staging-Predeploy-v0.2-Paket ist lokal erzeugt
  und vollständig grün. Es pinnt exakt eine noch nicht angewendete additive
  Registrymigration `20260810154932_feedback_intelligence_visualization_copy_v1_1_2.sql`.
  Export-, Request- und Edgebytes sind gegenüber dem bereits akzeptierten
  Staging-Stand unverändert; ein Edge-Redeploy ist nicht erforderlich.
- Jarvis hat auch dieses exakte Predeploy-v0.2-Paket unabhängig akzeptiert:
  15 von 15 Paketdateien bytegenau und 1.446 von 1.446 Tests grün.
  Consumer-Commit `59e84cb70f07cb2e51c09e267d2d209aaf805421`,
  Acceptance SHA-256
  `cf352c7af509cd3ff1b61039e1437059d574697713e05b30e0cfa0224013554d`.

## Differenz Delta zur vollständigen 1.1-Readiness

### Lokal beziehungsweise Staging zuerst

1. Genau den einen ausstehenden Registry-Migrations-Apply separat
   freigeben und auf Staging anwenden. Ein metadata-only Audit ohne diesen
   Apply wäre kein Nachweis des neuen Registrystands.
2. Unmittelbar danach einen nicht mutierenden metadata-only Postdeploy-Audit
   erzeugen. Keine Credentials setzen, keine Antworten oder Exporte lesen und
   keine Edge Function erneut deployen.
3. Die neue Postdeploy-Evidence erneut unabhängig durch Jarvis abnehmen lassen.
4. Den positiven Organisationsanfrage-Smoke mit echtem Turnstile in Staging
   wiederholen; anschließend Gate wieder schließen.

### Vor Production und App-Store-Upload

5. Den endgültigen Aktivierungsumfang festhalten: strukturierte Antworten,
   freiwillige Kommentare, Guardian-Scope und realer Jarvis-Read dürfen nur in
   der jeweils verifizierten Kombination geöffnet werden.
   Die aktuell für den lokalen Production-Build verwendete bestätigte
   Konfiguration enthält `VITE_FEEDBACK_INTELLIGENCE_V1_ENABLED` und
   `VITE_TURNSTILE_SITE_KEY` noch nicht; Feedback-Checkpoints und öffentliche
   Anfrageannahme sind in diesem Build daher absichtlich geschlossen.
6. App-Privacy-Angaben, Datenschutzerklärung und Review Notes gegen diesen
   realen Datenweg angleichen.
7. Die noch nicht in Production vorhandenen Migrationen in exakt geprüfter
   Reihenfolge einzeln anwenden; kein pauschales `supabase db push`.
8. Benötigte Edge Functions und Feature-Gates kontrolliert aktivieren und
   direkt negativ sowie positiv prüfen.
9. Exakten finalen RC erneut auf iPhone und – solange iPad unterstützt wird –
   iPad installieren und die Kernwege physisch prüfen.
10. Erst danach Branch/PR mergen, Production-Website ausrollen, TestFlight-Build
    erstellen und Version 1.1 in App Store Connect einreichen.

## Feste Altersentscheidung

Der öffentliche App-Store-Eintrag zeigt 13+. Jugendliche von 13 bis 15 dürfen
den Dienst ausschließlich über den bestehenden Unter-16-Guardian-Weg nutzen;
mit 16 oder 17 entscheiden sie im vorgesehenen altersgerechten Flow selbst.
„Empfohlen ab 15“ ist eine Zielgruppenempfehlung und kein technisches oder
vertragliches Mindestalter. App-Store-Altersrating und Produktzugang bleiben
damit getrennt, aber widerspruchsfrei definiert.

## Harte Grenzen

- Dieser Stand ist lokal verifiziert, nicht in Production aktiviert.
- Staging-Evidence ist kein Nachweis echter Pilotwirkung.
- Jarvis hat auf diesem Stand noch keinen neuen realen Feedback-Read.
- Kein Push, Merge, Production-Deploy, TestFlight-Upload oder App-Store-Schritt
  ist durch dieses Dokument ausgeführt oder freigegeben.
