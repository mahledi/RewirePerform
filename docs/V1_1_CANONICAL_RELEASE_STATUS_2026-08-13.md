# RewirePerform 1.1 – kanonischer Release-Status

Stand: 13. August 2026  
Verifizierte Codebasis: `008ddddb6fc18d89ea10cf23efc40882f04ba9ac`  
Branch: `codex/v1-1-apple-integration-20260810`

Dieses Dokument ist der verbindliche Einstiegspunkt für den Abschluss von
V1.1. Ältere Hand-offs bleiben historische Nachweise, dürfen aber keinen
neueren Aktivierungs- oder Release-Stand autorisieren.

## Ziel B

Eine pilotfähige iOS-Version 1.1 mit verständlichem Athleten- und Coach-Einstieg,
dem vollständigen 56-Tage-System, sicherem Feedback einschließlich
Minderjährigenweg, professionellen Team-/Coach-Verbindungen, aktueller Website
und einem kontrollierten internen Jarvis-Auswertungspfad.

## Stand A – technisch fertig und im Releasekandidaten enthalten

- Rollenwahl vor der Anmeldung mit getrenntem Athleten- und Coach-Flug.
- Solo-, Athleten-Teambeitritt-, Team-/Organisationsanfrage- und persönliche
  E-Mail-gebundene Co-Coach-Einladungswege ohne automatische Coach-Rolle.
- Vollständiger deterministischer 56-Tage-Inhalt im echten Daily Flow.
- Pre-Training Active Recall, tagspezifisches privates Journal und Rest-Day-Flow
  mit 4/6-Atmung, drei klaren Visualisierungsschritten, Ton, Haptik-Fallback,
  Wake Lock und Rückkehr zum Dashboard.
- Feedback-Checkpoints an Tag 10, 24, 39 und 55 mit je zwei progressiven
  Visualisierungsfragen; einheitliche sichtbare Terminologie
  **Visualisierung**.
- Final versionierter deutscher Athlete-/Guardian-Consent-Vertrag: Produkt ab
  13, Guardian-Pfad für 13–15, eigene Entscheidung für 16–17, Kommentare
  freiwillig, Widerruf und Löschung fail-closed.
- Professionelle Athleten- und Coach-Share-Texte, Social Previews, Web-Fallback,
  Smart-App-Banner und Universal-Link-Vertrag einschließlich
  `/organization/invite`.
- App-Privacy-Manifest und App-Store-Metadaten-Delta auf dem belegten
  Datenvertrag: kein Tracking; Health, User ID, Phone Number, Other Data Types
  und begrenzte operative Other Diagnostic Data nach ihrem tatsächlichen Zweck.
- Production-Datenbankbasis und beide benötigten Edge Functions sind
  credentiallos, mit geschlossenen Runtime-Gates und fail-closed vorbereitet.
- Feedback-Semantik v0.3.3, Export v0.2.1, Production-Gateway und finaler
  Consent sind von Jarvis byte- und semantikgepinnt. Der ausführbare lokale
  Production-One-Shot ist vorhanden, aber nicht aktiviert.
- Atomarer Feedback-Aktivierungs-/Reclose-Vertrag und ein synthetischer
  Rollback-Smoke für acht reale Pfade sind vorbereitet: Adult, 16–17,
  Under-16 Guardian und Athlete, optionaler Kommentar, Ablehnung, Widerruf,
  Löschung und Retry.

## Verifikation auf der Codebasis

- `npm run ci`: 158/158 Testdateien und 887/887 Tests grün.
- Sämtliche SQL-, Privacy-, Minderjährigen-, Guardian-, Feedback-, Access-,
  Deletion-, Security- und statischen App-Store-Gates grün.
- `npm audit --omit=dev`: 0 Befunde.
- Production-Webbuild und Release-Target
  `bqsbxesmybthwtxmowfz` grün.
- Capacitor-iOS-Sync und eingebettetes Production-Ziel grün.
- Xcode-Readiness: 8/8 Checks grün; Bundle-ID `com.rewireperform.app`, Version
  1.1, lokaler Build 5, Team `F7A976G38N`.
- Öffentliche Desktop- und Mobile-Routen `/`, `/privacy` und `/support`: 6/6
  Checks grün.
- Git-Diff sauber; einzig der private untracked Operatorbereich
  `.rewire-local/` ist ausdrücklich kein Bestandteil des Releases.

## Bewusst geschlossen – kein Fehler und kein False Green

- Feedbackkampagnen, Guardian-Policy, Collection, Kommentare und echter
  Jarvis-Read sind noch nicht live aktiviert.
- Production-Reader besitzt kein Passwort; temporäre Machine-Credentials und
  Runtime-Gates bleiben geschlossen.
- Die öffentliche Organisationsannahme bleibt geschlossen, bis Turnstile,
  Datenschutzhinweise und der positive Production-Smoke zusammen freigegeben
  und geprüft sind.
- Der neue Website-/AASA-/Preview-Stand ist lokal fertig, aber noch nicht auf
  Production ausgerollt.
- Es wurde noch kein finaler signierter V1.1-Build zu TestFlight oder App Store
  Connect hochgeladen.

## Differenz Delta – echte Reststrecke bis Pilot und Einreichung

1. Qualifizierte deutsche Rechts-/Privacy-/Minderjährigenprüfung des finalen
   Feedback-, Guardian-, Jarvis- und Organisationsumfangs dokumentieren. Der
   Code kann diesen externen Nachweis nicht ersetzen.
2. Production-Turnstile-Secret ausschließlich im Supabase-Secret-Store
   hinterlegen, während das öffentliche Gate geschlossen bleibt; danach
   presence-only prüfen. Dies ist eine externe Secret-Mutation und braucht die
   konkrete Freigabe unmittelbar vor der Ausführung.
3. Den Feedbackvertrag und die acht API-Pfade mit synthetischen Production-
   Konten transaktional prüfen, vollständig zurückrollen und separat
   metadata-only nachprüfen. Erst nach grünem Nachweis den exakt freigegebenen
   Umfang aktivieren.
4. Genau einen minimierten realen Jarvis-Read separat provisionieren, ohne
   Retry und ohne Rohdatenpersistenz, danach Credentials und Gates sofort
   entfernen und Postread-Audit durchführen. Dieser Schritt benötigt eine
   eigene Ausführungsfreigabe.
5. Website, AASA, Banner und Social Previews kontrolliert nach Production
   bringen und die Live-Links prüfen.
6. Stabile synthetische App-Review-Konten für Athlete, Coach und den
   Minderjährigen-/Guardian-Testweg erzeugen; keine echten Spielerdaten nutzen.
7. In App Store Connect prüfen, ob Build 5 noch frei ist. Falls nicht, vor dem
   Archive auf Build 6 erhöhen.
8. Exakten finalen Merge-SHA signiert archivieren, auf iPhone und iPad sowie
   anschließend als denselben TestFlight-Build durch die Golden Flows testen.
9. App-Privacy, Review Notes, Screenshots und „Neu in dieser Version“ gegen den
   tatsächlich aktivierten Umfang final eintragen und V1.1 manuell einreichen.

## Pilotgrenze

Der Trainer darf RewirePerform offiziell vorstellen und zur freiwilligen
Teilnahme einladen. Teilnahme, Feedbackkommentare und Minderjährigenfreigaben
bleiben freiwillig beziehungsweise guardian-gebunden; Nichtteilnahme darf
keinen sportlichen Nachteil erzeugen. Trainer sehen Aktivität und erlaubte
Aggregate, aber keine privaten Journaltexte oder Rohkommentare.

## Nächster sicherer Schritt

Ohne weitere externe Mutation kann der aktuelle Stand integriert und für den
signierten RC vorbereitet werden. Die nächste noch nicht erteilte konkrete
Ausführungsfreigabe betrifft ausschließlich das Hinterlegen des bereits
erzeugten Turnstile-Secrets im Supabase-Production-Secret-Store bei weiterhin
geschlossenem öffentlichen Organisations-Gate.
