# MahleOS Integration Plan

Status: RewirePerform-seitiger Read-only Integrationskandidat ist lokal
implementiert und getestet. Er trennt aktuelle Operations-Daten von gesperrter
Evidence. Keine Verbindung, kein Secret und kein Production-Deploy ist aktiviert.

Der verbindliche technische Vertrag steht in
`19-MAHLEOS-READ-API-CONTRACT.md`.

## Ziel

MahleOS soll RewirePerform-Kontext dauerhaft lesen und sichere Aufgaben vorbereiten koennen, ohne produktive Kontrolle, Privacy oder Mahles Entscheidungsrecht zu umgehen.

## Phase 0 - Wissensbasis

1. Dieses Pack gemeinsam pruefen.
2. Konflikte C-01 bis C-10 entscheiden.
3. bestaetigte Regeln in aktive Repository-Guidance ueberfuehren.
4. veraltete Runbooks markieren, nicht still loeschen.

## Phase 1 - Read-only Verbindung

- Repository und freigegebene Dokumente lesen.
- Git-Status, Tests und offene Doku-Widersprueche melden.
- nach separater Freigabe aktuelle, strikt aggregierte Operations-Signale ueber
  `mahleos-read` lesen: Systemgesundheit, Trackingqualitaet, Feedback-Backlog
  und run-spezifische Pilot Readiness.
- optional nach separater Freigabe ausschliesslich aktive, aggregierte und
  pruefsummenverifizierte Evidence Data Locks ueber `evidence-read` lesen.
- keine Live-Production-Tabellen, Secrets oder privaten Athleteninhalte.
- keine automatischen Commits, Branches, PRs oder Deployments.

### Data-Lock-Vertrag

Die lokalen Kandidaten `mahleos-read` und `evidence-read` sind kein allgemeiner
Supabase-Zugang. MahleOS darf weder Admin-Login noch Service-Role-Key erhalten.
Der einzige rotierbare Maschinenschluessel liegt als Edge-Secret und im macOS
Keychain.

Erlaubte Antwort:

- Scope und Protokollversion
- Source-Cutoff und Lock-Zeitpunkt
- SHA-256-Pruefsumme und Analysemanifest
- freigegebene aggregierte Evidence
- Datenqualitaet, Gruppengroesse, Missingness und Claim Boundary

Ein freigegebener Program-Run-Lock nutzt
`program-run-evidence-lock-v2-2026-07` und enthaelt gemeinsam aggregierte
Nutzung, Pre-/Mid-/Post-Messung, Teamtrend, Transfer-Evidence und die zugehoerige
Analysegrenze. MahleOS muss `snapshot_schema_version` pruefen und unbekannte
Versionen ablehnen, statt Felder still falsch zu interpretieren.

Ein freigegebener Solo-Sport-Lock nutzt
`solo-sport-evidence-lock-v2-2026-07` und enthaelt gemeinsam aggregierte Nutzung,
Pre-/Mid-/Post-Abdeckung, Development-Index-Werte, Verstaendniswerte, acht
Programmwochen und Transfer-Evidence. MahleOS darf nur diese beiden explizit
unterstuetzten Schema-Versionen akzeptieren und muss jede unbekannte Version
fail-closed ablehnen.

Ausgeschlossen:

- Namen, E-Mails und User-IDs
- Journale, Reflexionen und Freitext
- Rohantworten und einzelne Check-in-Verlaeufe
- individuelle Scores oder Coach-Beobachtungen
- Zugriff auf noch nicht gesperrte Live-Daten

Jeder Zugriff wird mit Request-ID, Client-ID, Ergebnis, Lock-ID und Pruefsumme
append-only auditiert. Der Audit speichert keinen Evidence-Payload.

## Phase 2 - Kontrollierte Aufgaben

- Mahle erteilt einen konkreten Scope.
- MahleOS erzeugt einen Task mit Risiko, Source of Truth und Definition of Done.
- Codex arbeitet in isoliertem Branch/Worktree nur nach Bestaetigung.
- Ergebnis bleibt reviewbar; Merge/Deploy bei Mahle.

## Phase 3 - Begrenzte Automatisierung

Nur fuer R1/R2 nach gesonderter Freigabe:

- Dokumentationsdrift erkennen.
- CI-/Teststatus beobachten.
- Content-Sprach-Audit ausfuehren.
- Privacy-Vokabular und verbotene Exportfelder statisch scannen.
- App-Store-Checklisten aktualisieren, aber nicht final einreichen.

## Nie autonom

- Production-DB direkt lesen oder schreiben. Auch eine freigegebene Data-Lock-
  API erlaubt keinen allgemeinen Datenbankzugriff.
- RLS/Auth/Consent aendern.
- Nutzer anschreiben oder Accounts bearbeiten.
- Deploy, DNS, Domain, Store Submission oder Secrets.
- wissenschaftliche oder rechtliche Endfreigabe.
- neue Datenerhebung oder Coach-Sichtbarkeit.

## Technischer Vertragsentwurf

Jeder MahleOS-Task sollte enthalten:

```text
Ziel
Repository und erwarteter Branch
erlaubte Dateien/Systeme
verbotene Aktionen
Risikostufe
Source-of-Truth-Dateien
Definition of Done
Pflichttests
Freigabepunkt fuer Commit/Push/Deploy
```

## Integrationsreife

MahleOS kann den lokalen Adapter jetzt gegen die dokumentierten V1-Schemas und
Mocks bauen. Ein echter Production-Read bleibt blockiert, bis Migration,
Machine-Key und beide Functions separat freigegeben, aktiviert und negativ
verifiziert sind. Schreibende oder autonome RewirePerform-Aktionen bleiben
ausgeschlossen.
