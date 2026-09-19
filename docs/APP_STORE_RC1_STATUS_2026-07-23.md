# RewirePerform App Store RC1 Status

Stand: 23. Juli 2026

Status: lokaler Release Candidate technisch weit fortgeschritten, aber noch
nicht fuer TestFlight oder App Review freigegeben.

Dieser Bericht trennt Code- und Build-Evidenz von Production-Aktivierung,
echten Nutzerablaeufen, Apple-Distribution und externer Rechtspruefung. Es
erfolgten kein Push, kein App-Store-Connect-Upload und keine Einreichung. Die
einzige Production-Aenderung in diesem RC-Block ist die ausdruecklich
freigegebene Coach-Haertungsmigration.

## 1. Kandidat

| Element | Verifizierter Stand |
|---|---|
| Branch | `codex/app-store-rc1-final-20260723` |
| Basis | `origin/main` `bb4ee672dca3cabf3e35623d4e18cdd4996dc59e` |
| Integrierter Audit-Commit | `27d4a1e` (`feat: harden native speech and App Store claims`) |
| Production-Ziel | Supabase `bqsbxesmybthwtxmowfz` |
| Bundle-ID | `com.rewireperform.app` |
| Version / Build | `1.0` / `1` |
| Mindestversion | iOS 15.0 |

Der gemergte Reconnect-, Startup- und native Supabase-Transport wurde nicht
umgebaut. Der finale eingebettete Build wurde erneut gegen das Production-Ziel
verifiziert.

## 2. Im RC umgesetzt

- drei native Einfuehrungsseiten fuer Programm, Tagestypen und Privatsphaere;
- erster nativer Start mit rein lokalem Versionsmarker ohne personenbezogene
  Daten sowie erneuter Aufruf aus den Einstellungen;
- oeffentliche Registrierung und Teambeitritt ausschliesslich als Athlet;
- Entfernung der oeffentlichen Coach-Selbstregistrierung und aller teilbaren
  Coach-Codes aus der Oberflaeche;
- serverseitige Abwehr manipulierter Rollenmetadaten und alter Coach-Codes;
- admin-geschuetzte, atomare Coach-Freigabe mit Teamzuordnung und minimiertem
  Audit-Eintrag;
- kontrollierte Eigentumsuebergabe admin-gefuehrter oder verwaister Teams an
  den freigegebenen Coach; Teams eines anderen Coaches koennen nicht
  uebernommen werden;
- unveraenderter Bestandsschutz fuer bereits bestehende Coach-Konten;
- lokale Spracherkennung mit Tipp-Fallback und angepassten iOS-Hinweisen;
- Abgleich von Privacy Manifest, oeffentlicher Datenschutzerklaerung,
  App-Store-Datenkarte und Aufbewahrungsdokumentation;
- Entfernung von `Crash Data` aus dem Manifest, da der finale Build keinen
  Crash-Collector enthaelt; minimierte Incident-Ereignisse bleiben als
  `Other Diagnostic Data` deklariert;
- SQL-Harness fuer oeffentlichen Rollenweg, Kontoloeschung und erweiterte
  Minderjaehrigenfaelle;
- globale Reduced-Motion-Unterstuetzung und gepruefte grosse Systemschrift.

Die Migration
`supabase/migrations/20260723101114_harden_public_coach_access.sql` ist in
Production unter Version `20260723151225` aktiv. Der abschliessende Postflight
bestaetigt unveraendert 1 Admin-, 1 Coach- und 10 Athletenrollen sowie 2 Teams.
Die Audit-Tabelle ist leer und die transaktionalen Negativtests haben keine
synthetischen Nutzer oder Teams hinterlassen.

## 3. Gruene technische Gates

| Gate | Ergebnis |
|---|---|
| Vollstaendige CI | 75 Testdateien, 378 Tests, Typecheck, Production-Build und alle SQL-/Tracking-/Evidence-/Minor-/MahleOS-/Access-/Deletion-Gates gruen |
| Lint | 0 Fehler, 15 bereits bestehende gepruefte Warnungen |
| Browser-E2E | 66 bestanden, 4 erwartete browserbedingte Offline-Skips; Chromium, iPhone-WebKit und iPad-WebKit jeweils hoch und quer |
| iPad-Elternfreigabe | finaler WebKit-Ablauf nach der Interaktionskorrektur 20 von 20 Mal hintereinander gruen |
| Minderjaehrigen-Vorschau | 15 Zustaende in Chromium und WebKit gruen |
| Oeffentliche URLs | Startseite, Datenschutz und Support auf Desktop und Mobile erreichbar und inhaltlich geprueft |
| Production-Ziel | Build-Validator und eingebetteter iOS-Validator bestaetigen `bqsbxesmybthwtxmowfz` |
| Simulatoren | iPhone 17 Pro Max und iPad Pro 13-inch (M5), jeweils normal sowie Dark Mode, maximal grosse Systemschrift und erhoehter Kontrast; finale Starts zwischen 2,75 und 2,97 Sekunden |
| Simulator-Visual-QA | alle vier Ansichten sichtbar, nicht leer, ohne abgeschnittene Inhalte oder App-Ueberlagerungen |
| Xcode | Xcode 26.6, iOS SDK 26.5, Team `F7A976G38N`, signierter arm64-Archive-Build gruen |
| Codesign | `--deep --strict` bestanden; Bundle-ID, Version, Build und Geraetefamilien korrekt |
| Echtes iPhone 13 | finaler RC erfolgreich installiert; automatischer Starttest wartet nur auf ein entsperrtes Geraet |
| Production-Coach-Haertung | Migration `20260723151225` aktiv; manipulierte Rollenmetadaten, alte Coach-Codes, direkte Coach-Rollenvergabe, unberechtigte Teamerstellung und nicht administrative Freigaben live negativ getestet und blockiert |
| Production-Dependencies | `npm audit --omit=dev`: 0 bekannte Schwachstellen |
| Diff-Hygiene | `git diff --check` gruen |

Die vier Browser-Skips betreffen den deterministischen Service-Worker-
Offline-Test, der in Chromium ausgefuehrt wird. Der native Reconnect wurde
zusaetzlich zuvor dreimal hintereinander auf dem echten iPhone bestaetigt.

## 4. Native Artefakte

Lokales signiertes Archiv:

`/tmp/RewirePerform-RC1-2026-07-23-final-4.xcarchive`

- Groesse: 14 MB
- App-Binary SHA-256:
  `91ef7c473e39a15aee56406a8cb634d8f1336fb493c3b30d7cf1036037f71de9`
- eingebettetes Supabase-Ziel: `bqsbxesmybthwtxmowfz`
- `ITSAppUsesNonExemptEncryption`: `false`
- Geraetefamilien: iPhone und iPad

Privacy Report:

`docs/evidence/RewirePerform-RC1-Privacy-Report-2026-07-23.pdf`

- SHA-256:
  `db411d59186ab7fda362862a45c12150ebea4a2e074b1118db60372ff4da72fd`
- deklariert Name, E-Mail, Health, Fitness, Customer Support, Other User
  Content, User ID, Product Interaction und Other Diagnostic Data;
- enthaelt weder Sentry noch `Crash Data`.

## 5. Echte Release-Stopper

### P1: Flugmodus-Kaltstart erneut rot gemeldet

Nach den zuvor drei gruenen echten Offline-Reconnects wurde der
Flugmodus-Kaltstart am 23. Juli auf dem iPhone erneut als rot gemeldet. Der
Fehler ist damit nicht geschlossen. Der Reconnect-, Startup- und native
Supabase-Transport wurde in diesem Coach-Haertungsblock bewusst nicht erneut
veraendert. Vor TestFlight braucht dieser konkrete Build einen isolierten,
reproduzierbaren Realgeraete-Nachtest mit gesicherten Logs; Timing-Aenderungen
auf Verdacht sind ausgeschlossen.

### Apple-Distribution

Das signierte Archiv ist gruen. Der lokale App-Store-Export stoppt jedoch
korrekt, weil Xcode aktuell nur die gueltige Identitaet
`Apple Development: Mahle Herzog (2KS42YHF7Q)` findet und weder einen aktiven
App-Store-Account noch ein `iOS Distribution`-Zertifikat bereitstellt. Dieses
Apple-/Xcode-Kontogate muss vor TestFlight geloest werden; es ist kein
Produktcodefehler.

### Externe und physische Gates

- fokussierte externe Pruefung von Minderjaehrigenflow, Tracking/Evidence,
  Datenschutz, Aufbewahrung und DSA-Trader-Angaben;
- kompletter Rollen- und Berechtigungsdurchlauf auf dem entsperrten echten
  iPhone mit ausschliesslich synthetischen Konten;
- mindestens ein physischer iPad-Durchlauf;
- TestFlight-Upload erst nach separater Freigabe;
- zwei unabhaengige Tester fuer 24 bis 48 Stunden;
- finale Reviewer-Konten, Store-Screenshots und App-Store-Connect-Antworten.

## 6. Bewertete, nicht blind veraenderte Hinweise

Die Production-Advisors melden unter anderem absichtlich gesperrte
RLS-Tabellen ohne Policies, `pg_net` im exponierten Schema, ausfuehrbare
`SECURITY DEFINER`-Funktionen, deaktivierten Schutz gegen geleakte Passwoerter,
fehlende Foreign-Key-Indizes, RLS-Initplan-Hinweise und ungenutzte Indizes.

Diese Hinweise sind bewertet, aber nicht pauschal als Migration umgesetzt.
Vor Production-Aenderungen muss jeweils der reale Aufrufer-, RLS- und
Performancepfad nachgewiesen werden. Der neue Coach-Freigabeweg prueft
`auth.uid()`, verlangt eine bestehende Adminrolle, setzt einen festen
`search_path`, entzieht `PUBLIC`/`anon` die Ausfuehrung und wird durch negative
SQL-Tests abgesichert. Die Advisor-Hinweise fuer
`find_coach_access_candidate` und `approve_coach_access` sind bewusst
akzeptiert: `authenticated` benoetigt den RPC-Zugang, waehrend beide Funktionen
vor jedem privilegierten Zugriff serverseitig die Adminrolle pruefen. Ein
synthetischer Athlet konnte beide Wege in Production nicht ausnutzen.

Der vollstaendige Dependency-Audit meldet zwei Dev-Tooling-Befunde im
Vite-/esbuild-Pfad. Der automatische Fix wuerde ein ungeprueftes
Vite-8-Major-Upgrade erzwingen; der Production-Audit ist sauber, deshalb wurde
dieses Upgrade nicht ungeprueft in RC1 aufgenommen.

## 7. Freigabegrenze

Dieser Stand belegt einen belastbaren lokalen RC, aber noch keine
App-Store-Einreichungsreife. Die naechste kontrollierte Reihenfolge ist:

1. Apple-Distribution in Xcode aktivieren und lokalen App-Store-Export
   wiederholen.
2. Den offenen Flugmodus-Kaltstart auf dem exakten RC isoliert und mit
   gesicherten Logs reproduzieren oder schliessen.
3. Echte iPhone-/iPad-Rollenmatrix sowie Loesch- und Minderjaehrigenfaelle
   abschliessen.
4. Externe Rechtspruefung und Store-Metadaten finalisieren.
5. Separate Freigabe fuer App Store Connect/TestFlight.
6. Befunde schliessen, Build einfrieren und erst danach eine separate
   Einreichungsfreigabe einholen.

Der RC belegt technische Produktreife innerhalb der dokumentierten Grenzen. Er
belegt weder wissenschaftliche Wirksamkeit noch Fehlerfreiheit oder eine
rechtliche Gesamtfreigabe.
