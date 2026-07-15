# Entscheidungspaket: Produkt, Minderjaehrige und Evidence

Stand: 15. Juli 2026

Status: entscheidungsreif vorbereitet, nicht aktiviert

Dieses Paket ergaenzt `docs/MINOR_EVIDENCE_ACTIVATION_SPEC.md`. Die bestehende Spezifikation behandelt den zusaetzlichen Evidence-Pfad. Fuer einen echten Pilot mit 15-Jaehrigen muss vorher auch der normale Produktpfad rechtlich und technisch geklaert sein.

## 1. Zwei getrennte Entscheidungen

### Ebene A: normales Produkt

Erforderlich fuer Account, Teamzuordnung, Tagesprogramm, Check-ins, Assessments, Fortschritt und optionale Erinnerungen. Hier muss verbindlich feststehen:

- Wer ist Verantwortlicher: RewirePerform, Verein oder gemeinsame Verantwortlichkeit?
- Welche Rechtsgrundlage gilt pro Datenart und Zweck?
- Welche Angaben werden als besondere Kategorie behandelt?
- Welche Zustimmung oder Autorisierung braucht ein 15-jaehriger Athlet?
- Was darf ein Coach im Produkt sehen?

Ohne freigegebene Ebene A darf ein 15-jaehriges Konto keine sensitiven Check-ins oder Assessments speichern.

### Ebene B: freiwilliger Datenbeitrag und Evidence/Forschung

Zusaetzlich und ablehnbar, ohne Nachteil fuer die Programmnutzung:

- interne Produkt-Evaluation;
- Pilotbericht fuer den Verein;
- aggregierte Praesentation;
- wissenschaftliche Analyse oder Human-Subject-Research;
- strukturierte Transfer- und Coach-Evidence.

Die Zwecke duerfen nicht als ein einziges pauschales Ja versteckt werden, wenn sie rechtlich oder in ihrer Reichweite verschieden sind.

## 2. Empfohlener Minimal-Flow

### Fuer alle Nutzer

1. Einmalige Auswahl `unter 16` oder `16 und aelter` vor der ersten sensitiven Eingabe.
2. Altersgruppe wird als Policy-Kategorie gespeichert; kein Geburtsdatum und keine Ausweiskopie.
3. Ein einfacher Link erklaert, warum die Abfrage notwendig ist.

### Fuer Nutzer unter 16

1. Athlet gibt eine Guardian-E-Mail ein oder der Verein sendet einen Einladungslink ausserhalb der Athleten-App.
2. System versendet einen einmaligen, kurzlebigen Link. Gespeichert wird nur ein gehashter Token.
3. Guardian liest Kurzfassung und vollstaendigen Text, bestaetigt Sorgeberechtigung sowie die konkrete Version.
4. Athlet liest danach einen eigenen kurzen Text und stimmt selbst zu oder lehnt ab.
5. Erst beide positiven, aktuellen Nachweise schalten Ebene A frei.
6. Ebene B bleibt eine separate freiwillige Entscheidung und kann spaeter aktiviert werden.

Kein Guardian-Account, kein taeglicher Extra-Schritt, kein Upload eines Ausweises und keine Wiederholung innerhalb derselben unveraenderten Policy-Version.

## 3. Empfohlene Datenstruktur

Nur nach Fachfreigabe implementieren:

### `participant_authorization_policies`

- `version`
- `jurisdiction`
- `product_consent_version`
- `guardian_notice_version`
- `athlete_assent_version`
- `evidence_scope_versions`
- `effective_from`
- `status`

### `participant_authorizations`

- `user_id`
- `age_band`
- `jurisdiction`
- `policy_version`
- `age_assurance_method`
- `guardian_authorized_at`
- `guardian_receipt_ref`
- `athlete_assented_at`
- `product_status`
- `evidence_scope_flags`
- `expires_at`
- `revoked_at`

### `guardian_authorization_challenges`

- gehashter Einmaltoken
- `expires_at`, `consumed_at`, `revoked_at`
- Rate-Limit- und Zustellstatus
- keine Klartextkopie des Tokens
- Guardian-E-Mail nur so lange und so geschuetzt wie fuer Nachweis, Support und Widerruf erforderlich

### `participant_authorization_audit`

- Policy-Version, Ereignistyp, Zeitpunkt, Actor-Kategorie und minimierte technische Nachweisreferenz
- kein Freitext, keine IP im Produkt-Audit, sofern nicht gesondert erforderlich und freigegeben

## 4. Technische Muss-Regeln

- Alters-/Guardian-Entscheidung wird serverseitig erzwungen.
- `profiles.data_contribution_consent` allein ist niemals ein Minderjaehrigen-Nachweis.
- Direkte Client-Updates koennen keinen Guardian- oder Assent-Status setzen.
- Guardian kann nicht im Namen des Jugendlichen assenten; Coach/Admin koennen beides nicht setzen.
- Ablehnung oder Widerruf beeinflusst das normale Programm nur, soweit Ebene A rechtlich zwingend ist; Ebene B hat nie einen Programmnachteil.
- `n >= 5` wird erst nach Consent-, Alters-, Rollen-, Testkonto- und Widerrufsfilter berechnet.
- Widerruf sperrt neue Erhebung und dynamische Auswertung sofort.
- Snapshot-/Backup-Wirkung des Widerrufs folgt einer vorab genehmigten Regel.
- Jede Zweck- oder Sichtbarkeitsaenderung erzeugt eine neue Version.
- Das aktive Protokoll `56d-transfer-v1-2026-07` bleibt unveraendert fuer Minderjaehrige gesperrt.

## 5. Entscheidungsfragen fuer Legal/Privacy

Diese Fragen muessen mit eindeutiger Antwort, Datum und verantwortlicher Person geschlossen werden:

| ID | Entscheidung | Empfohlener konservativer Default bis zur Antwort |
|---|---|---|
| D-01 | Verantwortlichkeit von RewirePerform und Verein | keine gemeinsame produktive Minderjaehrigenverarbeitung starten |
| D-02 | Rechtsgrundlage je Produktzweck | keine pauschale Vertragserfuellung fuer alle sensitiven Daten annehmen |
| D-03 | Behandlung von Mood, Wellbeing, Fragebogen und Assessment als besondere Daten | wie besondere Kategorie schuetzen |
| D-04 | Guardian-Erfordernis fuer 15-Jaehrige im Pilotland und Nutzungskontext | Guardian-Autorisierung plus Jugend-Assent verlangen |
| D-05 | ausreichende Alters- und Guardian-Verifikation | kurzlebiger Link plus dokumentierte angemessene Pruefung; keine reine Athleten-Selbstauskunft |
| D-06 | welche Evidence-Zwecke einzeln waehlbar sind | Produkt, interne Evaluation, Vereinsbericht und Forschung trennen |
| D-07 | Coach-Sicht und Teamaggregate | nur freigegebene Population, `n >= 5`, keine individuellen sensitiven Werte |
| D-08 | Widerrufswirkung auf Snapshots, Berichte und Backups | keine neue Nutzung; bestehende personenbezogene Artefakte sperren |
| D-09 | Aufbewahrung pro Tabelle, Log und Nachweis | kuerzeste betriebsfaehige Frist mit automatischer Loeschung |
| D-10 | Ethikvotum/Studienregistrierung | keine Forschungs- oder Wirksamkeitsbehauptung ohne Entscheidung |
| D-11 | Guardian-Kommunikation und Support | kein Coach als Ersatz-Consent; vertraulicher direkter Kanal |
| D-12 | Vorgehen bei widersprechenden Entscheidungen | jedes Nein oder jeder Widerruf sperrt den optionalen Pfad |

## 6. Noch zu erstellende versionierte Texte

Nach Beantwortung der Entscheidungen werden vier kurze, getrennte Texte benoetigt:

1. Produktinformation fuer Guardian.
2. Produkt-Assent fuer den Jugendlichen, verstaendlich fuer etwa 14 bis 15 Jahre.
3. Optionaler Datenbeitrag/Evidence fuer Guardian.
4. Optionaler Datenbeitrag/Evidence-Assent fuer den Jugendlichen.

Jeder Text muss Zweck, Daten, Sichtbarkeit, Empfaenger, Dauer, Freiwilligkeit, Widerruf, Kontakt und Folgen eines Nein enthalten. Apple kann bei gesundheitsbezogener Human-Subject-Research zusaetzlich Nachweise zu Risiken, Nutzen, Vertraulichkeit, Datenteilung, Ruecktritt und Ethikpruefung verlangen.

## 7. Abnahmetests vor Aktivierung

- 15-jaehriger Athlet ohne Guardian kann keine sensitiven Felder speichern.
- Guardian ja, Athlet nein: keine Freigabe.
- Athlet ja, Guardian offen: keine Freigabe.
- Beide ja fuer Produkt, Evidence nein: normales Programm funktioniert, keine Evaluation/Evidence.
- Alte oder falsche Version: keine Freigabe.
- Abgelaufener oder wiederverwendeter Token: blockiert und auditiert.
- Guardian- oder Athleten-Widerruf: sofort aus neuer Erhebung und Aggregation entfernt.
- Vier freigegebene plus eine nicht freigegebene Person: keine Teamwerte.
- Fuenf freigegebene plus eine nicht freigegebene Person: Teamwerte nur aus den fuenf.
- Coach/Admin kann Status nicht umgehen.
- Account-Loeschung entfernt Autorisierung, Challenge und personenbezogene Evidence nach Vertrag.
- Backup-/Restore-Test stellt geloeschte Konten nicht wieder aktiv bereit.

## 8. Freigabegrenze

Vor einer produktiven Implementierung braucht das Repo eine dokumentierte Entscheidung zu D-01 bis D-12 und finale Textversionen. Bis dahin sind erlaubt:

- read-only Audits;
- UI-Prototypen ohne produktive Speicherung;
- Schema- und Testentwurf in isoliertem Branch;
- synthetische Tests ohne Minderjaehrigendaten.

Nicht erlaubt sind Production-Migrationen, echter Guardian-Versand, Minor-Consent-Receipts oder die Aktivierung von `minor_collection_enabled`.
