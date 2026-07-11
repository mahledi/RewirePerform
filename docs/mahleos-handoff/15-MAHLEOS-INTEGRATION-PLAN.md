# MahleOS Integration Plan

Status: Entwurf, keine Verbindung aktiviert.

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
- keine Secrets, Production-Daten oder privaten Athleteninhalte.
- keine automatischen Commits, Branches, PRs oder Deployments.

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

- Production-DB lesen oder schreiben, sofern nicht explizit und minimal autorisiert.
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

Read-only R1 ist nach Mahles Review dieses Packs realistisch. Schreibende oder autonome Integration bleibt blockiert, bis Projekt-ID/Production-Stand, aktuelle Prioritaet, Account-Loeschung, Minderjaehrigen-Consent und aktive Regeldateien geklaert sind.

