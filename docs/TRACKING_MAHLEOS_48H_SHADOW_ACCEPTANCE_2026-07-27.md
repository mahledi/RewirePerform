# MahleOS 48-Hour Shadow Acceptance

Stand: 27. Juli 2026

Owner der Ausfuehrung: MahleOS-Agent

Owner der Tracking-Abnahme: RewirePerform Tracking

## Ziel

MahleOS soll 48 Stunden lang beweisen, dass es RewirePerform tagsueber
zuverlaessig beobachtet, echte Fehler von Datenluecken trennt und niemals
private Inhalte oder ein falsches Gruen erzeugt.

Der Schattenbetrieb darf keine Productiondaten veraendern, keinen Fix pushen,
keine PR erstellen, nichts deployen und keine Automation dauerhaft aktivieren.

## Voraussetzungen

- finaler Producer- und Consumer-Contract bytegenau gepinnt;
- exakt ein erlaubter Supabase-Host;
- Machine Key ausschliesslich im macOS Keychain;
- acht Ansichten lokal und live schema-validiert;
- GitHub, Vercel und Support ehrlich `NOT_CONNECTED`, solange keine jeweilige
  Freigabe vorliegt;
- Scheduler lokal deaktivierbar und Kill Switch getestet;
- kein Admin-Passwort und kein Service-Role-Key im Client oder Bericht.

## Zeitplan

Aktivfenster: 06:00 bis 00:00 Uhr, `Europe/Berlin`.

- Website alle 10 Minuten;
- acht RewirePerform-Ansichten alle 30 Minuten;
- produktionsnahe Testablaeufe um 07:15, 14:15 und 21:15;
- Repository-, Security-, Privacy-, Test- und Buildpruefung um 06:30;
- zusaetzlicher Repo-Lauf nach neuem `main`-Commit;
- nachts keine regulaere Produkt- oder KI-Pruefung;
- bei ausgeschaltetem Mac nur den neuesten verpassten Lauf nachholen.

## Acht Pflichtansichten

1. `daily_brief`
2. `system_health`
3. `tracking_quality`
4. `feedback_status`
5. `pilot_readiness`
6. `pilot_catalog`
7. `solo_readiness`
8. `evidence_status`

Ein Tagesstand ist nur vollstaendig, wenn alle benoetigten Ansichten aktuell und
schema-gueltig sind. Fehlende oder veraltete Daten ergeben `UNKNOWN`.

## Erfolgsmetriken

- 100 Prozent der geplanten Laeufe im Aktivfenster oder dokumentierter Catch-up;
- keine parallelen Doppellaeufe;
- keine doppelte Warnung fuer denselben Incident-Fingerprint;
- kein `GREEN` bei fehlender, veralteter oder unverbundener Quelle;
- kein Name, keine E-Mail, User-ID, Guardian-Adresse, Journal, Reflexion,
  Freitext oder individueller psychologischer Wert in Snapshot, Bericht oder
  Modellinput;
- `n < 5` immer unterdrueckt;
- Teilnehmer- und Guardian-Consent nie zusammengezogen;
- gesunde Tage erzeugen null Codex-Aufrufe;
- maximal zwei KI-Analysen und ein lokaler Fix-Branch pro Tag;
- R3-Befunde stoppen vor Implementierung;
- Berichte sind auf Deutsch, konkret und zwischen Fehler, Datenluecke, Risiko
  und Produktidee getrennt.

## Kontrollierte Stoerfaelle

Mindestens einmal im Schattenbetrieb simulieren:

1. Website-Timeout.
2. Eine veraltete Ansicht.
3. Unbekanntes Contract-Feld.
4. `401` oder falscher Key.
5. `429` mit genau einem Retry.
6. `503` mit genau einem Retry.
7. Redirect oder fremder Host.
8. Privacy-Canary in Feedback/Support.
9. `n = 4` in einer sensiblen Gruppe.
10. fehlender aktiver Data Lock.
11. neuer `main`-Commit mit gruenem CI.
12. reproduzierbarer synthetischer R2-Fehler.

Erwartet:

- korrekte Fehlerklasse;
- kein Quellenersatz;
- kein Secret im Log;
- keine KI bei einem deterministisch erklaerbaren Zustand;
- R2 hoechstens lokaler isolierter Branch;
- R3 nur Analyse und Freigabeanforderung.

## Bericht

Jeder Morgenbericht beantwortet:

- Was funktioniert?
- Was ist seit gestern neu oder schlechter?
- Welche echten Fehler wurden reproduziert?
- Welche Meldung ist nur Datenmangel?
- Wurde ein lokaler Fix vorbereitet?
- Welche Entscheidung braucht Mahle?
- Welche Quellen fehlen?
- Welche Aussagen sind durch die aktuelle Evidence erlaubt?

## Datenschutzkontrolle

Vor Abnahme werden alle erzeugten Dateien und Logs nach folgenden Canaries
durchsucht:

- synthetischer Name;
- synthetische E-Mail;
- Guardian-Adresse;
- Journal-Canary;
- Reflexions-Canary;
- Bearer/API-Key-Muster;
- UUID aus einem Testathleten;
- individuelle Mood-/Stress-/Assessmentwerte.

Jeder Treffer ausserhalb des dafuer vorgesehenen lokalen Test-Fixtures ist ein
rotes Gate.

## Abbruchkriterien

- false green;
- privater Inhalt in Bericht, Log oder KI-Prompt;
- Secret- oder Token-Leak;
- nicht freigegebener Production-Schreibzugriff;
- Push, Merge oder Deploy;
- mehr als ein Fix-Zyklus fuer denselben Incident;
- R3-Implementierung ohne Freigabe;
- fehlende Lock-/Idempotenzkontrolle;
- MahleOS behauptet Daten einer nicht verbundenen Quelle.

## Endabnahme

Nach 48 Stunden liefert der MahleOS-Agent:

- Zeitplan mit geplant/ausgefuehrt/verpasst/nachgeholt;
- Quellenstatus;
- Incidentliste mit Fingerprints;
- Privacy-Canary-Ergebnis;
- KI-Budgetverbrauch;
- lokale Branches und Tests;
- alle `UNKNOWN`/`NOT_CONNECTED`-Gruende;
- finalen Status `PASS`, `PASS WITH CONDITIONS` oder `FAIL`.

Erst nach `PASS` und separater Mahle-Freigabe darf die taegliche Automation
aktiviert werden.

