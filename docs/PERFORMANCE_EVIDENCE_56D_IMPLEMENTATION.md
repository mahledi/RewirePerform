# Performance Evidence 56D: Implementierungsstand

Stand: 15. Juli 2026

Integrationsbranch: `codex/performance-evidence-integrated-20260714`

Dieser Stand ist auf dem aktuellen `origin/main` mit den App-Store- und Account-Loeschungsarbeiten integriert. Die Evidence-Migration `20260714224000` und die FK-Index-Haertung `20260715085749` wurden am 15. Juli 2026 kontrolliert auf Production `bqsbxesmybthwtxmowfz` angewendet. Die Migrationshistorie, Tabellen, RPC-Rechte, RLS, Protokollkonfiguration, Indizes und Minderjaehrigen-Sperre wurden danach gegen das echte Ziel geprueft. Es wurden dabei keine bestehenden Spieler- oder Trackingzeilen veraendert und keine Evidence-Teilnahme automatisch freigegeben.

## 1. Implementierter Umfang

### Athlete Transfer Pulse

- Versioniertes Protokoll `56d-transfer-v1-2026-07`.
- 16 feste Messpunkte an den Tagen 4, 7, 11, 14, 18, 21, 25, 28, 32, 35, 39, 42, 46, 49, 53 und 56.
- Genau eine strukturierte Verhaltensfrage pro Messpunkt.
- Vierstufige Antwort plus gleichwertiges `nicht beobachtet`.
- Der Pulse ersetzt die optionale freie Reflexion. Die Schrittzahl des Daily Check-ins steigt nicht.
- Die Bearbeitungsdauer des Pulse wird passiv und begrenzt erfasst. Es entsteht keine weitere Eingabe fuer den Athleten.
- Tages-Check-in und Pulse werden in einer Datenbanktransaktion gespeichert.
- Normale Check-ins fallen bei einem noch nicht migrierten Backend eng begrenzt auf `save_daily_tracking_v2` zurueck; Evidence-Antworten werden dabei niemals still verworfen.
- Bereits gesperrte Antworten sind idempotent; eine spaetere abweichende Ueberschreibung wird abgelehnt.
- Wenn der Evidence-Status nicht geladen werden kann oder nicht freigegeben ist, bleibt der bisherige Check-in-Flow nutzbar.

### Coach Weekly Review

- Strukturierte Team- und Einzelbeobachtung in fuenf verhaltensnahen Domains.
- Kein Pflicht-Freitext und Zielzeit unter 90 Sekunden.
- Die Bearbeitungsdauer wird intern passiv erfasst, um die reale Belastung gegen das 90-Sekunden-Ziel zu pruefen. Sie wird nicht als Coach-Leistungswert exportiert.
- Teamreview nur, wenn alle aktiven Athleten des Laufs fuer Evidence freigegeben sind.
- Einzelreview nur fuer freigegebene Athleten.
- Nur der eingebende Coach kann eine individuelle Beobachtung erneut oeffnen.
- Individuelle Coach-Werte sind aus aggregierten, externen und KI-Exports ausgeschlossen.
- Lade- und Speicherfehler blockieren die uebrige Coach-Ansicht nicht und werden ohne private Inhalte an das bestehende Monitoring gemeldet.

### Admin und Exporte

- Teilnahmefreigabe fuer intern verifizierte Erwachsene mit expliziter Bestaetigung.
- Kein Alters- oder Geburtsdatumsfeld im Evidence-Schema.
- Solo-Aggregat sowie Run-bezogene Exporte fuer JSON, Domain-, Wochen- und Coach-Team-Zusammenfassungen.
- Evidence-Coverage trennt erwartete, erhobene, fehlende, `nicht beobachtet` beantwortete und wegen Ruhetag bewusst uebersprungene Messpunkte.
- Erwartete Messpunkte beginnen erst ab aktueller Zustimmung und dokumentierter Teilnahmefreigabe; fruehere Programmtage werden nicht nachtraeglich als fehlend gewertet.
- Gesamtstichprobe, freigegebene Stichprobe und Ausschlussgruende werden getrennt ausgegeben. Nur Athleteninstanzen zaehlen in den Evidence-Nenner.
- Athletenaggregate werden bei `n < 5` unterdrueckt.
- Auch aggregierte Bearbeitungszeiten werden bei `n < 5` unterdrueckt.
- Coach-Teamwerte nutzen die kleinere Zahl aus beim Review beobachteter und aktuell freigegebener Teamgroesse; spaeter hinzugefuegte Personen koennen einen frueheren Kleinteamwert nicht nachtraeglich freischalten.
- `5 <= n < 10` wird als geringe Sicherheit markiert.
- Keine Namen, E-Mails, Journaltexte, Reflexionstexte oder individuellen Coach-Werte im Evidence Summary.

## 2. Minderjaehrige

Viele reale Nutzer werden minderjaehrig sein. Darum trennt die Implementierung das normale Produkt strikt von der zusaetzlichen Evaluation:

- Das normale 56-Tage-Programm bleibt fuer Minderjaehrige nutzbar.
- Die zusaetzliche Evidence-Erhebung ist fuer Minderjaehrige in Protokoll V1 technisch deaktiviert.
- Das Schema kann spaeter versionierte Sorgeberechtigten-Einwilligung und altersgerechte Zustimmung des Jugendlichen abbilden.
- Es existiert absichtlich keine RPC, mit der ein Admin diesen Minderjaehrigenpfad aktivieren kann.
- Eine Aktivierung braucht zuerst freigegebene Consent-Texte, Widerruf, Nachweisfluss, Datenschutzpruefung und Negativtests.
- Es wird fuer diesen Zweck weder Alter noch Geburtsdatum gespeichert.
- Die getrennte Aktivierungsspezifikation steht in `docs/MINOR_EVIDENCE_ACTIVATION_SPEC.md`.

## 3. Datenbank-Sicherheitsmodell

Alle sieben neuen Tabellen haben RLS aktiviert und entziehen `PUBLIC`, `anon` und `authenticated` jeden direkten Tabellenzugriff. Browserzugriffe laufen ausschliesslich ueber eng begrenzte `SECURITY DEFINER`-Funktionen mit festem `search_path`.

Neue Tabellen:

- `evidence_protocols`
- `evidence_transfer_schedule`
- `evidence_participation_eligibility`
- `evidence_eligibility_audit`
- `athlete_transfer_observations`
- `coach_evidence_reviews`
- `coach_evidence_observations`

Wesentliche RPCs:

- `get_my_evidence_status`
- `save_daily_tracking_v3`
- `set_evidence_adult_eligibility`
- `get_admin_evidence_eligibility`
- `get_coach_evidence_review_context`
- `save_coach_evidence_review`
- `get_my_transfer_evidence_summary`
- `get_performance_evidence_summary`

## 4. Gepruefte Invarianten

Der reproduzierbare Test `npm run test:evidence:sql` wendet die Migration auf PGlite als echte PostgreSQL-Laufzeit an und prueft:

- Migration laeuft vollstaendig durch.
- Adult-Freigabe und aktueller Consent oeffnen den geplanten Pulse.
- Doppelte identische Speicherung erzeugt keinen doppelten Datensatz.
- Abweichende Ueberschreibung einer gesperrten Antwort wird abgelehnt.
- Coach-Review speichert exakt fuenf Domains pro Ebene.
- Passive Athleten- und Coach-Bearbeitungszeiten werden in den vorgesehenen Grenzen gespeichert.
- Athletenwerte bei `n < 5` werden unterdrueckt.
- Passive Athleten-Bearbeitungszeiten bleiben bei `n < 5` ebenfalls verborgen und werden erst ab fuenf unterschiedlichen Athleten aggregiert ausgegeben.
- Individuelle Coach-Beobachtungen bleiben aus dem Summary ausgeschlossen.
- Summary enthaelt keine Athletenkennung.
- Minderjaehrigenpfad bleibt auch bei vorbereitetem Status deaktiviert.
- Evidence-Schema enthaelt keine Alters- oder Geburtsdatumsspalte.

Zusaetzliche Vitest-Pruefungen sichern Protokollparitaet, UI-Zustaende, Consent-Versionierung, Funktionsrechte und statische Privacy-Invarianten.

## 5. Noch nicht implementiert

Folgende Punkte gehoeren nicht zu diesem R4-Block und duerfen nicht als fertig dargestellt werden:

- PVT- oder Flanker-Task-Runner.
- Timing- und Retest-Validierung in der realen iOS-WKWebView.
- Data Lock und versionierter statistischer Analyseplan.
- Kausaler Wirksamkeitsnachweis oder Nachweis realer sportlicher Leistungssteigerung.
- Produktive Sorgeberechtigten- und Jugend-Consent-Strecke.
- Juristische Schlusspruefung der Datenschutz- und Einwilligungstexte.
- Sportartspezifische Solo-Exporte. Das bestehende Profilfeld `sport` ist Freitext und wird deshalb nicht ungeprueft als externe Evidence-Dimension ausgegeben; dafuer braucht es zuerst eine versionierte Taxonomie und eine bestaetigte Zuordnung.
- Der vollstaendige Dependency-Audit meldet zwei bereits bestehende entwicklungsseitige Vite/esbuild-Advisories. Produktionsabhaengigkeiten sind ohne Finding; die verifizierte Behebung erfordert einen getrennten Vite-8-Major-Upgrade und ist nicht Teil dieses Evidence-Branches.

## 6. Verifikation

- Echter TypeScript-Check fuer App- und Node-Konfiguration.
- Produktionsbuild und App-Store-Static-Checks.
- 24 Vitest-Dateien mit 140 erfolgreichen Tests.
- Migration und RPC-Verhalten in einer echten lokalen PostgreSQL-Laufzeit.
- Atomarer Rollback eines bereits begonnenen Daily-Saves bei spaetem Evidence-Fehler.
- Rollen-, RLS-, Consent-, Minderjaehrigen-, Mindest-n-, Missingness- und Export-Negativtests.
- Playwright auf Desktop Chromium, iPhone WebKit hoch und quer sowie iPad WebKit.
- Keine horizontale Ueberlaeufe, keine zu kleinen Touch-Ziele und keine Browserfehler in den geprueften Evidence-Flows.
- `npm audit --omit=dev`: 0 Findings.
- `git diff --check`: ohne Fehler.
- Interne Evidence-Vorschau ist im normalen Produktionsbuild nicht enthalten.
- Der vollstaendige Production-Build inklusive Capacitor-iOS-Sync und Kontrolle des eingebetteten Production-Supabase-Ziels ist nach der Integration erfolgreich durchgelaufen.
- Production enthaelt exakt `20260714224000_performance_evidence_56d_v1.sql` und `20260715085749_performance_evidence_fk_indexes.sql`; lokale und entfernte Migrationshistorie stimmen ueberein.
- Alle sieben Evidence-Tabellen haben RLS und entziehen `PUBLIC`, `anon` und `authenticated` direkten Tabellenzugriff.
- Alle zehn neuen Funktionen besitzen einen festen `search_path`; `anon` kann keine davon ausfuehren.
- Das aktive Protokoll enthaelt 16 Messpunkte, `minor_collection_enabled = false` und unmittelbar nach Aktivierung 0 produktive Evidence-Zeilen.
- Production-Typen wurden nach dem Apply neu aus dem echten Projekt generiert.
- Alle neun vom Datenbankberater gemeldeten fehlenden Evidence-FK-Indizes sind vorhanden; danach bleiben fuer die neuen Tabellen keine entsprechenden Hinweise offen.

## 7. Kontrollierter Production-Test

1. Fuer einen unmittelbaren visuellen Test die lokale Route `/internal/evidence-preview` verwenden; sie schreibt keine Daten.
2. Fuer einen echten Production-Test nur einen eindeutig als Testaccount markierten Erwachsenen verwenden.
3. Im Account die aktuelle freiwillige Datenfreigabe bestaetigen. Bei einem realen Erwachsenen muss ein Admin danach unter `Admin -> NLZ Evidence -> Evidence-Teilnahmefreigaben` die Volljaehrigkeit ausdruecklich bestaetigen.
4. Der Athlete Transfer Pulse erscheint nur an den geplanten Tagen 4, 7, 11, 14, 18, 21, 25, 28, 32, 35, 39, 42, 46, 49, 53 und 56 und nicht an Ruhetagen.
5. Coach Weekly Review nur mit einem Test-Team und einem aktiven Program Run pruefen. Individuelle Coach-Werte duerfen nicht im externen Evidence-Export erscheinen.
6. Nach dem Test in Admin die Coverage und den Export pruefen; Testdaten bleiben durch `is_test` von normalen Production-Auswertungen getrennt.
7. Minderjaehrige nicht fuer Evidence freigeben. Das normale Programm bleibt fuer sie nutzbar.
8. Daily Flow und Coach Review zusaetzlich auf einem realen iPhone pruefen, sobald Xcode/TestFlight bereit sind.

## 8. Aussagegrenze

Dieser Block kann verlaesslich Nutzungsabdeckung, strukturierte Selbstbeobachtung, strukturierte Coach-Teambeobachtung, Missingness und gruppierte Verlaeufe dokumentieren. Er beweist noch keine Kausalitaet und keine reale sportliche Leistungssteigerung. Diese Grenze wird im Export maschinenlesbar mitgeliefert.
