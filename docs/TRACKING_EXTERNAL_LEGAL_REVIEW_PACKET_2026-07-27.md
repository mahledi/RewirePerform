# External Legal and Privacy Review Packet

Stand: 27. Juli 2026

Status: konsolidierter Pruefauftrag; keine Rechtsfreigabe.

## Zweck

Dieses Paket ist fuer eine qualifizierte deutsche Rechts-/Datenschutzpruefung
vor einem Pilot mit Minderjaehrigen und vor oeffentlichen Evidence- oder
Wirksamkeitsaussagen bestimmt.

Es ersetzt keine Rechtsberatung. Technische Tests koennen die korrekte
Durchsetzung beweisen, aber nicht die Rechtsgrundlage oder Zulassigkeit einer
Werbeaussage verbindlich feststellen.

## Produktfakten

- 56-Tage-Mental-Performance-Programm fuer Athleten;
- kein Medizinprodukt, keine Diagnose und kein Krisendienst;
- wiederholte Check-ins, Assessments, Transfer-Pulse und
  Verstaendnismessungen;
- private Journale und Reflexionen;
- Team- und Coachfunktionen;
- individuelle Coachsicht nur auf operative Aktivitaet;
- psychologische oder mentale Werte nur aggregiert ab `n >= 5`;
- bei `5 <= n < 10` Kennzeichnung als kleine Datenbasis;
- getrennte Einwilligung fuer Produktnutzung und weitergehende
  Evidence-Auswertung;
- bei Minderjaehrigen getrennte Guardian- und Athletenfreigabe;
- Data Locks und Exporte enthalten keine Namen, E-Mails, Rohantworten,
  Journale oder individuellen Scores;
- keine Werbe-, Broker- oder Cross-App-Tracking-Nutzung.

## Verbindlich zu pruefende Entscheidungen

| ID | Frage | Technischer Default |
|---|---|---|
| R-01 | Wer ist Verantwortlicher, und welche Rolle haben Verein/Coach? | Verein erhaelt keine Guardian-Daten; Coach nur definierte operative Sicht |
| R-02 | Welche Daten fallen unter Art. 9 DSGVO oder vergleichbar sensible Kategorien? | Check-ins und mentale Angaben wie besonders sensible Daten schuetzen |
| R-03 | Welche Rechtsgrundlage gilt je Zweck: Produktbetrieb, Personalisierung, Teamfunktion, Evidence, Support, Security? | Zwecke getrennt, Evidence opt-in |
| R-04 | Ist der Deutschland-Flow unter 16 mit Guardian plus Athleten-Assent und ab 16 mit eigener Entscheidung tragfaehig? | technisch implementierter konservativer Default |
| R-05 | Reicht die datensparsame Guardian-Verifikation per E-Mail-Besitz und Selbsterklaerung? | keine Ausweiskopie; reale Aktivierung nur nach externer Freigabe |
| R-06 | Welche Folgen darf ein Nein haben, ohne Freiwilligkeit zu unterlaufen? | Produktnutzung und Teamteilnahme duerfen nicht vom Evidence-Opt-in abhaengen |
| R-07 | Welche Widerrufsfolge gilt fuer dynamische Aggregate, bereits erstellte Data Locks, Berichte und Backups? | neue Verarbeitung sofort stoppen; historische Locks nicht neu ausliefern |
| R-08 | Welche festen Fristen gelten je Datenklasse und Provider-Backup? | bestehende Vorschlaege erst nach schriftlicher Freigabe verbindlich machen |
| R-09 | Sind Support-, Incident- und Loeschprotokolle ausreichend minimiert? | keine privaten Inhalte, E-Mails oder mentalen Einzelwerte in Betriebslogs |
| R-10 | Sind App-Store-Datenkarte, Privacy Manifest und Privacy Policy deckungsgleich? | alle serverseitig gespeicherten Kategorien als linked behandeln |
| R-11 | Ist der Pilot reine Produktevaluation oder bereits Forschung am Menschen? | keine Forschungs- oder Kausalaussage ohne gesondertes Protokoll |
| R-12 | Falls gesundheitsbezogene Forschung: Ist ein unabhaengiges Ethikvotum erforderlich? | keine Aktivierung eines Forschungsclaims ohne schriftliche Entscheidung |
| R-13 | Welche Formulierungen sind fuer Website, Investoren, Vereine und NLZ zulaessig? | nur beobachtete, klar begrenzte Ergebnisse |
| R-14 | Wann darf „RewirePerform verursachte ...“ gesagt werden? | nur nach geeignetem vorab definiertem Kausaldesign |
| R-15 | Welche Mindestangaben muessen Guardian-Mail, Consent-Screen und Privacy Policy enthalten? | Zweck, Dauer, Empfaenger, Freiwilligkeit, Kontakt, Widerruf |

## Apple-spezifischer Risikopunkt

Apple verlangt bei gesundheitsbezogener Forschung mit Menschen:

- Einwilligung der Teilnehmenden beziehungsweise bei Minderjaehrigen des
  Guardians;
- Angaben zu Art, Zweck, Dauer, Verfahren, Risiken, Nutzen, Vertraulichkeit,
  Kontakt und Widerruf;
- Genehmigung durch ein unabhaengiges Ethics Review Board.

Darum muss extern geklaert werden, ab wann RewirePerform mit der geplanten
Evidence-Auswertung nicht mehr nur Produktevaluation, sondern
gesundheitsbezogene Forschung betreibt. Die Bezeichnung „eigene Studie“ oder
ein breiter Wirksamkeitsclaim kann diese Einordnung beeinflussen.

## Claims

### Technisch und redaktionell zulaessig, wenn die Daten vorliegen

- „X von Y Teilnehmenden nutzten das Programm bis Tag 28.“
- „Bei den consentierten Teilnehmenden wurde eine beobachtete Veraenderung in
  der definierten In-App-Messung erfasst.“
- „Trainer berichteten in einer strukturierten Beobachtung Veraenderungen in
  den vorab benannten Verhaltensbereichen.“
- „Die Aussage basiert auf `n`, Missingness, Zeitraum und dokumentiertem
  Analyseplan.“

### Ohne staerkeres Design nicht zulaessig

- „RewirePerform steigert sportliche Leistung.“
- „RewirePerform hat die Qualifikation verursacht.“
- „Wissenschaftlich bewiesen“ ohne angemessenes Design und unabhaengige
  Pruefung.
- Diagnosen, Persoenlichkeitsurteile oder medizinische Wirkung.

Das UWG nennt insbesondere Angaben ueber zu erwartende Ergebnisse und
Testergebnisse als moegliche Quelle irrefuehrender Geschaeftshandlungen. Jede
oeffentliche Wirkungsaussage braucht daher den passenden Datenbeleg und die
sichtbare Aussagegrenze.

## Aufbewahrung und Loeschung

Zu bestaetigen sind mindestens:

- aktive Account- und Programmdaten bei Kontoloeschung;
- Backup-Rotation und Deletion-Replay nach Restore;
- Guardian-Challenges und minimierte Receipts;
- Incident-, Push-, Support- und Feedbackdaten;
- Evidence-Rohdaten, Data Locks und vollstaendig anonyme Aggregate;
- Widerrufs- und Auskunftsprozess;
- reale Fristen bei Supabase, Vercel, Resend/Zoho und Apple.

Pseudonymisierte Daten bleiben personenbezogen. `n >= 5` allein beweist keine
Anonymitaet, besonders bei kleinen Teams, seltenen Sportarten oder
kombinierten Zeit-/Positionsmerkmalen.

## App Privacy

Der finale Binary-, Provider- und Datenbankabgleich muss mindestens pruefen:

- Name und E-Mail;
- Health/Fitness beziehungsweise sensible mentale Angaben;
- Customer Support;
- Other User Content fuer Freitext;
- User ID;
- Product Interaction;
- Other Diagnostic Data;
- keine Tracking-Nutzung;
- alle mit Account/Instanz verknuepften Daten als `Linked to User`.

Apple weist darauf hin, dass WebView-Datenerhebung ebenfalls deklariert werden
muss und laufend erhobene Daten nicht als nur „gelegentlich optional“ behandelt
werden duerfen.

## Primaerquellen

- Apple App Review Guidelines:
  https://developer.apple.com/app-store/review/guidelines/
- Apple Account Deletion:
  https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Apple App Privacy Details:
  https://developer.apple.com/app-store/app-privacy-details/
- Apple App Store Connect Privacy:
  https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy
- DSGVO/BDSG mit Art. 8:
  https://www.bfdi.bund.de/SharedDocs/Downloads/DE/Broschueren/INFO1.pdf
- EDPB Guidelines 1/2026 zu wissenschaftlicher Forschung:
  https://www.edpb.europa.eu/public-consultations/guidelines-12026-on-processing-of-personal-data-for-scientific-research_en
- EDPB Consent Summary:
  https://www.edpb.europa.eu/system/files/2026-04/edpb-summary-consent_en.pdf
- UWG Paragraph 5:
  https://www.gesetze-im-internet.de/uwg_2004/__5.html

## Unterschriften

| Rolle | Name | Datum | Umfang | Ergebnis |
|---|---|---|---|---|
| Product Owner | Mahle Herzog |  | Produktfakten |  |
| Rechtspruefung |  |  | R-01 bis R-15 |  |
| Datenschutzpruefung |  |  | Datenkarte, Fristen, Betroffenenrechte |  |
| Security Review |  |  | technische Durchsetzung |  |
| Engineering |  |  | finale Implementierungsparitaet |  |

