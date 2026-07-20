# Tracking & Evidence Hardening

Stand: 20. Juli 2026

Status: lokaler Integrationskandidat auf
`codex/tracking-evidence-hardening-20260720`. Keine Migration, Edge Function,
Umgebungsvariable oder Datenveraenderung wurde auf Production angewendet.

## Ziel

Dieser Block macht die vorhandene 56-Tage-Erhebung technisch belastbarer, ohne
den taeglichen Spielerflow zu verlaengern. Er trennt operative Produktdaten,
freigegebene Evidence-Aggregate und spaetere Maschinenexporte klar voneinander.

Das Ergebnis ist eine bessere Basis fuer Solo-Athleten, Teams, kontrollierte
Piloten und einen spaeteren read-only Zugriff durch MahleOS. Es ist kein
Wirksamkeits- oder Kausalnachweis.

## Was der Kandidat aendert

### 1. Fortschritt wird atomar berechnet

`refresh_my_program_progress_snapshot` berechnet den Snapshot serverseitig fuer
die eigene aktive Programminstanz. Ein Advisory Lock und ein eindeutiges Upsert
verhindern konkurrierende Doppelzeilen. Completion, Streak, Check-ins, Journale
und Comprehension bleiben auf den aktuellen Lauf begrenzt.

### 2. Kritische Funktionsrechte werden enger

Die Migration entzieht `anon` unnoetige direkte Ausfuehrungsrechte. Trigger-
Funktionen koennen nicht mehr direkt durch App-Rollen aufgerufen werden.
`get_user_role` und `get_effective_today` akzeptieren nur Self- oder Admin-
Zugriffe. Fremde User-IDs werden in den SQL-Negativtests abgewiesen.

### 3. Teamzustand wird ausschliesslich serverseitig aggregiert

Die Edge Function `team-mental-state` liest keine einzelnen Check-ins mehr. Sie
ruft nur `get_team_mental_state_aggregate` mit dem JWT des Coaches auf.

- Zugriff nur fuer berechtigte Coaches und Admins
- Bezug auf den aktiven Mannschaftslauf
- sensible Werte erst nach zentraler Evidence-Freigabe
- Unterdrueckung unter `n = 5`
- Kennzeichnung als kleine Datenbasis bei `n = 5` bis `9`
- keine Namen, User-IDs, Journale, Reflexionen oder Einzelwerte
- keine indirekten Persoenlichkeits-, Ego- oder Readiness-Scores

Operative Teilnahme bleibt davon getrennt. Ein Coach kann erkennen, wie viele
Athleten aktiv waren, ohne aus optionalem Evidence-Consent einen Nutzungszwang
zu machen.

### 4. Solo-Sportarten erhalten eine strukturierte Evidence-Basis

Bereits vorhandene Onboarding-Antworten werden ohne neue Spielerfrage in
versionierte Felder ueberfuehrt:

- `sport_category`
- `sport_format`
- `sport_level`
- `sport_taxonomy_version`

Damit koennen spaeter zum Beispiel freigegebene Solo-Aggregate fuer Kampfsport
oder Ausdauersport gebildet werden. Freitext-Sportnamen bleiben erhalten. Die
Taxonomie ersetzt keine sportwissenschaftliche Validierung und erzeugt keine
Leistungsdiagnose.

### 5. Abgeschlossene Laeufe bleiben auswertbar

Neue Evidence wird weiterhin nur waehrend einer aktiven Programminstanz
gespeichert. Fuer eine spaetere Auswertung darf eine abgeschlossene Instanz aber
weiter beruecksichtigt werden, solange der aktuelle Consent- und
Autorisierungsstatus weiterhin gueltig ist. Ein Widerruf schliesst die Person
aus dynamischen Aggregaten aus.

### 6. Evidence Data Locks frieren Auswertungen reproduzierbar ein

Admins koennen einen aggregierten Evidence-Stand mit Analysemanifest und
SHA-256-Pruefsumme sperren. Ein Data Lock ist unveraenderlich. Er kann nicht
geloescht, sondern nur mit Grund invalidiert werden. Invalidierte Locks bleiben
auditierbar und werden nicht ueber die Maschinen-API ausgeliefert.

Ein Program-Run-Lock friert in einem versionierten Paket gemeinsam ein:

- Stichprobe und aktuelle Evidence-Berechtigung
- Nutzung und Fortschritt
- Pre-/Mid-/Post-Messstatus und gepaarte Veraenderungen
- taegliche und woechentliche Teamtrends mit metrikspezifischem `n`
- Transfer-Pulse und strukturierte Coach-Aggregate
- Missingness, Unsicherheit und Claim-Grenzen

Mehrfache Pre-/Mid-/Post-Abgaben werden pro Programminstanz, Instrument und
Messzeitpunkt dedupliziert. Kleine Gruppen sowie einzelne Messfelder mit weniger
als fuenf gueltigen Beitraegen liefern serverseitig keine Durchschnittswerte.

Ein Lock enthaelt keine E-Mail, keinen Namen, kein Journal, keine Reflexion,
keine Rohantwort und keinen individuellen Score.

### 7. MahleOS erhaelt einen engen read-only Vertragsentwurf

`evidence-read` ist eine Maschinen-API fuer aktive, pruefsummenverifizierte Data
Locks. Sie hat keinen Browser-CORS-Zugang und fragt keine Live-Athletentabelle
ab.

- eigener Machine-Key mit mindestens 32 Zeichen
- Key nur als Edge-Secret und im macOS Keychain
- `POST` plus maximal 4096 Byte JSON
- exakter Lock oder neuester freigegebener Scope
- 30 Anfragen pro Client und Minute
- eindeutige Request-ID, kein Replay
- append-only Zugriffsaudit ohne Evidence-Payload
- fail-closed bei fehlendem Secret, falscher Rolle, Invalidierung oder
  Pruefsummenfehler

Die API ist vorbereitet, aber nicht aktiviert. Es wurde kein Secret gesetzt und
keine Function deployed.

### 8. Coach-UX bleibt ruhig und ehrlich

Die Coach-Ansicht besitzt einen Retry bei Ladefehlern, nutzt neutrale
Entwicklungssprache und zeigt bei kleinen freigegebenen Gruppen einen kurzen
Unsicherheitshinweis. Unsupported Proxy-Felder wurden entfernt.

## Unveraenderter Spieleraufwand

Der Block fuegt dem Daily Flow keine Frage und keinen neuen Screen hinzu.
Sport-Taxonomie wird aus bereits erhobenen Onboarding-Antworten abgeleitet.
Transfer-Pulse, Check-in und bestehende Messfenster bleiben in ihrer Dauer
unveraendert.

## Lokale Verifikation

Die neuen Vertraege werden unter anderem durch folgende Checks abgedeckt:

- atomarer Snapshot, 3-von-7-Rate, Streak und Instance-Scope
- Self-/Foreign-ID- und Rollen-Negativtests
- Solo-Aggregat bei `n = 4` gesperrt und bei `n = 5` sichtbar/low confidence
- Teamaggregat bei `n = 4` gesperrt und bei `n = 5` sichtbar
- Consent-Widerruf entfernt Werte sofort aus dynamischen Aggregaten
- abgeschlossener Lauf bleibt nur mit aktueller Autorisierung auswertbar
- doppelte Pre-Abgabe erhoeht das gepaarte `n` nicht
- malformed oder fehlender Einzelwert senkt das metrikspezifische `n` und wird
  unter `n = 5` unterdrueckt
- Run-Data-Lock enthaelt Nutzung, Messungen, Outcomes und Transfer-Evidence in
  einem gemeinsamen Schema
- Data Lock unveraenderlich, invalidierbar und pruefsummenbelegt
- Maschinenzugriff nur als `service_role`
- invalidierter oder beschaedigter Lock wird nicht ausgeliefert
- Maschinenzugriffe und Abweisungen werden append-only auditiert
- kein Zugriff der API auf Journale, Reflexionen oder Live-Check-ins

Ein gruener lokaler Lauf beweist den Repository-Vertrag. Er beweist noch nicht,
dass dieselben Migrationen, Grants, JWT-Claims und Edge-Secrets auf Production
korrekt aktiviert sind.

## Aktivierungsreihenfolge nach gesonderter Freigabe

1. Production-Migrationsstand und Bestandsdaten read-only pruefen.
2. Preflight auf doppelte aktive Instanzen, fehlende Instance-IDs und unerwartete
   Function-Overloads ausfuehren.
3. Migrationen in Reihenfolge anwenden:
   - `20260720080000_harden_tracking_runtime_permissions_and_snapshots.sql`
   - `20260720080100_add_structured_solo_evidence_locks.sql`
   - `20260720082309_harden_team_mental_state_aggregate.sql`
   - `20260720082953_add_evidence_read_api_contract.sql`
   - `20260720090000_unify_program_run_evidence_eligibility.sql`
4. Grants, RLS, RPCs und Security Advisor erneut read-only pruefen.
5. `team-mental-state` deployen und mit Coach, Outsider und `n = 4/5` testen.
6. Einen separaten 256-Bit Machine-Key erzeugen, als
   `MAHLEOS_EVIDENCE_API_KEY` in der Edge-Umgebung und im MahleOS Keychain
   hinterlegen.
7. `evidence-read` deployen und nur mit einem synthetischen Data Lock testen.
8. Erst danach einen freigegebenen Pilot-Lock erzeugen.

Jeder Production-Schritt braucht eine eigene ausdrueckliche Freigabe. Der
Service-Role-Key darf niemals in MahleOS, Browser, App oder Repository liegen.

## Offene Gates

1. Der aktuelle Main-Stand aktiviert ein V2-Evidence-Protokoll fuer
   Minderjaehrige mit konkreten Guardian-/Assent-Receipts. Aeltere Dokumente
   beschreiben Minderjaehrigen-Evidence weiterhin als deaktiviert. Dieser
   Widerspruch muss vor einem realen Minderjaehrigenpilot fachlich, rechtlich und
   dokumentarisch aufgeloest werden. Dieser Tracking-Block aendert die
   Aktivierungsentscheidung nicht.
2. Widerruf, Aufbewahrung und Loeschung bereits gesperrter Data Locks brauchen
   eine verbindliche fachlich-rechtliche Regel.
3. Production-Apply, reale RLS-/JWT-Tests und Security-Advisor-Nachpruefung sind
   noch nicht erfolgt.
4. Ein echtes iPhone, TestFlight und reale Offline-/Retry-Ablaufe bleiben eigene
   App-Store-Gates.
5. Ein kontrollierter Pilot validiert Verstaendlichkeit, Teilnahme und reale
   Datenqualitaet. Lokale QA kann dieses Nutzerverhalten nicht beweisen.

## Aussagegrenze

Nach sauberem Pilotbetrieb kann RewirePerform belastbar berichten:

- Nutzung und Adhaerenz
- wiederholt erhobene, freigegebene Selbstauskuenfte
- strukturierte Coach-Beobachtungen
- beobachtete Pre-/Mid-/Post- und Zeitverlaeufe
- Datenqualitaet, Missingness und Gruppengroesse

Ohne vorab definiertes Vergleichs- oder randomisiertes Design bleibt unzulaessig:

- RewirePerform hat sportliche Leistungssteigerung verursacht
- Qualifikation oder Wettkampferfolg wurde durch die App verursacht
- individuelle psychologische Diagnose oder Persoenlichkeitsbewertung
