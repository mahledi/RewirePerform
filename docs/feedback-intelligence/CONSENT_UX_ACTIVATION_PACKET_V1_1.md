# Feedback Intelligence V1.1 – Consent-UX- und Aktivierungspaket

Status: lokaler Entwurf, nicht aktiviert  
Jurisdiktion: Deutschland  
Geltungsbereich: strukturierte Feedbackantworten, freiwillige Produktfeedback-Kommentare und minimierte Aktivitaetssnapshots

## B – Ziel

RewirePerform erklaert den Nutzen einer freiwilligen Datenfreigabe so klar, kurz und selbstverstaendlich, dass Athletinnen, Athleten und Sorgeberechtigte eine informierte Zustimmung ohne unnötige Reibung geben koennen.

Die Gestaltung fuehrt positiv zur Zustimmung. Trotzdem bleiben alle freiwilligen Entscheidungen:

- nicht vorausgewaehlt;
- zweckgebunden und getrennt;
- ohne versteckte Nachteile ablehnbar;
- spaeter genauso einfach widerrufbar wie erteilt;
- fuer Minderjaehrige altersgerecht und unter 16 zusaetzlich an den exakt passenden Guardian-Scope gebunden.

Das Ziel ist eine hohe **informierte Opt-in-Rate**, nicht eine erzwungene Zustimmung.

## A – Verifizierter Datenweg

Der fuer V1.1 vorgesehene Pfad ist:

1. RewirePerform speichert strukturierte Antworten und – nur nach eigener Einwilligung – bewusst geschriebene Produktfeedback-Kommentare in Supabase `eu-central-1`.
2. Ein eng begrenzter, verschluesselter Export entfernt direkte Identifikatoren und gibt nur den freigegebenen Scope ueber eine eigene Edge Function per HTTPS aus.
3. Das intern und lokal auf Mahles Mac betriebene Jarvis-System verbindet die freigegebenen Antworten im Arbeitsspeicher mit minimierten Aktivitaetssnapshots. Es persistiert weder den Rohkommentar noch die pseudonyme Nutzerreferenz oder eine zweite Rohtextkopie; erhalten bleiben nur zusammengefasste Auswertungen und Berichte.
4. Trainer erhalten weder Produktfeedback-Kommentare noch Journaltexte, private Reflexionen oder individuelle psychologische Rohwerte.

Dieser Pfad ist bislang mit synthetischen Staging-Daten nachgewiesen. Der echte
Production-Gateway, Reader und das Machine-Credential sind nicht aktiviert.
Derzeit erhaelt kein externer KI-Anbieter echte Produktfeedback-Kommentare. Wird
spaeter ein externer KI-Anbieter eingesetzt, benoetigt das vor der ersten
Uebermittlung eine neue konkrete Empfaengerinformation, eine neue versionierte
Einwilligung und einen erneuten Privacy-/App-Store-Review.

## Freigegebener Analyseumfang

Jarvis darf im freigegebenen V1.1-Scope verarbeiten:

- strukturierte Antworten der Feedback-Checkpoints;
- freiwillige Produktfeedback-Kommentare mit gueltiger Athleteneinwilligung;
- bei unter 16-Jaehrigen zusaetzlich nur bei gueltiger, exakt passender Guardian-Freigabe;
- Programmtag, Fragebogen-, Inhalts-, Produkt- und Consent-Version;
- pseudonyme Längsschnittreferenz;
- minimierte Aktivitaetswerte wie abgeschlossene Programmtage, Check-ins, Aufgaben und reine Journalanzahl.

Ausgeschlossen bleiben:

- Namen, E-Mail-Adressen und direkte Nutzer-, Team- oder Coach-IDs;
- Journaltexte, private Reflexionen und sonstige freie Antworten;
- individuelle Coach-Werte oder Coach-Freitexte;
- Werbung, Profiling, automatische Athletenentscheidungen oder Coach-Bewertungen;
- kausale Aussagen ueber sportliche Leistungssteigerung.

## UX-Vertrag

### Direkt vor einem freiwilligen Kommentar

- Der Nutzen steht zuerst: Die Rueckmeldung hilft, RewirePerform klarer und hilfreicher zu machen.
- Die Zustimmungsaktion ist der gruene, visuell primaere Button.
- Die sichtbare Alternative bleibt direkt darunter als neutrale Outline-Aktion.
- Es gibt keine Checkbox und keine Vorauswahl.
- Ein Kommentarfeld wird erst nach dem aktiven Ja sichtbar.
- Eine Ablehnung behaelt die strukturierte Antwort und veraendert das Programm nicht.

### Bei Sorgeberechtigten

- Produktzugang, Pilot-Auswertung und individuelle Feedbackkommentar-Analyse bleiben getrennte Entscheidungen.
- Die Feedbackfreigabe wird als eigener, hochwertiger Bereich sichtbar erklaert.
- Keine freiwillige Auswahl ist vorausgewaehlt.
- Unter 16 reicht die Guardian-Freigabe allein nicht: Die minderjaehrige Person entscheidet am Feedback-Checkpoint zusaetzlich selbst.

### Widerruf

- Aktive Einwilligungen sind in den Einstellungen sichtbar.
- Widerruf bleibt direkt erreichbar und benoetigt keine Begruendung.
- Kommentar und personenbeziehbare Analyseableitungen werden geloescht; strukturierte Antworten folgen ihrem getrennten Rechts-/Consent-Scope.

## Copy-Richtung fuer die neue versionierte Einwilligung

Die neue Copy soll in dieser Reihenfolge informieren:

1. **Nutzen:** Was die zusaetzliche Rueckmeldung fuer Athleten und Produktverbesserung ermoeglicht.
2. **Daten:** Kommentar plus pseudonymisierte strukturierte Feedback- und Aktivitaetsdaten.
3. **Verarbeitung:** intern betriebener, eng begrenzter Jarvis-Pfad; aktuell kein externer KI-Anbieter.
4. **Grenzen:** kein Coach, keine Werbung, keine Personalisierung, keine automatische Entscheidung.
5. **Kontrolle:** jederzeitiger Widerruf.

Die finale sichtbare Copy, Consent-Version und beide Notice-Hashes werden als ein untrennbarer Vertrag aktualisiert. Alte Receipts werden nicht still auf eine neue Version umgedeutet.

## Delta vor Aktivierung

- [x] neue Athleten-Copy lokal finalisieren und hashen;
- [x] neue Guardian-Copy lokal finalisieren und hashen;
- [x] neue Consent- und Guardian-Policy-Version als additive Draft-Migration registrieren;
- [x] vier Draft-Kampagnen lokal auf die neue Consent-Version und den neuen Athleten-Hash pinnen;
- [x] V0.3-Producer-Paket lokal auf die neuen Consent- und Guardian-Bytes pinnen;
- [ ] Jarvis-/Consumer-Annahme und nachgelagerte Gateway-Pins auf Basis der exakten finalen Bytes;
- [x] Datenschutzseite und App-Store-Datentypen lokal angleichen;
- [ ] deutsche Rechts-/Privacy-/Minderjaehrigenpruefung dokumentieren;
- [ ] Staging-Negativtests, Widerruf und Loeschung beweisen;
- [ ] echter iPhone-Test einschliesslich unter-16-Flow;
- [ ] erst danach getrennte Merge-, Production-, Jarvis- und App-Store-Entscheidung.

## Externe Mindestregeln

- Apple App Review Guidelines 5.1.1 und 5.1.2: klare Einwilligung, wahrheitsgemaesse Privacy-Angaben, zugänglicher Widerruf und ausdrueckliche Erlaubnis vor einer Weitergabe personenbezogener Daten an Drittanbieter-KI.
- DSGVO-Einwilligung: informiert, spezifisch, freiwillig, durch positive Handlung und ohne Nachteil widerrufbar.

Quellen:

- https://developer.apple.com/app-store/review/guidelines/
- https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/legal-grounds-processing-data/grounds-processing/when-consent-valid_en
