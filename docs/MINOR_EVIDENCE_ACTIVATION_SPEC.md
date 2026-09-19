# Minderjaehrigen-Evidence: Aktivierungsspezifikation

Stand: 14. Juli 2026

Status: technisch vorbereitet, bewusst nicht aktiviert

Diese Spezifikation ist kein Rechtsgutachten. Sie beschreibt den kleinsten professionellen Produkt-, Daten- und Testumfang, der vor einer Evidence-Erhebung mit Minderjaehrigen fachlich und rechtlich freigegeben werden muss.

## 1. Aktuelle Grenze

- Minderjaehrige koennen das normale 56-Tage-Programm nutzen.
- Der zusaetzliche Transfer-Pulse und Coach-Evidence-Review bleiben fuer sie im Protokoll `56d-transfer-v1-2026-07` deaktiviert.
- Eine normale Datenbeitragsentscheidung des Jugendlichen aktiviert diesen Pfad nicht.
- Ein Admin kann den Minderjaehrigenpfad nicht ueber die Erwachsenenfreigabe umgehen, ohne wahrheitswidrig eine externe Volljaehrigkeitspruefung zu bestaetigen.
- Das Evidence-Schema speichert weder Alter noch Geburtsdatum.
- Vor Aktivierung muss ein neues Protokoll mit neuen Consent-Versionen angelegt werden. Das bestehende V1-Protokoll wird nicht nachtraeglich umgedeutet.

## 2. Vorher verbindlich zu entscheiden

Die folgenden Punkte brauchen eine dokumentierte fachliche und rechtliche Entscheidung:

1. Rechtsgrundlage fuer normales Produkt, Evaluation und eine spaetere Forschungsnutzung jeweils getrennt.
2. Laender- und altersabhaengige Regel: Wer kann selbst einwilligen, wann ist eine sorgeberechtigte Person erforderlich und wann wird aus Produktvorsicht eine strengere Regel genutzt?
3. Ob Check-ins, Assessments und Transferbeobachtungen im konkreten Nutzungskontext als besonders geschuetzte Daten behandelt werden muessen.
4. Welche Evidence-Zwecke einzeln waehlbar sind: interne Produktverbesserung, Pilotbericht, wissenschaftliche Auswertung, externer aggregierter Bericht.
5. Wie Sorgeberechtigung belastbar, aber datensparsam nachgewiesen wird.
6. Wie der Jugendliche altersgerecht und ohne Druck selbst zustimmt.
7. Welche Entscheidung gilt, wenn Sorgeberechtigter oder Jugendlicher widerruft oder sich beide widersprechen.
8. Aufbewahrung, Loeschung, bereits erzeugte Snapshots und Widerrufswirkung.
9. Ob und in welchem Umfang individuelle Coach-Beobachtungen bei Minderjaehrigen ueberhaupt zulaessig und fachlich sinnvoll sind.
10. Verantwortlichkeiten zwischen RewirePerform, Verein, Coach und Sorgeberechtigten.

Ohne diese Entscheidungen bleibt `minor_collection_enabled = false`.

## 3. Empfohlenes Autorisierungsmodell

Eine Aktivierung braucht zwei voneinander unabhaengige positive Nachweise:

- `guardian_authorized`: Die erforderliche sorgeberechtigte Person hat der konkreten, versionierten Evidence-Nutzung zugestimmt.
- `athlete_assented`: Der Jugendliche hat eine kurze, verstaendliche Erklaerung gelesen und selbst aktiv zugestimmt.

Nur wenn beide Nachweise aktuell, nicht widerrufen und fuer dasselbe Protokoll gueltig sind, darf der Server `eligible_minor` liefern.

Feste Regeln:

- Kein vorausgewaehltes Ja.
- Normale App-Nutzung bleibt bei Nein oder Widerruf unveraendert moeglich.
- Coach, Verein und Admin sehen nicht, welche konkrete Person Nein gesagt hat, ausser dies ist fuer einen kontrollierten Einladungsprozess zwingend erforderlich und rechtlich freigegeben.
- Keine Belohnung, kein Streak-Nachteil und kein Teamdruck fuer Evidence-Teilnahme.
- Jede neue Zweck-, Daten- oder Sichtbarkeitsaenderung erzeugt neue Consent- und Assent-Versionen.

## 4. Datensparsame Alters- und Guardian-Pruefung

Das Evidence-System braucht kein Geburtsdatum. Es braucht nur einen belastbaren Autorisierungsstatus fuer die geltende Policy.

Empfohlene gespeicherte Attribute:

- `authorization_policy_version`
- `jurisdiction`
- `participant_category`, zum Beispiel `guardian_required` oder `self_consent_permitted`
- `age_assurance_method`
- `age_assurance_verified_at`
- `guardian_consent_version` und `guardian_consented_at`
- `athlete_assent_version` und `athlete_assented_at`
- `scope_flags`
- `status`, `expires_at`, `revoked_at`
- Audit-Actor und technische Nachweisreferenz

Nicht im Evidence-Kern speichern:

- Ausweiskopie
- Geburtsdatum
- Freitext zur Familienbeziehung
- unverschluesselte Guardian-Tokens
- private Nachricht zwischen Verein, Eltern und Jugendlichem

Eine reine Selbstauskunft ist fuer einen sensiblen Evidence-Pfad nicht ausreichend belastbar. Die konkrete Methode muss proportional, datensparsam und vor Aktivierung freigegeben sein.

## 5. Technischer Zielaufbau

Neue, getrennte Entitaeten:

- `evidence_authorization_policies`: unveraenderliche Policy-, Consent- und Assent-Versionen.
- `minor_evidence_authorizations`: aktueller zusammengesetzter Autorisierungsstatus je Programminstanz.
- `guardian_authorization_challenges`: kurzlebige Einladungen mit ausschliesslich gehashten Tokens, Ablaufzeit und Rate-Limit-Metadaten.
- `minor_evidence_authorization_audit`: append-only Historie fuer Erteilung, Erneuerung und Widerruf.

Serverregeln:

- Keine direkten Tabellenrechte fuer `anon` oder `authenticated`.
- Guardian-Aktionen nur ueber eine eng begrenzte, rate-limitierte Server- oder Edge-Function.
- Token nur einmal nutzbar, kurzlebig und ausschliesslich gehasht gespeichert.
- Ein Admin darf Status sehen, aber weder Consent im Namen des Guardians noch Assent im Namen des Jugendlichen setzen.
- Jede Save-RPC sperrt Consent-, Assent- und Profilstatus bis Transaktionsende, damit ein paralleler Widerruf eindeutig vor oder nach dem Save gilt.
- Widerruf schliesst die Person sofort aus neuen Erhebungen und dynamischen Exporten aus.
- Bereits gesperrte Evidence-Snapshots brauchen eine separat freigegebene Widerrufs- und Loeschregel.
- `minor_collection_enabled` wird nur in einer neuen, versionierten Protokollmigration aktiviert.

## 6. Jugend-UX

Der Jugendliche sieht vor der ersten Evidence-Erhebung eine kurze eigene Entscheidung:

- Was wird zusaetzlich erhoben?
- Wofuer wird es verwendet?
- Was sieht der Coach und was nicht?
- Freie Texte und Journale werden nicht verwendet.
- Ein Nein veraendert das Programm nicht.
- Wie kann die Entscheidung spaeter widerrufen werden?

Die Sprache muss fuer etwa 14-jaehrige Nutzer verstaendlich sein, ohne kindlich oder juristisch zu klingen. Guardian-Text und Jugend-Text sind getrennte Dokumente. Der Daily Flow selbst erhaelt nach Freigabe keinen weiteren Consent-Schritt; der Transfer-Pulse ersetzt weiterhin nur die optionale Reflexion.

## 7. Negativtest-Matrix

Vor Aktivierung muessen mindestens folgende Faelle automatisiert getestet sein:

| Fall | Erwartung |
|---|---|
| Guardian ja, Jugendlicher nein | Keine Evidence-Erhebung |
| Jugendlicher ja, Guardian erforderlich aber offen | Keine Evidence-Erhebung |
| Guardian- oder Assent-Version veraltet | Keine Evidence-Erhebung |
| Guardian-Token abgelaufen oder erneut verwendet | Abgelehnt und auditiert |
| Guardian widerruft waehrend Save | Save liegt eindeutig vor oder nach Widerruf, nie dazwischen |
| Jugendlicher widerruft | Sofort keine neue Erhebung und kein dynamischer Export |
| Admin versucht Erwachsenenfreigabe als Umgehung | Blockiert durch verifizierte Policy und Audit |
| Coach fragt Einzelreview ohne Autorisierung ab | Keine Person und keine alten Werte sichtbar |
| Team hat weniger als fuenf freigegebene Athleten | Keine sensiblen Teamaggregate |
| Consent-Version wechselt | Erneute Entscheidung vor naechstem Evidence-Punkt |
| Account-Loeschung | Autorisierung, Tokens und personenbezogene Evidence folgen der freigegebenen Loeschregel |

## 8. Rollout-Gates

1. Fachlich-rechtliche Regel schriftlich freigegeben.
2. Guardian- und Jugendtexte versioniert und auf Verstaendlichkeit getestet.
3. Bedrohungsmodell, Datenschutz-Folgenabschaetzung beziehungsweise dokumentierte Pruefung abgeschlossen.
4. Staging-Migration und generierte Supabase-Typen geprueft.
5. RLS-, Rollen-, Token-, Replay-, Widerrufs- und Race-Negativtests gruen.
6. Interner Test ausschliesslich mit synthetischen Konten.
7. Kleiner kontrollierter Test mit dokumentiertem Support- und Abbruchprozess.
8. Erst danach neues Minor-Protokoll aktivieren; V1 bleibt unveraendert gesperrt.

## 9. Offizielle Ausgangsquellen fuer die Fachpruefung

- DSGVO, insbesondere Art. 7, 8, 9, 12 und 25: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02016R0679-20160504
- EDPB Statement 1/2025 on Age Assurance: https://www.edpb.europa.eu/documents/statement/statement-12025-on-age-assurance_en
- EDPB SME Guide zu Einwilligung und Minderjaehrigen: https://www.edpb.europa.eu/sme/be-compliant/process-personal-data-lawfully_en

Die Quellen setzen den Rahmen, ersetzen aber keine auf RewirePerform, den Pilotkontext und das jeweilige Land bezogene Pruefung.
