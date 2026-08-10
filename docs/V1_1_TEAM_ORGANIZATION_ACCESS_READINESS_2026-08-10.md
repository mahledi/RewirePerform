# V1.1 Team- und Organisationszugang – Readiness-Handoff

Stand: 10. August 2026  
Status: lokal verifiziert; keine Production-, Staging-, Main-, TestFlight- oder App-Store-Aktivierung

## Zielbild

RewirePerform hat einen zentralen, professionellen Anfrageweg auf
`https://rewireperform.com/team-access`. Die Website ist der primaere
Einstiegspunkt. Die iOS-App behaelt eine hochwertige Team-/Organisationskarte,
oeffnet aber denselben zentralen Webweg statt ein zweites Formularsystem zu
pflegen.

Vor der Dateneingabe wird bewusst zwischen zwei tatsaechlich verschiedenen
Starts gewaehlt:

1. **Ein Team starten** – zwei fokussierte Schritte fuer ein konkretes Team;
2. **Verein oder Organisation einfuehren** – drei Schritte fuer mehrere Teams,
   komplexere Strukturen und weitergehende Begleitung.

Support bleibt ausschliesslich Support. Eine Anfrage erzeugt weder automatisch
einen Coach-Zugang noch einen Preis oder Vertrag. Mahle prueft jeden Start
persoenlich.

## Datenminimierung

Die kurze Teamstrecke fragt nur Kontakt, Rolle, E-Mail, Verein/Organisation,
Team/Altersklasse, Umfeld, Sportart, ein Hauptziel, Teamgroesse, Startzeitpunkt,
gewuenschte Begleitung und einen optionalen Hinweis ab. Telefon, Website,
mehrere Teams, Coach-Anzahl und umfassende Organisationsstruktur sind dort
nicht erforderlich.

Die Organisationsstrecke behaelt den groesseren Einordnungsumfang. In beiden
Strecken wird sichtbar untersagt, Namen oder persoenliche Daten von Athleten
einzutragen. Finanzielle Kapazitaet oder Budget werden nicht abgefragt und
werden auch nicht automatisch aus oeffentlichen Quellen abgeleitet.

## Technische Grenzen

- Der native Wechsel nutzt `@capacitor/browser`; ein Rueckfall auf die gleiche
  HTTPS-Adresse bleibt vorhanden.
- Die Edge Function akzeptiert nur Deutschland, die exakte Notice-Version und
  konsistente Team-/Organisationspayloads.
- Die Tabellen bleiben ohne direkten Zugriff fuer `anon` und
  `authenticated`; die Einreichung erfolgt ausschliesslich ueber die
  service-role-gebundene RPC hinter Origin-Allowlist, Turnstile, Honeypot und
  Aktivierungsflag.
- Die neue Migration ist additiv. Sie wurde nicht in Staging oder Production
  angewendet.
- Keine Anfrage wird automatisch genehmigt, kein Vertrag wird erzeugt und keine
  Einladung wird ohne bewusste Adminentscheidung versendet.

## Lokal verifiziert

- `npm run ci`: 132 Testdateien / 748 Tests gruen;
- alle Feedback-, Minderjaehrigen-, Guardian-, Privacy-, Access-, Deletion-,
  Security- und App-Store-Gates gruen;
- `npm audit --omit=dev`: 0 Befunde;
- Browser-QA: 375x667, 844x390, 1024x1366 und 1366x1024 ohne horizontalen
  Overflow; beide Wege beginnen am Seitenanfang; gruene Auswahlpfeile sichtbar;
- Capacitor Sync findet sechs iOS-Plugins einschliesslich Capacitor Browser;
- Xcode-Readiness und unsigned Simulator-Build: 9/9 gruen.

## Offen vor Aktivierung

1. verbindliche Aufbewahrungsdauer fuer abgelehnte oder nicht weiterverfolgte
   Anfragen festlegen und technisch sowie in der Datenschutzerklaerung binden;
2. Cloudflare Turnstile in Staging konfigurieren;
3. additive Teamweg-Migration und aktualisierte Edge Function einzeln in
   Staging pruefen, ohne die geschlossene Feedback-/Jarvis-Kette zu aktivieren;
4. Datenschutzseite und App-Store-Privacy-/Review-Angaben gegen den aktivierten
   Umfang angleichen;
5. Production-Konfiguration bauen und den nativen App-zu-Web-Rueckweg auf dem
   physischen iPhone testen;
6. erst danach kontrolliert mergen, Production aktivieren, TestFlight bauen und
   die App-Store-Version einreichen.

