# RewirePerform App Store Readiness Status

Stand: 27. Juli 2026

Status: Die bekannten P1-Produktfehler im nativen Signup-, Minderjaehrigen-
und Offline-Rueckweg sind auf dem echten iPhone geschlossen. Der Stand ist
noch nicht fuer TestFlight oder App Review freigegeben, weil Apple-
Distribution, physischer iPad-Nachweis, externe Rechtspruefung und
Store-/Tester-Gates noch ausstehen.

## 1. Verifizierter Produktstand

- PR 95 ist in `main` integriert; Production Web und der native iOS-Build
  verwenden dasselbe Supabase-Production-Ziel `bqsbxesmybthwtxmowfz`.
- Der komplette echte Minderjaehrigenablauf ist gruen: E-Mail-Bestaetigung,
  Rueckkehr in die App, Altersabfrage, sichtbare Sperre derselben
  Eltern-E-Mail, Einladung einer getrennten Elternadresse, Elternfreigabe im
  Web sowie automatische Statusaktualisierung in der App.
- Der sehr kurze Browser-Zwischenschritt bei der E-Mail-Bestaetigung ist der
  erwartete Universal-Link-Uebergang. Er hat den Nutzer sofort und korrekt in
  die App zurueckgefuehrt und ist kein offener P1.
- Flugmodus-Kaltstart und anschliessende automatische Wiederverbindung sind
  auf dem echten iPhone gruen. Production-Logs bestaetigen danach erfolgreiche
  Rollen-, Profil-, Minderjaehrigen-, Programm-, Check-in-, Journal- und
  Fortschrittsabfragen ohne manuellen Reload.
- Die Production-Migration
  `20260723101114_harden_public_coach_access.sql` ist unter der abweichenden
  Production-Version `20260723151225` aktiv. Diese Nummerndifferenz ist
  beabsichtigt zu erhalten und darf spaeter nicht als neue unbekannte
  Migration behandelt werden.

## 2. Dependency- und Weiterleitungs-Haertung

Der reproduzierbare Production-Audit auf dem gemergten Ausgangsstand meldete
acht betroffene Paketknoten: fuenf hoch und drei moderat. Sichere
Lockfile-Patchupdates aktualisieren unter anderem `postcss`, `sucrase` und
`tar` und entfernen den veralteten produktiven `glob`-Pfad.

Der integrierte Release Candidate nutzt jetzt den clientseitigen React Router
`7.18.1`. Damit sind die fuer die App relevanten offenen Redirect-Befunde aus
Router 6 auf Paketebene geschlossen; die bereits implementierte strikte interne
Routenpruefung bleibt als zusaetzliche Schutzschicht erhalten. Build-only-Pakete
wie die Capacitor CLI und `tailwindcss-animate` sind aus den
Production-Abhaengigkeiten entfernt.

Nach einem frischen `npm ci` meldet `npm audit --omit=dev`:

- 0 kritisch;
- 2 hoch (`react-router` und `react-router-dom`);
- 0 moderat.

Die zwei Paketknoten repraesentieren denselben RSC-Advisory
`GHSA-qwww-vcr4-c8h2`. Laut offiziellem Advisory ist er ausschliesslich fuer
Anwendungen relevant, die React Routers instabile React-Server-Components-APIs
nutzen. Diese Vite-SPA nutzt den deklarativen `BrowserRouter`, keine
Server-Side-Rendering- oder RSC-APIs und keine React-Router-Serverpakete.

- Die Redirect-Befunde sind in den tatsaechlich nutzersteuerbaren
  Navigationsflaechen defensiv geschlossen. Auth, Minderjaehrigen-Rueckweg,
  nativer Auth-Rueckweg, Einfuehrungs-Rueckweg und Push-Klicks verwenden eine
  gemeinsame strikte interne Routenpruefung. Externe URLs, doppelte
  Schraegstriche, Backslashes, codierte Pfadtrenner und Steuerzeichen werden
  verworfen.
- `app:verify` erzwingt den geprueften Router-Pin, den clientseitigen
  `BrowserRouter`, die Abwesenheit der React-Router-Serverpakete sowie die
  Abwesenheit instabiler RSC-APIs. Ein spaeteres Router-Update muss dieses Gate
  erneut passieren.
- Der vollstaendige Audit inklusive Entwicklungswerkzeugen meldet 1 moderaten
  und 20 hohe Paketknoten. Diese Toolchain-Befunde werden nicht als
  produktionsfreie Null ausgegeben und muessen in einem separaten
  Toolchain-Upgrade geschlossen werden.

Vollstaendige Verifikation dieses Blocks:

- 82 Testdateien und 434 Tests gruen;
- TypeScript, Lint und `git diff --check` gruen;
- Production-Web-Build und Service-Worker-Build gruen;
- alle Evidence-, Minor-, Tracking-, MahleOS-, Access- und Deletion-SQL-Gates
  gruen;
- App-Store-Statikpruefung, Production-Zielpruefung, Capacitor-iOS-Sync und
  eingebettete iOS-Zielpruefung gruen.

## 3. Noch offene Gates

1. Apple-Distribution in Xcode/App Store Connect vervollstaendigen und einen
   lokalen App-Store-Export mit gueltigem Distribution-Zertifikat pruefen.
2. Den kompletten Rollen- und Berechtigungsdurchlauf mit synthetischen Konten
   auf dem echten iPhone abschliessen, einschliesslich Ablehnung,
   abgelaufenem Elternlink und Kontoloeschung.
3. Mindestens einen physischen iPad-Durchlauf abschliessen.
4. Minderjaehrigenflow, Datenschutz, Aufbewahrung und Store-Angaben extern
   rechtlich pruefen lassen.
5. App-Store-Connect-Metadaten, Altersfreigabe, Datenschutzantworten,
   Screenshots, Support-/Review-Hinweise und Reviewer-Konten finalisieren.
6. TestFlight erst nach separater ausdruecklicher Upload-Freigabe verwenden
   und den eingefrorenen Build 24 bis 48 Stunden von mindestens zwei
   unabhaengigen Personen testen lassen.
7. Erst danach eine eigene Freigabe fuer die App-Review-Einreichung einholen.

Dieser Stand belegt technische Produkt- und Testreife innerhalb der genannten
Grenzen. Er ist keine rechtliche Gesamtfreigabe und kein Nachweis
wissenschaftlicher Wirksamkeit oder Fehlerfreiheit.
