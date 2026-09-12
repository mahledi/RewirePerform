# Feedback Intelligence – Deutschland-Release und künftige Ländergrenze

Stand: 2026-08-13
Status: `LEGAL_PRIVACY_REVIEW_REQUIRED`
Technikstatus: lokal fail-closed; keine echte Datenerhebung oder KI-Weitergabe

## Ergebnis

RewirePerform ist ab 13 Jahren vorgesehen. Update 1.1 wird ausschließlich für Deutschland vorbereitet. Von 13 bis einschließlich 15 bleibt der bestehende Unter-16-Weg mit passender Guardian-Autorisierung und eigener Athletenentscheidung verpflichtend; mit 16 oder 17 entscheidet der Athlet selbst. Für Feedback Intelligence werden gesetzliche Altersregeln und die getrennten Zwecke „strukturierte Produktrückmeldung“ und „individuelle Freitextanalyse“ nicht vermischt.

Die Datenbank enthält deshalb eine eigene, versionierte Länder-Matrix. Deutschland startet mit `legal_review_required`. Österreich und die Schweiz sind nur explizite Deny-list-Einträge mit Status `out_of_scope`; sie gehören nicht zum 1.1-Release und blockieren ihn nicht. Globale Feature-Flags, aktive Kampagnen oder ein Client-Flag können diese Ländersperre nicht umgehen.

## Release-Matrix

| Land | Gesetzliche Ausgangslage für Art.-8-/Einwilligungsfälle | RewirePerform-Default | Strukturierte Antworten | Freitext + spätere KI-Analyse |
| --- | --- | --- | --- | --- |
| Deutschland | DSGVO Art. 8: 16, solange nationales Recht nicht absenkt | ab 13; 13–15 Guardian + Athletenentscheidung; 16–17 eigene Entscheidung | `legal_review_required` | `legal_review_required`; 13–15 zusätzlich exakt passender Guardian-Scope |
| Österreich | nur Metadaten für eine mögliche spätere Prüfung | kein 1.1-Produktpfad | `out_of_scope` | `out_of_scope` |
| Schweiz | nur Metadaten für eine mögliche spätere Prüfung | kein 1.1-Produktpfad | `out_of_scope` | `out_of_scope` |

Wichtig: Art. 8 DSGVO beantwortet nur Konstellationen, in denen die Verarbeitung auf Art. 6 Abs. 1 lit. a und ein direkt angebotenes Angebot eines Dienstes der Informationsgesellschaft gestützt wird. Die passende Rechtsgrundlage für strukturierte Produktrückmeldung und Aktivitätsverknüpfung muss getrennt fachlich festgelegt werden. Die Tabelle behauptet nicht, dass Einwilligung automatisch die richtige oder einzige Rechtsgrundlage ist.

## Technische Durchsetzung

- `feedback_core.jurisdiction_policies` speichert pro Land Policy-Version, Produktmindestalter, gesetzlichen Alters-Metadatenwert, RewirePerform-Guardian-Default sowie getrennte Freigabestatus für strukturierte Daten und Rohtext.
- `feedback_core.actor_context(...)` liefert nur dann einen zulässigen Actor, wenn das bestehende Minor-/Guardian-System eine aktive Produktfreigabe besitzt und die Ländermatrix dokumentiert freigegeben ist.
- `feedback_core.jurisdiction_policy_ready(..., true)` muss zusätzlich für Rohtext grün sein. Erst danach kann das globale Text-Flag überhaupt Wirkung entfalten.
- Von 13 bis einschließlich 15 bleibt ein eigener Guardian-Nachweis für exakt `scope`, `consent_version` und `notice_hash` Pflicht. Die allgemeine Programm- oder Pilotfreigabe reicht nicht.
- Ablehnung oder fehlender Rohtext-Consent verhindert nur das Freitextfeld. Strukturierte Antworten und das Programm werden dadurch nicht blockiert.
- Österreich und Schweiz sind im bestehenden `minor_auth`-System nicht implementiert. Ihre `out_of_scope`-Matrixzeilen dokumentieren und sperren den künftigen Pfad; sie simulieren keine fertige Unterstützung und sind keine Deutschland-Release-Blocker.

## Apple-/App-Store-Auswirkung

- Die Privacy Policy muss Datentypen, Zwecke, Empfänger einschließlich Drittanbieter-KI, Aufbewahrung/Löschung und Widerruf vollständig erklären.
- Eine spätere Übermittlung personenbezogener Feedbacktexte an Drittanbieter-KI braucht nach Apples aktueller Guideline eine klare Offenlegung und ausdrückliche Erlaubnis vor der Weitergabe. Der aktuelle lokale Jarvis-Draft liest deshalb keine echten Daten.
- Die App wird mit 13+ und nicht in der Kids Category angeboten.
- App-Store-Altersfreigabe, Produktzugang und Guardian-Weg müssen im finalen RC dieselbe 13+-/Unter-16-Wahrheit erzählen.
- RewirePerform beschreibt diesen Block als interne Produktverbesserung und Beobachtung, nicht als medizinische Forschung oder Wirksamkeitsstudie. Sollte Scope, Kommunikation oder Nutzung später zu gesundheitsbezogener Forschung werden, greifen zusätzliche Apple-Anforderungen einschließlich Guardian-Consent bei Minderjährigen und unabhängiger Ethikfreigabe. Diese Umklassifizierung darf nicht still erfolgen.

## Noch verbindlich zu entscheiden

1. Rechtsgrundlage je Datenklasse: strukturierte Antwort, pseudonyme Längsschnittverknüpfung, Aktivitäts-Snapshot, freiwilliger Rohtext und KI-Verarbeitung.
2. Angemessenheit der Guardian-Verifikation ohne Ausweiskopie im Deutschland-Release.
3. Altersgerechte deutsche Notice-Texte für Athlet und Guardian.
4. Finaler Abgleich des App-Store-Fragebogens und der Review Notes gegen 13+ und den Guardian-Weg von 13 bis einschließlich 15.
5. Ob die geplante Aktivitätsverknüpfung eine Datenschutz-Folgenabschätzung verlangt.
6. Finale App-Privacy-Angaben und Empfänger-/Transferbeschreibung für den tatsächlich gewählten Machine-Processor.

Österreich, die Schweiz und weitere Länder werden erst in einer späteren internationalen Phase erneut rechtlich, technisch und im Store bewertet. Vor dieser bewussten Scope-Erweiterung bleiben sie `out_of_scope`.

## Primärquellen

- DSGVO Art. 7, 8 und 13: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- Apple App Review Guidelines, insbesondere 5.1.1–5.1.4: https://developer.apple.com/app-store/review/guidelines/
- Apple App Store Connect Help, Altersfreigabe: https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/
- Apple, sichere altersgerechte Experiences: https://developer.apple.com/kids/

Diese Quellen begründen die konservative technische Sperre und die offenen Prüfaufträge. Sie ersetzen keine fallbezogene qualifizierte Rechtsberatung.
