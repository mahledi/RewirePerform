# Pruefpaket fuer Minderjaehrigen- und Guardian-Flow

Stand: 18. Juli 2026

Status: Produkt- und Technikentscheidungen eingetragen; qualifizierte Rechts-/Privacy-Pruefung vor realen Minderjaehrigen weiterhin erforderlich

## 1. Pruefauftrag

Bitte beurteilen Sie den geplanten freiwilligen RewirePerform-Pilot in Deutschland mit Athletinnen und Athleten ab 15 Jahren. Gesucht werden verbindliche, schriftliche Entscheidungen fuer den Produktbetrieb einschliesslich Tracking sowie getrennt fuer darueber hinausgehende Auswertungen zur Performance- und Produktoptimierung. Medizinische oder gesundheitsbezogene Forschung ist nicht Zweck des Piloten.

Dieses Paket soll keine Zustimmung nahelegen. Eine Ablehnung darf keinen sportlichen Nachteil ausloesen. Trainer koennen weder fuer Sorgeberechtigte noch fuer Jugendliche entscheiden. Der Verein ist weder Actor noch Empfaenger oder Freigabestelle dieses Flows.

## 2. Feststehende Produktfakten

- 56-Tage-Programm fuer mentale Leistungsfaehigkeit und Reflexion im Sport;
- kein Medizinprodukt, keine Diagnose und kein Krisendienst;
- Account, Teamzuordnung, Programmfortschritt, Check-ins, Assessments und private Journale;
- Journal- und Freitexte sind nicht fuer Trainer sichtbar und nicht Bestandteil von Teamaggregaten;
- optionale Push-Erinnerungen;
- aktives Tracking fuer Produktbetrieb, individuellen Fortschritt und Performance-Optimierung;
- getrennte Entscheidung fuer Auswertungen, die ueber den eigenen Produktbetrieb hinausgehen;
- Teamaggregate erst nach Berechtigungsfilter und ab mindestens fuenf Personen;
- keine medizinische Diagnose, Behandlung oder Gesundheitsforschung;
- keine kausale Wirksamkeitsbehauptung allein aus Pilot- oder Beobachtungsdaten;
- keine Marketing-E-Mails an Guardians;
- Supabase fuer Auth, Datenbank und den implementierten serverseitigen Flow;
- Guardian-E-Mail soll vom Athleten selbst eingegeben werden; kein Elternkonto und keine Ausweiskopie;
- Guardian-Link soll kurzlebig, einmal nutzbar und serverseitig gehasht sein;
- Athlet muss nach positiver Guardian-Entscheidung selbst altersgerecht zustimmen.

## 3. Verbindlich zu entscheidende Fragen

Bitte je Zeile Entscheidung, Begruendung, verantwortliche Person und Datum dokumentieren.

| ID | Frage | Konservativer technischer Default bis zur Freigabe | Entscheidung |
|---|---|---|---|
| L-01 | Bestaetigung, dass Mahle Herzog als Betreiber von RewirePerform alleiniger Verantwortlicher ist und der Verein keine Rolle im Flow oder Datenempfang hat | Produktentscheidung eingetragen; keine Aktivierung vor Fachpruefung | fachlich offen |
| L-02 | Sind Mahle Herzog, Wiefeldick 16, 42699 Solingen, Deutschland und hello@rewireperform.com als vollstaendige Angaben ausreichend? | in Impressum, Privacy und Guardian-Kommunikation eingetragen | fachlich offen |
| L-03 | Welche Rechtsgrundlage gilt je Produktdatenart und Zweck? | sensitive Writes gesperrt | offen |
| L-04 | Sind Check-ins, Assessments oder andere Angaben im Kontext besonders geschuetzte Daten? | wie besondere Daten schuetzen | offen |
| L-05 | Ist die Produktentscheidung zulaessig: unter 16 duale Freigabe, mit 16 oder 17 eigene altersgerechte Entscheidung im Deutschland-Flow? | technisch so implementiert; Rollout-Enforcement standardmaessig aus | fachlich offen |
| L-06 | Reicht E-Mail-Besitz plus aktive Sorgeberechtigten-Erklaerung als angemessene Verifikation? | technisch implementiert, aber nicht fuer reale Minderjaehrige aktiviert | fachlich offen |
| L-07 | Welche zusaetzliche datensparsame Verifikation waere andernfalls erforderlich? | erweiterbaren Serververtrag vorsehen | offen |
| L-08 | Welche Produktfunktionen duerfen bei Nein angeboten werden? | keine sensitiven Funktionen; kein Teamnachteil | offen |
| L-09 | Welche Tracking-Verarbeitung ist fuer Produktbetrieb und individuellen Fortschritt erforderlich, und welche weitergehenden Performance-Auswertungen brauchen eine getrennte Entscheidung? | nur freigegebener Produktbetrieb | offen |
| L-10 | Bestaetigung der Trainer-Sicht: individuell nur Aktivitaet und Tagesabschluesse, keine Check-in-, Journal-, Assessment- oder Freitextantworten; Aggregate nur nach Freigabe und Mindest-n | keine privaten Inhalte oder individuellen Antworten | offen |
| L-11 | Sind sieben Tage fuer Challenges, bis zu 370 Tage fuer den aktiven gehashten Guardian-Widerrufslink, drei Jahre ab Ereignis fuer minimierte Receipts, 30 Tage fuer App-Fehler und 90 Tage fuer Push-Logs angemessen; welche verbindliche Provider-Backup-Frist gilt? | Codefristen implementiert; Provider-Backup bleibt Release-Gate | teilweise entschieden |
| L-12 | Wie wirkt Widerruf auf laufende Verarbeitung, Exporte, Snapshots, Aggregate und Backups? | neue Nutzung sofort sperren | offen |
| L-13 | Welche Informationspflichten gelten bereits in der ersten Guardian-E-Mail? | Quelle, Zweck, Freiwilligkeit, Kontakt, Frist nennen | offen |
| L-14 | Bestaetigung, dass die beschriebene Performance- und Produktoptimierung keine gesundheitsbezogene Forschung ist; getrennte Voraussetzungen fuer eine spaetere wissenschaftliche Studie dokumentieren | keine Gesundheitsforschung oder kausale Wirksamkeitsbehauptung | offen |
| L-15 | Welche Altersfreigabe und Angaben sind fuer App Store Connect korrekt? | nicht als Kids-App positionieren | offen |

## 4. Textpaket zur Pruefung

Die aktuellen Implementierungstexte liegen versioniert in:

- `src/content/minorPolicy.ts` (produktiver kanonischer Vertrag)
- `src/content/minorGuardianDraft.ts` (interne Review-Vorschau)
- produktive Routen: `/minor-consent` und `/guardian/decision`
- DEV-Vorschau: `/internal/minor-consent-preview`

Bitte insbesondere pruefen:

- Verstaendlichkeit fuer etwa 14- bis 15-Jaehrige;
- echte Freiwilligkeit und Folgen eines Nein;
- Trennung von Produkttracking, weitergehender Performance-Auswertung und einer spaeteren wissenschaftlichen Studie;
- Vollstaendigkeit zu Daten, Sichtbarkeit, Empfaengern und Rechten;
- Quelle und Zweck der Guardian-Adresse beim ersten Kontakt;
- Zulassigkeit der Formulierung zur Trainer-Sicht;
- notwendige Controller-, Anschrift-, Provider- und Fristangaben;
- Widerrufsweg fuer Guardian und Athlet;
- Angemessenheit der Guardian-Verifikation.

Keine Version darf nach der Pruefung still ueberschrieben werden. Die aktuelle Policy besitzt getrennte Versionskennungen und einen SHA-256-Inhaltshash. Jede fachlich verlangte Textaenderung braucht eine neue Version, neues Wirksamkeitsdatum und neuen Hash.

## 5. Noch benoetigte externe Bestaetigungen

- rechtliche Eignung der benannten natuerlichen Person, Privatanschrift und Kontaktangaben;
- DPA-/AVV-Status von Supabase, Vercel und Resend fuer den konkreten Betrieb;
- verbindliche providerseitige Backup-Loeschfrist und Restore-Prozess;
- reale Datenexport-, Auskunfts-, Widerrufs- und Loeschprozesse;
- fachliche Bestaetigung der Regel fuer 16- bis 17-Jaehrige;
- fachliche Bestaetigung der Sorgeberechtigten-Selbsterklaerung;
- schriftliche Bestaetigung, dass der Verein nicht am Guardian-Flow beteiligt ist und keine Daten daraus erhaelt;
- Bestaetigung der App-Store-Privacy-Angaben gegen den finalen nativen Binary-Report.

## 6. Guardian-Kommunikation

Der erste Kontakt soll sachlich sein und darf keine Werbung oder psychologischen Druck enthalten. Er nennt:

- dass das Kind die Adresse angegeben hat;
- warum die Nachricht versendet wird;
- dass kein Elternkonto erforderlich ist;
- dass Nein keinen sportlichen Nachteil verursacht;
- dass der Link persoenlich, einmal nutzbar und zeitlich begrenzt ist;
- dass die Adresse nicht fuer Marketing verwendet wird;
- einen direkten Kontakt fuer Fragen, Rechte und Widerruf.

Die Nachricht darf keine privaten Leistungs-, Mental-, Team- oder Gesundheitsdaten des Kindes enthalten.

## 7. Apple- und Pilotnachweise nach Freigabe

Vor TestFlight oder App-Store-Einreichung werden mindestens benoetigt:

- finale Privacy Policy mit Verantwortlichem, Anschrift, Datenmatrix und realen Fristen;
- korrekte App-Privacy-Angaben fuer Kontakt-, Nutzungs-, sensible und Diagnosedaten;
- Altersfreigabe, Review Notes und erklaerter Minderjaehrigenpfad;
- Reviewer-Konto fuer Erwachsenenpfad und dokumentierter Minderjaehrigen-Testpfad;
- Nachweis, dass Account-Loeschung, Widerruf und Support erreichbar sind;
- echte iPhone-Tests fuer E-Mail-Link, Universal Link, Dynamic Type, VoiceOver und Offline-Situationen;
- kontrollierter Staging-Test ohne reale Minderjaehrigendaten vor dem Pilot;
- dokumentierte Abnahme der serverseitigen Sperren, RLS, Rate Limits und Loeschung.

## 8. Freigabeprotokoll

| Rolle | Name | Umfang | Datum | Ergebnis/Version |
|---|---|---|---|---|
| Product Owner | Mahle Herzog | Produktentscheidungen und sichtbare Betreiberangaben | 18.07.2026 | fuer lokale Implementierung freigegeben |
| qualifizierte Rechts-/Privacy-Pruefung |  | L-01 bis L-15 und Texte |  |  |
| Security Review |  | Datenmodell, Token, Abuse, Logs |  |  |
| Engineering Review |  | serverseitige Durchsetzung und Tests |  |  |

Erst ein vollstaendiges Protokoll schliesst den fachlichen Teil des Gates. Die technische Aktivierung braucht danach weiterhin einen eigenen, expliziten Implementierungs- und Deployment-Entscheid.

## 9. Gepruefte Primaerquellen

Stand der Quellenpruefung: 18. Juli 2026. Diese Referenzen begruenden den technischen und redaktionellen Default, ersetzen aber keine fallbezogene Rechtsberatung.

- Apple App Review Guidelines: insbesondere 1.5 (erreichbare Kontaktangaben), 2.1 (vollstaendige und auf echten Geraeten getestete App), 2.3.6 (ehrliche Altersfreigabe) sowie 5.1.1 (Datenschutz, Einwilligung, Widerruf, Datenminimierung und In-App-Kontoloeschung): https://developer.apple.com/app-store/review/guidelines/
- Apple App Store Connect Help zur Altersfreigabe und zu moeglichen hoeheren Overrides: https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/
- DSGVO, insbesondere Art. 7 (klare, freiwillige und ebenso leicht widerrufbare Einwilligung), Art. 8 (Schwelle 16 und angemessene Bemuehungen zur Sorgeberechtigten-Pruefung) sowie Art. 13: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- § 5 DDG zu leicht erkennbaren, unmittelbar erreichbaren und staendig verfuegbaren Anbieterangaben: https://www.gesetze-im-internet.de/ddg/__5.html
- Supabase-Dokumentation zu CORS und Authentifizierung von Edge Functions: https://supabase.com/docs/guides/functions/cors und https://supabase.com/docs/guides/functions/auth
- Resend-Dokumentation: Open- und Link-Tracking sind standardmaessig aus, koennen aber auf Domain-Ebene aktiviert werden und muessen deshalb vor Produktion real kontrolliert werden: https://resend.com/docs/dashboard/domains/tracking
