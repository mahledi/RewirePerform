# RewirePerform V1.3 – Release-Candidate-Inventar

Stand: 29. August 2026
Status: `INTEGRATED_NOT_FROZEN`
Zweck: vollständige, wahrheitsgetreue Inventur für den finalen iOS-V1.3-Freeze.

## Referenzen

- Letzte V1.2-Releasebasis: `c73804960306b755345fd36d7406d8acd5640b88`
- Aktuelles `origin/main` als Integrationsbasis: `8f82aa0096588b48f4ce16f9176f644fb6432bec`
- Integrationsbranch: `codex/v1-3-integration-20260829`
- Lokal zusammengeführte V1.3-Produktcommits:
  - `f170d5d` – festes Fenster für verpasste Programmtage
  - `2b60810` – funktionale Trennung der 56 Tagesebenen
  - `5478fa4` – kontrollierte Admin-Alterskorrektur auf unter 16

Dieser Stand ist noch kein finaler App-Store-Build. Weitere freigegebene
Weitere freigegebene Änderungen müssen vor dem Freeze auf den dann neuesten
`origin/main`-Stand übernommen und erneut vollständig geprüft werden.

## Im gemeinsamen Code auf `main` enthalten

### Anmeldung und E-Mail-Flows

- Android-Browser können E-Mail-Bestätigung und Passwortaktionen wieder in den
  vorgesehenen App-Rücksprung fortsetzen, ohne den direkten iOS-Linkvertrag zu
  verändern.
- Eine bereits verwendete E-Mail erzeugt einen neutralen, nicht
  enumerierenden Hinweis mit den sicheren Folgeschritten Anmelden, Passwort
  zurücksetzen oder E-Mail ändern.
- Offene Main-Coach-Einladungen können vor Freigabe auf eine korrigierte
  E-Mail-Adresse neu ausgestellt werden. Ein aktiver Athletenkonflikt bleibt
  serverseitig gesperrt.
- Der Account-Kollisionsblock wurde am 28. August auf Production aktiviert und
  seine drei RPCs sowie das Fail-Closed-Verhalten wurden live geprüft.

### Coach- und Teamvorbereitung

- Coaches können eine eingetragene Trainingswoche für acht Wochen wiederholen.
  Nur Trainingseinheiten werden wiederholt; Wettkämpfe bleiben individuell.
  Nicht belegte Tage werden als Ruhetage geführt und können später geändert
  werden.
- Vor Programmstart zeigt die Teamansicht verständliche Bereitschaftszustände
  statt irreführender Inaktivität: bereit oder Fragebogen fehlt.
- Ein Team ohne gestartetes Programm fällt nicht mehr in eine unpassende
  Fehlermeldung zum Teamzustand.

### Web-App und Erinnerungen

- Die Android-Installationsanleitung verwendet die aktuelle Browserbezeichnung
  „Installieren und Verknüpfung hinzufügen“.
- Gespeicherte Reminder-Zeiten werden nicht durch eine zweite
  Zeitzonenumrechnung verschoben.
- Web-Push sendet an alle aktiven Endpunkte eines Accounts und erzeugt eine
  sichtbare Systembenachrichtigung. Herstellerseitige Sperrbildschirm- und
  Akkuentscheidungen bleiben außerhalb der App-Kontrolle.

### Interne Admin-Auswertung

- Privacy-sichere Admin-/Jarvis-Ansichten und strukturierte Verträge wurden
  erweitert. Das ist keine neue individuelle Coach-Sicht und keine Freigabe
  für Journale, Freitexte, Rohantworten oder individuelle psychologische Werte.
- Code auf `main` ist kein Beweis für die Production-Aktivierung jeder
  zugehörigen Migration oder internen Schnittstelle. Vor dem V1.3-Submit darf
  nur ein tatsächlich aktivierter Datenweg in Review Notes oder Privacy-Angaben
  als aktive Praxis beschrieben werden.

## Im lokalen V1.3-Review-Kandidaten zusätzlich enthalten

### Verpasste Programmtage

- Es erscheint höchstens ein festes Fenster der letzten drei vorherigen
  Programmtage.
- Bestätigte oder abgeschlossene Einträge verschwinden.
- Ältere verpasste Tage werden nach Navigation oder erneuter Anmeldung nicht
  schrittweise nachgeladen.

### Vollständige 56-Tage-Ebenentrennung

- Science Bite: nur Mechanismus und Nutzen des Tagesprinzips.
- Mission: nur die konkrete ausführbare Handlung des Tages.
- „Genauer verstehen“: eine zusätzliche Alltagssituation, Abgrenzung oder ein
  typisches Missverständnis, ohne Science Bite oder Mission nachzuerzählen.
- Alle 56 Tage wurden im Kandidaten redaktionell getrennt; der vorhandene
  Überschneidungsaudit ging von 26 hohen und 24 mittleren Überschneidungen auf
  0 hohe und 0 mittlere Überschneidungen zurück.

### Kontrollierte Alterskorrektur auf unter 16

- Ein Admin kann einen zuvor als 16–17 oder 18+ geführten Athleten nach
  verifizierter Klärung über die exakte E-Mail-Adresse auf unter 16 setzen.
- Teamzuordnung, Fragebogen, Programmstand, Dashboard und Fortschritt bleiben
  erhalten; bestehende Alters- und Beitragsfreigaben werden fail-closed
  zurückgesetzt.
- Beim nächsten App-Start oder erneuten Vordergrundwechsel bleibt der
  Guardian-/Athletenfreigabe-Flow verpflichtend, bis er vollständig abgeschlossen
  ist. Ein kurzzeitig zwischengespeicherter Login umgeht ihn nicht.
- Der Vorgang wird ohne private Fragebogeninhalte auditierbar protokolliert.
- Die zugehörige Migration ist Teil des V1.3-Kandidaten, aber nicht allein durch
  diesen lokalen Integrationsstand auf Production aktiviert. Minderjährigen-
  Enforcement bleibt an die dokumentierten Privacy-/Rechts- und Live-Gates
  gebunden.

### Ruhige Athletennavigation und eindeutiger Messungsabschluss

- Interne Wechsel zwischen Entwicklung, Einstellungen und Dashboard verwenden
  eine stabile Athleten-Skelettansicht statt erneut das grosse Startlogo zu
  zeigen.
- Pre-, Mid- und Post-Messungen werden ausschliesslich fuer den aktuellen
  Programmlauf ausgewertet. Teilweise abgeschlossene Messungen setzen beim
  ersten noch fehlenden Instrument fort.
- Eine vollstaendig gespeicherte Messung kann weder ueber die Dashboard-Aktion
  noch ueber einen alten Direktlink erneut geoeffnet werden. Die Messungsaktion
  erscheint nur, wenn eine Start-, Zwischen- oder Abschlussmessung tatsaechlich
  faellig ist.
- Nach dem Speichern werden Dashboard- und Fortschrittsstatus gezielt
  invalidiert, damit kein alter Cache die abgeschlossene Messung erneut anbietet.

## Nicht als V1.3 enthalten behaupten

- Noch nicht integrierte historische Branches oder ältere, inzwischen
  ersetzte Android-/iOS-Auth-Patches.
- Eine neue medizinische, diagnostische oder kausale Wirksamkeitsaussage.
- Individuelle psychologische Coach-Auswertungen oder Coach-Zugriff auf
  Journale, Freitexte oder Rohantworten.
- Externe KI-Verarbeitung, Modelltraining oder Werbe-/Cross-App-Tracking.
- Production-Aktivierung interner Admin-/Jarvis-Funktionen ohne separaten
  Live-Nachweis.

## Offene Freeze-Gates

1. Der lokale Gesamtstand ist unabhängig vollständig geprüft und der Branch
   gegenüber dem dann aktuellen `origin/main` weiterhin konfliktfrei.
2. Die Alterskorrektur-Migration hat vor jeder Production-Aktivierung die
   erforderlichen Minderjährigen-, Privacy- und Rechtsfreigaben sowie einen
   kontrollierten Apply- und Rollback-Nachweis.
3. Keine weitere freigegebene V1.3-Produktänderung liegt nur in einem
   Worktree, Branch, uncommitted Diff oder Builder-Handoff.
4. Finaler iOS-Versionsstand wird erst beim Freeze auf `1.3` und die nächste in
   App Store Connect tatsächlich freie Buildnummer gesetzt; geplant ist nach
   Build 16 die `17`.
5. Vollständige CI, Production-Target-Prüfung, Capacitor-iOS-Sync,
   Embedded-Target-Prüfung, Xcode-Signing/Archive und reale iPhone-Smokes sind
   auf demselben SHA grün.
6. Privacy-Manifest, sichtbare App-Store-Privacy-Antworten, Review Notes,
   öffentliche URLs und die final ausgewählten Screenshots stimmen mit exakt
   diesem Build überein.
