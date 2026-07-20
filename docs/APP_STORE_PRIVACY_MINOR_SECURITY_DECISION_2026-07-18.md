# Entscheidungspaket: App Store, Minderjaehrige, Privacy und Security

Stand: 18. Juli 2026

Status: technische Ist-Aufnahme und Empfehlung; noch keine Produkt-, Rechts- oder
Production-Freigabe. Dieses Dokument ist kein Rechtsgutachten.

Update spaeter am 18. Juli 2026: Der Minderjaehrigen-Produktflow ist inzwischen im isolierten Branch `codex/minor-guardian-flow-20260718` lokal implementiert und technisch geprueft. Fuer den aktuellen Stand gelten `docs/MINOR_GUARDIAN_FLOW_IMPLEMENTATION_SPEC_2026-07-18.md` und `docs/MINOR_GUARDIAN_REVIEW_HANDOFF_2026-07-18.md`; Rechtspruefung, Staging, Production und App-Store-Freigabe bleiben offen.

Entscheidungsupdate 20. Juli 2026: Mahle hat Minderjaehrigen-Evidence bei
vollstaendiger aktueller altersgerechter Autorisierung und separatem
freiwilligem Datenbeitrag produktseitig freigegeben. Das hebt keines der
offenen Rechts-, Privacy-, Production- oder App-Store-Gates auf.

## 1. Kurzurteil

Der aktuelle Kandidat ist fuer weitere interne Entwicklung und synthetische Tests
technisch belastbar. Er ist noch nicht fuer einen realen Pilot mit 15-jaehrigen
Athleten und noch nicht fuer die App-Store-Einreichung freigegeben.

Die offenen Punkte sind nicht mehr primaer ein grosser allgemeiner Codeblock. Es
sind wenige, aber verbindliche Gates:

1. Produkt- und Rechtsregel fuer Minderjaehrige und sensible Verlaufsdaten;
2. einheitliches serverseitiges Eligibility-Gate vor Teamaggregaten und Evidence;
3. finale Privacy-Fassung und App-Store-Privacy-Antworten;
4. verbindliche Aufbewahrung, Backups und aktive Provider-Dokumentation;
5. Haertung aktueller Supabase-Function-Grants;
6. Apple Signing, echte iPhones und TestFlight.

## 2. Verifizierte Basis

- `origin/main` `72fde61` enthaelt Tracking/Evidence, QA-Paritaet und den aktuellen E-Mail-Flow.
- Der lokale Integrationskandidat besteht 192/192 Unit-/Vertragstests und 41 Browser-Flows.
- Unsigned Build und Start sind auf iPhone- und iPad-Simulator bestanden.
- Account-Loeschung, Evidence-Fail-Closed fuer Minderjaehrige, `n >= 5` und deaktivierte ehemalige AI-Funktionen besitzen technische Nachweise.
- Sentry ist im Release-Kandidaten vollstaendig aus dem ausgelieferten App-Code
  entfernt. Das gehaertete externe Projekt bleibt als historische Evidenz
  bestehen; Details stehen in `docs/SENTRY_DECOMMISSION_DECISION_2026-07-18.md`.
- `npm run privacy:verify` weist 7 Schutzinvarianten als gruen und 7 Release-Blocker als offen aus.
- Production wurde am 18. Juli ausschliesslich read-only auf Schema-, Function-, Grant- und Advisor-Ebene geprueft.

## 3. Neuer Production-Security-Befund

Der Supabase Security Advisor meldet 12 Public-Funktionen, die gleichzeitig
`SECURITY DEFINER` sind und von `anon` ausgefuehrt werden duerfen:

- `can_manage_team_calendar`
- `get_admin_ops_status(boolean)`
- `get_admin_overview_stats(boolean)`
- `get_admin_teams_summary(boolean)`
- `get_effective_today(uuid)`
- `get_user_role(uuid)`
- `handle_new_user()`
- `handle_new_user_role()`
- `has_role(uuid, app_role)`
- `is_coach_of_user(uuid)`
- `is_creator_of_team(uuid)`
- `is_member_of_team(uuid)`

### Bewertung

| Befund | Bewertung | Erforderliche Behandlung |
|---|---|---|
| `get_user_role(uuid)` | Aufruferbindung fehlt; bekannte UUID kann Rollenmetadaten offenlegen | `anon` entziehen; direkte Nutzung auf eigene ID oder Admin begrenzen; RLS-Aufrufer separat testen |
| `has_role(uuid, app_role)` | Aufruferbindung fehlt; bekannte UUID und Rolle koennen abgefragt werden | `anon` entziehen; beliebige Fremd-ID blockieren, ohne bestehende RLS-Policies zu brechen |
| `get_effective_today(uuid)` | Aufruferbindung fehlt; Teststatus-/QA-Datumsverhalten ist abfragbar | `anon` entziehen; Self-/Admin-/freigegebenen QA-Vertrag festlegen |
| `handle_new_user*` | Triggerfunktionen brauchen keinen direkten Client-Aufruf | `anon` und `authenticated` fuer direkte Ausfuehrung entziehen; Triggerpfad testen |
| Admin- und Team-Helper | interne Auth-/Rollenpruefungen reduzieren das unmittelbare Risiko, der anonyme Grant ist trotzdem unnoetig | `anon` entziehen; negative RPC- und Policy-Tests |
| 48 Advisor-Warnungen fuer `authenticated` | nicht pauschal eine Schwachstelle; viele RPCs und RLS-Helper brauchen legitime Ausfuehrung | jede Signatur mit Caller-Vertrag, interner Autorisierung und Policy-Abhaengigkeiten inventarisieren |
| `pg_net` im Public-Schema | Advisor-Warnung; nicht blind verschieben | Extension-Nutzung und Supabase-Kompatibilitaet vor Migration pruefen |
| Leaked Password Protection deaktiviert | zusaetzliche Auth-Schutzschicht fehlt und ist laut aktueller Supabase-Dokumentation planabhaengig | vor realem Minderjaehrigenpilot Pro-Upgrade oder dokumentierte Risikoentscheidung |

Das ist ein Release-Blocker vor einem realen Pilot, aber kein Grund fuer eine
ungepruefte globale `REVOKE`-Migration. `has_role` und andere Helper werden von
RLS-Policies verwendet. Die Reparatur braucht daher eine lokale Migration mit
Signaturinventar, Negativtests und Production-Apply als separaten Schritt.

## 4. Empfohlenes Pilotmodell

Fuer den ersten Lauf mit etwa 25 Personen wird ein kontrollierter Einladungs-Pilot
empfohlen:

1. Konten werden nur fuer eine vorab festgelegte Teamliste freigegeben.
2. Offene, unbeaufsichtigte Registrierung wird fuer den Pilot nicht als
   Teilnahmefreigabe behandelt.
3. Rollen, Teamzuordnung und Altersfreigabestatus werden vor dem ersten sensitiven
   Schreibpfad serverseitig geprueft.
4. Der normale Produktzweck, optionaler Datenbeitrag und Evidence/Forschung werden
   getrennt erklaert und versioniert.
5. Ablehnung des optionalen Datenbeitrags darf die normale Programmnutzung nicht
   verschlechtern.
6. Evidence fuer Minderjaehrige bleibt fail-closed und wird nur bei aktivem
   Protokoll, aktuellem freiwilligem Datenbeitrag und vollstaendiger
   altersgerechter Autorisierung einbezogen. Eine formale Forschungsnutzung
   braucht weiterhin einen eigenen Vertrag und die erforderlichen Pruefungen.

Dieses Modell senkt Betriebs- und Privacy-Risiko, ohne den taeglichen Ablauf fuer
Athleten mit wiederholten Abfragen zu belasten.

## 5. Minderjaehrigenregel mit geringem Zusatzaufwand

Technisch datensparsam waere eine einmalige Altersgruppe statt eines vollstaendigen
Geburtsdatums, zum Beispiel `unter 16` und `16 oder aelter`. Die konkrete Grenze und
Rechtsgrundlage muessen jedoch fachlich bestaetigt werden. Artikel 8 DSGVO ist keine
pauschale Erlaubnis fuer jede Verarbeitung ab 16, sondern betrifft bestimmte
einwilligungsbasierte Dienste; besondere Datenkategorien, Vertragsfaehigkeit,
Vereinsrollen und Forschung muessen separat bewertet werden.

Konservativer Produktvorschlag:

- unter 16: Autorisierung eines Erziehungsberechtigten plus eigene, altersgerechte
  Zustimmung des Athleten vor sensitiven Produktdaten;
- 16 oder aelter: eigene Entscheidung nur fuer die Zwecke, fuer die Legal dies
  bestaetigt;
- Produktverarbeitung, optionaler Datenbeitrag und Evidence/Forschung erhalten
  getrennte Receipts und getrennte Widerrufswirkung;
- kein taeglicher Consent-Prompt; erneute Entscheidung nur bei Zweck- oder
  Versionswechsel;
- kein Minderjaehriger gelangt allein durch das bestehende
  `data_contribution_consent` in Teamaggregate oder Evidence.

Wenn der geplante Evidence-Pfad als gesundheitsbezogene Forschung am Menschen
einzuordnen ist, verlangen Apples aktuelle Review-Regeln unter anderem
Erziehungsberechtigten-Consent fuer Minderjaehrige und eine unabhaengige
Ethikpruefung. Diese Einordnung muss vor Aktivierung feststehen.

## 6. Aufbewahrungs- und Provider-Entscheidung

Die folgenden Fristen bleiben Vorschlaege, bis sie rechtlich und operativ
freigegeben sind:

| Datenklasse | Empfohlene Obergrenze |
|---|---:|
| Supabase-Backups oder eigene verschluesselte Dumps | 7 Tage |
| historische Sentry-Events vor Dekommissionierung | providerseitig maximal 30 Tage; keine neuen App-Events nach Deployment |
| `app_event_log` | 30 Tage |
| `notification_log` | 90 Tage nach Ende des Programmlaufs |
| geschlossenes Feedback | 180 Tage |
| minimierter fehlgeschlagener Loeschnachweis | 12 Monate |
| Consent-/Guardian-Receipt | vorgeschlagen 3 Jahre, rechtlich zu bestaetigen |
| personenbezogene Evidence-Rohdaten | konkretes Protokoll-Enddatum, vorgeschlagen maximal 12 Monate nach Pilotende |

### Supabase

Free reicht fuer interne Entwicklung. Fuer einen echten Minderjaehrigenpilot wird
Pro als Betriebsentscheidung empfohlen, nicht als behauptete gesetzliche Pflicht:
verwaltete taegliche Backups mit sieben Tagen Aufbewahrung und Leaked Password
Protection sind damit ohne eigene Ersatzinfrastruktur erreichbar.

Ein Pilot auf Free ist erst vertretbar, wenn ein automatisierter, verschluesselter,
nach sieben Tagen rotierender Dump, ein Restore-Test und ein Deletion-Replay fuer
zwischenzeitlich geloeschte Konten nachgewiesen sind. Ein manueller gelegentlicher
Export reicht nicht.

### Sentry

Der Product Owner hat Sentry fuer den Pilot aus der App entfernt. SDK, DSN,
Fallback, App-Initialisierung, Nutzerkontext und direkter Error-Boundary-Capture
sind im Release-Kandidaten nicht mehr vorhanden. Das gehaertete Sentry-Projekt
bleibt bestehen; historische Events laufen innerhalb der verifizierten 30 Tage
aus. DPA, Disclosure und nutzerbezogener Loeschprozess sind deshalb kein
technisches Gate fuer den neuen App-Datenstrom, solange Sentry getrennt bleibt.
Die rechtliche Dokumentation der historischen Verarbeitung bleibt separat zu
pruefen. Eine Wiederaktivierung braucht eine neue ausdrueckliche Freigabe und den
vollstaendigen Providervertrag.

## 7. Sichtbare Privacy-Fassung nach Freigabe

Erst nach den Produkt- und Rechtsentscheidungen wird `src/pages/Privacy.tsx`
angepasst. Die finale Fassung muss mindestens:

- Verantwortlichen und physische Kontaktanschrift nennen;
- Supabase und Vercel mit Zweck, Rolle, Region und Transfermechanismus
  korrekt beschreiben;
- die veraltete Aussage zu AI-generierten Aufgaben entfernen;
- Versand-, Oeffnungs- und Fehlerprotokollierung bei Notifications nennen;
- Teamaggregate exakt als serverseitig freigegebene Population nach allen Filtern
  beschreiben;
- den realen Export-/Betroffenenprozess und seine Kontaktstrecke nennen;
- Aufbewahrungsfristen und Backup-Ausnahme korrekt erklaeren;
- den sichtbaren Entwurfsstatus erst nach finaler Rechtsfreigabe entfernen.

Privacy Manifest, App Store Connect Privacy Details und Laufzeitverhalten muessen
danach als eine gemeinsame Datenkarte abgeglichen werden.

## 8. Entscheidungen des Product Owners

| ID | Entscheidung | Empfohlener Ausgangspunkt |
|---|---|---|
| D-01 | erster Pilot offen oder kontrolliert | kontrollierte Einladung fuer etwa 25 Personen |
| D-02 | rechtlicher Verantwortlicher und Anschrift | vor Privacy-Text verbindlich angeben |
| D-03 | Rechtsgrundlage je Produkt-Datenklasse | durch qualifizierte Privacy-/Rechtspruefung bestaetigen |
| D-04 | Regel fuer unter 16 und fuer 16+ | unter 16 Guardian plus Athlete-Assent; 16+ nur nach Zweckpruefung |
| D-05 | Produktverbesserung, Evaluation und Forschung | drei getrennte Zwecke; Forschung nicht stillschweigend aktivieren |
| D-06 | vorgeschlagene Aufbewahrungsfristen | bestaetigen oder pro Datenklasse aendern |
| D-07 | Supabase vor Minderjaehrigenpilot | Pro; Free nur mit vollstaendig getesteter Backup-Ersatzstrecke |
| D-08 | Sentry im Pilot | entschieden: aus der App entfernt; Projekt bleibt erhalten |
| D-09 | Supabase-Grant-Haertung | lokale Migration und Tests freigeben; Production-Apply separat |

## 9. Technische Reihenfolge nach Entscheidungen

1. Function-Signaturen, Policy-Aufrufer und Grants vollstaendig inventarisieren.
2. Lokale Security-Migration fuer anonyme und triggerfremde Function-Ausfuehrung
   erstellen und mit RLS-/RPC-Negativtests absichern.
3. Alters-/Guardian-/Assent-Receipt und serverseitige Eligibility als einen
   versionierten Vertrag implementieren.
4. `team-mental-state`, Study-, Presentation- und Exportpfade auf diesen Vertrag
   umstellen; `n >= 5` erst nach allen Ausschluessen berechnen.
5. Retention-Jobs, Backup-Runbook und Restore-/Deletion-Replay implementieren
   beziehungsweise verifizieren.
6. finale Privacy-Seite, App Store Privacy Details und Review Notes angleichen.
7. vollstaendigen Build, Privacy-Gate, SQL-Harness, Browsermatrix, signierten
   iPhone-Build und TestFlight-Test wiederholen.

## 10. Noch nicht erlaubt oder ausgefuehrt

- keine Minderjaehrigen- oder Guardian-Logik implementiert;
- keine sichtbaren Privacy-Aussagen geaendert;
- keine Supabase-Migration erstellt oder angewendet;
- keine Production-Konfiguration geaendert;
- kein Push, Merge, Deploy, Archive oder Upload ausgefuehrt.

## 11. Offizielle Ausgangsquellen

- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple Account Deletion: https://developer.apple.com/support/offering-account-deletion-in-your-app
- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Apple Age Rating: https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating
- DSGVO: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- EDPB Age Assurance: https://www.edpb.europa.eu/our-work-tools/our-documents/statements/statement-12025-age-assurance_en
- Supabase Backups: https://supabase.com/docs/guides/platform/backups
- Supabase Password Security: https://supabase.com/docs/guides/auth/password-security
- Sentry GDPR Guidance: https://sentry.io/resources/gdpr/
- Sentry Data Storage Location: https://docs.sentry.io/organization/data-storage-location/
- Sentry Pricing: https://sentry.io/pricing/
- Sentry International Data Transfers: https://sentry.io/astro-assets/resources/legal/International-Data-Transfers-With-Sentry-2024-01-19.pdf
