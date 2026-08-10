# Feedback Intelligence 1.1 – Handoff an den finalen App-Store-Review

Stand: 10. August 2026
Status: Rest-Day-/Daily-Flow und Feedback-Inhalt lokal integriert; kombinierter 1.1-Kandidat bis zu den unten genannten Release-Gates weiterhin `NO-GO`; keine Production- oder Machine-Aktivierung

## Entscheidung, die dieser Review treffen soll

Der App-Store-Agent prüft diesen Feedback-Block als finaler unabhängiger Reviewer
für Update 1.1. Eine Freigabe bestätigt ausschließlich, dass Produktwahrheit,
Binary, Store-Angaben, Minor-Flow und technische Nachweise zusammenpassen. Sie
aktiviert weder Production, echte Athletendaten, Freitextanalyse noch Jarvis.

## Produktwahrheit im Release Candidate

- Feedback-Checkpoints erscheinen deterministisch an Tag 10, 24, 39 und 55.
- Die vier sichtbaren Tageskontexte sind an den finalen 56-Tage-/Rest-Day-Content-Commit
  `bd647c1b4e709cc0285c6438639e1e9b42ef6128` und je Tag zusätzlich an einen
  kanonischen SHA-256-Hash gebunden. Titel, Werkzeug, Cue, Mechanismus und
  Mission werden im Test direkt gegen den finalen Programminhalt geprüft.
- Jeder Checkpoint enthält exakt zwei organisch eingeordnete Fragen zur mentalen
  Einheit am Ruhetag. Ihre Tiefe entwickelt sich von früher Führungsklarheit
  und erster Nutzung über praktische Verbindung und selbstständigen Abruf bis
  zu rückblickender Integration und Weiternutzungsabsicht.
- Alle acht Fragen enthalten die neutrale, nicht bewertete Option
  `Noch nicht genutzt`. Sie erfassen ausschließlich subjektive Nutzungserfahrung
  und begründen keine Wirkungs-, Gehirn- oder Performanceaussage.
- Bei geschlossenem Client-Schalter bleiben sowohl die Checkpoints als auch die
  separate Feedback-Einwilligungsverwaltung unsichtbar und führen keinen
  Feedback-RPC aus. Bestehender Alters-/Guardian-Status und vorhandene
  Kontoeinstellungen bleiben davon unberührt.
- Die Feedbacktexte sind an den kanonischen 56-Tage-Produktionsinhalt gebunden.
  Preview und echter Tagespfad beziehen ihn über `PROGRAM_DAY_DRAFTS` in
  `src/content/programV11.ts`; ältere Zwischenpins sind keine gültige
  Feedback-Abhängigkeit. Die App behauptet keine individuelle
  KI-Personalisierung.
- Tag 55 beginnt vor allen inhaltlichen Hinweisen mit freiem Abruf. Titel, Cue,
  Missionsstruktur, Beispielantwort und der Testsatz des Tages sind bis nach
  dieser ersten Antwort technisch und per Negativtest verborgen.
- Strukturierte Antworten funktionieren ohne Freitext-Einwilligung und werden
  unabhängig davon privacy-minimiert gespeichert.
- Relevante Fragen bieten optional `+ Kurz etwas dazu sagen`.
- Vor dem ersten Kommentarfeld steht eine eigene freiwillige, nicht
  vorangekreuzte Entscheidung. Ablehnung öffnet kein Textfeld, blockiert nichts
  und wird nicht schlechter dargestellt.
- Kommentare dienen ausschließlich der Verständlichkeit, Hilfreichkeit und
  Nutzerfreundlichkeit von RewirePerform. Keine Werbung, kein Tracking, keine
  Coach-Bewertung und keine automatisierte Entscheidung über Athleten.
- Positive und negative Rückmeldungen werden gleichwertig angenommen.
- Private Journal- und Reflexionstexte, Coach- oder Teamtexte sowie nicht
  ausdrücklich als Produktfeedback abgefragte Freitexte sind ausgeschlossen.
  Zulässig ist nur die Anzahl bestimmter Aktivitäten, nicht ihr Inhalt oder
  ihre Qualität.

## Deutschland- und Minderjährigen-Scope

- Update 1.1 ist für Deutschland und Athleten ab 15 vorgesehen.
- Alle Nicht-DE-Länder bleiben für diesen Feedbacktext-Flow technisch
  `out_of_scope`.
- Ab 16 entscheidet der Athlet freiwillig selbst über den Produktfeedbacktext.
- Mit 15 beziehungsweise allgemein unter 16 verlangt der Server sowohl die
  freiwillige Athleten-Einwilligung als auch eine exakte, noch gültige
  Guardian-Autorisierung für den versionierten Feedbacktext-Scope.
- Fehlt eine der beiden Freigaben, wird kein Rohtext gespeichert. Strukturierte
  Antworten bleiben trotzdem möglich.
- Guardian- oder Athleten-Widerruf löscht Rohtext und personenbeziehbare
  Ableitungen; strukturierte Antworten bleiben bestehen.

## App-Privacy-Zuordnung für den echten RC

| Apple-Datenart | Feedbackdaten | Linked to User | Zwecke | Tracking |
| --- | --- | --- | --- | --- |
| Product Interaction | strukturierte Antworten, Programmtag, Fragebogen-/Produkt-/Inhaltsversion, Abschluss- und Aktivitätszählungen | Ja, solange im Producer mit der Programminstanz verbunden | App Functionality; Analytics | Nein |
| Other User Content | bewusst und freiwillig abgegebene Produktfeedback-Kommentare | Ja, bis Widerruf/Löschung oder echte Anonymisierung | App Functionality; Analytics | Nein |
| User ID / Identifiers | interne User-/Programminstanz-Verknüpfung; keine direkte Kennung im Machine-Paket | Ja im Producer | App Functionality; Security; Analytics | Nein |

Der finale Reviewer muss diese Angaben gegen das tatsächliche Binary, alle
eingebundenen SDKs/Partner und die Einträge in App Store Connect abgleichen.
Apples Definition von Tracking wird hier nicht erfüllt: Es gibt keine
Werbe-, Datenbroker- oder Cross-App-Verknüpfung.

## Machine- und Jarvis-Wahrheit

Jarvis ist bewusst nicht mit echten Daten verbunden. Der technisch vorgesehene
Processor ist nun konkret: Supabase Staging in `eu-central-1` übergibt einen
minimierten Export nach erneutem Consent- und Policy-Check über die eigene Edge
Function `mahleos-feedback-intelligence-read` per HTTPS an das lokal auf Mahles
Mac betriebene Jarvis-System. Jarvis ruft für diesen Pfad keinen externen
KI-Anbieter auf. Cloudflare ist nicht Teil dieses Feedback-Datenpfads. Der
Staging-Pfad wurde einmal synthetisch nachgewiesen; die Ausführungsregion der
Edge Function selbst ist durch die aktuelle Evidenz nicht belegt.

Production-Gateway, dedizierter Production-Reader und Machine-Credential sind
nicht provisioniert. Es wurden keine echten Produktfeedback-Kommentare oder
pseudonymen Aktivitätssnapshots verarbeitet. Der vorbereitete Export ist ein
separater, eng begrenzter Machine/Admin-Vertrag:

- keine Namen, E-Mails, `user_id`, `team_id`, Coach- oder privaten Texte;
- Rohtext nur mit beim Export erneut gültigem, nicht widerrufenem Consent;
- Text gilt immer als `UNTRUSTED_USER_TEXT`;
- lokales Identifier-Redacting und Quarantäne sensibler/Secret-Inhalte;
- keine Persistenz von Rohtext, direkter Nutzerreferenz oder zweitem
  personenbezogenen Rohtextbestand beim Consumer; nur zusammengefasste
  Auswertungen und Berichte dürfen erhalten bleiben;
- Kohorten erst ab mindestens fünf Athleten;
- Zusammenhänge sind `OBSERVATIONAL_NOT_CAUSAL`;
- kein direkter Tabellenzugriff, sondern später ein eigener Read-only Actor und
  ein byte-gepinnter Vertrag;
- Contract-, Consent- oder Gate-Drift schließt den Export fail-closed.

Ein späterer echter Jarvis-Read verlangt eine neue ausdrückliche Freigabe nach
Production-Processor-, Credential-, Privacy-, Minor- und Löschprüfung. Dieser
Review darf ihn nicht implizit aktivieren.

Der aktuelle Athlete-Consent-Draft ist
`feedback-text-consent-v1.1.0-draft` mit Notice-Hash
`4f067f11e8ba0075989ba3af730cfcac3849e6e406da97227defa92ac41dfda7`.
Der zugehörige Guardian-Draft ist
`guardian-feedback-text-de-v1.1.0-draft` mit Guardian-Notice-Hash
`4b7c6f6cbf3d932c2e244d6a281f0d45056706eeb6108cb2ac2303dbe0f19c4f`.
Beide sind neue additive Entwürfe; die historischen V1.0-Zeilen werden nicht
still umgedeutet oder überschrieben.

## Nachweise im isolierten Staging

- Projekt: `RewirePerform Staging` (`zbeswjipayspgvcipzmx`), Region
  `eu-central-1`, Free-Plan; Production blieb unverändert.
- 90 Migrationen angewendet; alle Kampagnen blieben `draft`, alle Collection-
  und Machine-Gates geschlossen, Staging endete ohne Testdaten.
- Echter Tag-10-Athleten-RPC-Lauf mit strukturierter Antwort und ohne Rohtext
  bestand innerhalb einer zurückgerollten synthetischen Transaktion.
- Unter-16 ohne passenden Guardian-Scope wurde blockiert.
- Guardian-Widerruf löschte Rohtext und Analyseartefakt, ließ aber die
  strukturierte Antwort bestehen.
- `anon`, `authenticated` und `service_role` erhielten keine unzulässigen
  direkten Raw-/Analysis-/Machine-Reads.
- `minor-guardian-user`, Version 1, ist mit `verify_jwt = true` aktiv.
- `minor-guardian-public`, Version 1, ist mit `verify_jwt = false` aktiv und
  prüft Origin sowie gehashte Einmal-/Verwaltungstokens intern.
- Beide deployten Funktionspakete stimmen bytegenau mit dem Repository überein.
- Remote-Negativtests für fehlendes JWT, ungültige Tokens und unzulässige
  Origin bestanden.
- Keine echte Adresse, keine E-Mail und kein Production-Secret wurden benutzt.

Vollständiger Nachweis:
[`STAGING_VERIFICATION_2026-08-06.md`](./STAGING_VERIFICATION_2026-08-06.md).

## Synthetische In-App-Vorschau

`http://127.0.0.1:8083/internal/feedback-intelligence-preview`

Die Vorschau zeigt Tag 10, 24, 39 und 55, Intro, strukturierte Fragen,
separate Freitextentscheidung, Ablehnung, Zustimmung und Kommentarfeld. Sie
nutzt ausschließlich lokale synthetische Daten und sendet nichts an Supabase,
Analytics oder KI. Desktop und 390 × 844 Pixel wurden ohne horizontalen
Overflow geprüft.

## Technische Aufbewahrung

Rohtext und personenbeziehbare Ableitungen werden bei Widerruf oder
Kontolöschung entfernt. Zusätzlich ist technisch eine maximale Dauer von 365
Tagen samt täglichem Retention-Job implementiert. Diese Dauer ist noch keine
rechtliche Freigabe und muss vor Aktivierung mit finalem Notice-/Consent-Text
qualifiziert bestätigt werden.

## Harte Blocker vor Einreichung oder Aktivierung

1. qualifizierte deutsche Rechts-, Datenschutz- und Minderjährigenfreigabe;
2. qualifizierte Freigabe der versionierten Consent-, Privacy- und Guardian-Texte samt Notice-Hashes;
3. finale App-Store-Connect-Angaben zu App Privacy, Altersrating/Override,
   Privacy Choices URL und Review Notes gegen den echten RC;
4. positiver Guardian-E-Mail-Pfad in Staging mit synthetischer Adresse und
   isolierten Staging-Secrets für URL, Verschlüsselung, Hashing, Absender und
   Provider;
5. signierter nativer iPhone-/iPad-Build und Gerätetest einschließlich
   Guardian-Deep-Link-/Return-Pfad;
6. Zielnachweis für Ablehnung, Offline-Retry, mehrtägigen Lauf, Retention,
   Account-Löschung und Policy-Retirement;
7. vollständiger Dependency-/Security-Gate und grünes CI auf dem integrierten
   1.1-Release-Candidate;
8. kombinierter Review der produktiven Rest-Day-Visualisierung und der acht
   neuen Feedbackfragen im echten 1.1-Release-Candidate, einschließlich
   Reihenfolge, Dauer, Offline-Verhalten und Tag-55-Free-Recall-Negativtest;
9. keine echten Machine-Reads, bevor alle separaten Jarvis-Gates geschlossen
   und erneut freigegeben wurden.

## Aktueller Build- und Dependency-Stand

- `npm run ci`: grün;
- 133 Vitest-Dateien, 754 Tests: grün;
- alle Feedback-, Guardian-, Access-, Deletion-, Tracking- und Minor-SQL-
  Harnesses: grün;
- TypeScript, PWA-/Web-Build und statische App-Store-Prüfung: grün;
- Staging-Target-Validator und erneuter Build gegen Projekt
  `zbeswjipayspgvcipzmx`: grün;
- `npm audit --omit=dev`: null kritisch, null hoch, null moderat;

Vite meldet außerdem einen bestehenden Chunk über 500 kB. Das ist ein
Performance-/Optimierungshinweis und kein fehlgeschlagener Sicherheits- oder
Feedbacktest, soll aber im finalen RC-Budget sichtbar bleiben.

## Reviewer-Checkliste

- [ ] Die vier Checkpoints und ihre Tagesformulierungen entsprechen dem finalen
      Content-Build, nachdem dieser tatsächlich den echten Daily Flow speist.
- [ ] Tag 55 bleibt bis nach dem freien Abruf frei von Cue, Mission,
      Musterantworten und Testsatz des Tages.
- [ ] Strukturierte Antworten bleiben ohne Freitext und bei Ablehnung nutzbar.
- [ ] Unter 16 ist Text ohne beide versionierten Freigaben technisch unmöglich.
- [ ] Widerruf, Löschung und Retention erfassen Rohtext und personenbeziehbare
      Ableitungen, aber nicht die privacy-sichere strukturierte Antwort.
- [ ] Private Journale/Reflexionen und Coach-/Team-/Identitätsdaten erscheinen
      weder im Feedbackexport noch in Logs, Client-Analytics oder Modellkontext.
- [ ] App Privacy, Age Rating, In-App-Texte und tatsächliche Netzwerkpfade des
      RC erzählen dieselbe Wahrheit.
- [ ] Abhängigkeiten, vollständiges CI und native Zielgeräte sind grün.
- [ ] Production, Push, Merge, TestFlight, App-Store-Einreichung und echter
      Jarvis-Zugriff bleiben bis zu ihrer jeweiligen Freigabe geschlossen.

## Primärquellen für den finalen Review

- Apple App Review Guidelines, insbesondere 5.1:
  https://developer.apple.com/app-store/review/guidelines/
- Apple App Privacy Details:
  https://developer.apple.com/app-store/app-privacy-details/
- App Store Connect – App Privacy:
  https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/
- App Store Connect – Age Rating und Override:
  https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/
- Supabase Edge Function Authorization:
  https://supabase.com/docs/guides/functions/auth-headers
- DSGVO, insbesondere Art. 6, 7, 8, 13 und 17:
  https://eur-lex.europa.eu/eli/reg/2016/679/oj

Die technischen und Store-Prüfungen ersetzen keine fallbezogene Rechts- oder
Datenschutzberatung.
