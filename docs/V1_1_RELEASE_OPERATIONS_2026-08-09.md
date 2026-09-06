# RewirePerform V1.1 – Release Operations Preflight

Stand: 9. August 2026
Status: Staging negativ verifiziert; kein Merge, kein Production-Apply, kein TestFlight-Upload und keine App-Store-Aktion

## Praktische Bedeutung

Der kombinierte V1.1-Release-Kandidat ist technisch grün. Ohne iPhone können
heute alle statischen, Web-, SQL- und Release-Gates vorbereitet werden. Der
signierte Gerätebeweis und alle externen Aktivierungen bleiben getrennt offen.

## Eingefrorene Quellen

- Release-Branch: `codex/v1-1-release-final-20260809`
- Release-HEAD vor Versionsschritt: `1532fbd2d47b28d36860abf0ca577938c0d430d6`
- Draft-PR: `#116`, grün und ungemergt
- Icon-Qualitätsblock `d1a12d18208a2e8c4c8fc78e63c0dca9b81fbb14`
  ist unabhängig geprüft und im Draft-Release integriert;
- Native Release-Identität in diesem Preflight: Version `1.1`, Build `5`,
  Bundle-ID unverändert `com.rewireperform.app`

## V1.1-Produktumfang, der ohne Feedback-Aktivierung ausgeliefert werden kann

- kanonischer 56-Tage-Inhalt im echten Daily Flow;
- Rest-Day-Atmung und dreistufige Visualisierung mit Rückweg zum Dashboard;
- UI-, Scroll-, Lade- und Navigation-Härtungen;
- zentrale Team-/Organisationsanfrage auf der Website mit kurzer Teamstrecke
  und vertiefter Organisationsstrecke sowie die Adminoberfläche als Code;
- bestehende Minderjährigen-, Guardian-, Lösch- und Privacy-Grenzen.

`VITE_FEEDBACK_INTELLIGENCE_V1_ENABLED=false` bleibt für diesen Release die
fail-closed Voreinstellung. Dadurch erscheinen keine Feedback-Checkpoints und
es wird kein Feedback-RPC ausgeführt. Machine-/Jarvis-Reads, Freitextanalyse
und Feedback-Production bleiben zusätzlich serverseitig geschlossen.

## Offener Backend-Schnittpunkt

Die öffentliche Organisationsanfrage benötigt in Production weiterhin:

1. die in Staging einzeln verifizierte Migration
   `20260807092005_coach_enterprise_onboarding_v1_1.sql`;
2. die additiven, in Staging einzeln angewendeten und verifizierten Migrationen
   `20260810082841_extend_organization_inquiry_team_path_v1_1.sql` und
   `20260810091629_organization_inquiry_retention_v1_1.sql`;
3. die in Staging negativ verifizierte Edge Function
   `submit-organization-access-request`;
4. Cloudflare-Turnstile-Site-Key im Website-Build; die native App öffnet
   denselben zentralen Webweg über Apples vorgesehenen In-App-Browser;
5. Turnstile-Secret und `ORGANIZATION_INQUIRY_PUBLIC_ENABLED=true` nur in der
   Zielumgebung;
6. für die persönliche, erst nach Founder-Freigabe ausgelöste Coach-Einladung:
   `RESEND_API_KEY` und `ORGANIZATION_INVITATION_EMAIL_FROM`; der Versand
   bleibt ohne diese beiden Werte fail-closed und der Admin erhält weiterhin
   den einmaligen Link als manuellen Rückweg;
7. die Edge Function `send-organization-access-invitation`, die enge
   Nachfolge-Migration
   `20260818103000_coach_invite_existing_member_guard_v1_1.sql` und danach
   `20260818130641_persistent_team_coach_invitation_v1_1.sql` nur zusammen
   mit dem bereits vorhandenen Co-Coach-Migrationsblock isoliert anwenden.
   Die letzte Migration repariert historische Lead-Coach-Rollen, widerruft
   nicht wiederherstellbare alte Einmalcodes und erzeugt danach pro Team einen
   wiederverwendbaren Link, den ausschließlich der Lead Coach erneuern kann;
8. unmittelbar vor einem echten Coach-Mail-Smoke im Resend-Domainbereich
   bestätigen, dass Open- und Click-Tracking deaktiviert sind. Diese Prüfung
   ist ein Deployment-Gate; keine Tracking-Konfiguration oder Empfängerwerte
   werden im Repository gespeichert;
9. vor öffentlicher Staging-Aktivierung noch den positiven Turnstile-E2E-Smoke
   und die Admin-Sichtprüfung; die Negativmatrix, Datenbankpfade und der
   Retention-Job sind bereits Staging-verifiziert.

Im Repository liegen vor der Organisationsmigration mehrere noch nicht für
Production freigegebene Feedback-/Minor-Migrationen. Ein normaler
`supabase db push` würde alle ausstehenden Versionen in Reihenfolge anwenden.
Darum darf der Organisationsblock nicht mit einem ungeprüften Standard-Push
aktiviert werden.

### Drei kontrollierte Wege

1. **Empfohlen: Organisationsmigration als eigenen Production-Schritt
   isolieren.** Vor dem Release wird eine migrationshistorisch saubere
   Trennung festgelegt, damit der Organisationsblock unabhängig aktiviert und
   die Feedback-Kette weiter geschlossen bleiben kann.
2. **Gesamte Kette dormant anwenden.** Nur nach eigenständigem Security-,
   Minor-, Rollback- und Production-Review; Client-, Collection-, Text- und
   Machine-Gates bleiben geschlossen. Das ist breiter und riskanter.
3. **Organisationsanfrage in V1.1 sichtbar, aber nicht absendbar lassen.**
   Technisch am risikoärmsten, aber nicht die gewünschte professionelle
   Produkterfahrung.

Keiner dieser Wege wird ohne informierte Freigabe produktiv ausgeführt.

Die vorhandene Staging-Instanz bildet jetzt die erste Organisationsfassung,
den kurzen Teamweg und die 365-Tage-Aufbewahrungslogik ab. Beide
Folgemigrationen wurden einzeln angewendet; Rollen-, Payload-, Lösch-,
Rollback- und HTTP-Negativpfade sind erneut grün. Die öffentliche Annahme
bleibt dennoch absichtlich geschlossen, bis Turnstile vorhanden ist.

Der bisherige getrennte Staging-Nachweis ist in
`docs/V1_1_ORGANIZATION_STAGING_ASSURANCE_2026-08-09.md` festgehalten. Der
Endpunkt bleibt dort ohne echten Turnstile-Schlüssel und Aktivierungsflag
fail-closed.

## Geordnete Reststrecke

### Vor physischem Test

- [x] vollständige lokale CI und Production-Webbuild;
- [x] Dependency-Audit ohne Befund auf dem Release-Kandidaten;
- [x] Version 1.1 / Build 5 lokal vorbereitet und statisch geschützt;
- [x] Feedback-Clientgate explizit geschlossen dokumentiert;
- [x] Icon-Qualitätsblock unabhängig geprüft und integriert;
- [x] erste Organisationsmigration und Edge Function isoliert in Staging anwenden;
- [x] Rollen-, RLS-, DE-/Notice- und HTTP-Negativpfade in Staging prüfen;
- [x] additive Teamweg-Migration und aktualisierte Edge Function isoliert in
      Staging anwenden und beide Anfragewege erneut prüfen;
- [ ] echten Turnstile-Site-Key/Secret nach Nutzeranmeldung ausschließlich in
      Staging setzen und einen positiven synthetischen E2E-Smoke durchführen;
- [ ] App-Store-Privacy-/Review-Text gegen den tatsächlich aktivierten Umfang
      aktualisieren.

### Sobald das iPhone verfügbar ist

1. exakten finalen Commit mit Production-Konfiguration bauen;
2. App ausdrücklich beenden, neu installieren und neu starten;
3. Start/Signup/Minderjährigen-Rückweg, Daily Flow, Rest-Day-Visualisierung,
   Journal, Einstellungen und Organisationsanfrage prüfen;
4. Ton, Haptik, Timer, Lautlosmodus, Wake Lock, Scroll-Reset und Deep Links
   prüfen;
5. nur diesen physisch bestätigten Commit als Archive-/TestFlight-Quelle
   verwenden.

### Danach

1. PR nach finalem Review mergen;
2. den ausdrücklich freigegebenen Backend-Scope kontrolliert aktivieren;
3. negative und positive Zielumgebungs-Smokes durchführen;
4. Production-Build und signiertes Archive für `1.1 (5)` erzeugen;
5. TestFlight installieren und Golden Flows erneut prüfen;
6. App Store Connect auf den realen Funktions- und Privacy-Umfang abstimmen;
7. Update zur Prüfung einreichen.

## Harte Grenzen

- Feedback-Freitext, Guardian-Feedback-Scope und echte Machine-/Jarvis-Reads
  bleiben ohne qualifizierte Privacy-/Rechtsfreigabe aus. Die technisch
  freigegebene 365-Tage-Aufbewahrung ist ausschließlich in Staging aktiv;
  Production bleibt geschlossen.
- Ein grünes CI oder vorhandene Migrationen beweisen keine Production-Aktivität.
- Ein erfolgreicher Build/Install ersetzt nicht Mahles physischen Sicht- und
  Verhaltenstest.
- Kein Standard-Migrationspush, solange dessen exakte Pending-Liste nicht
  read-only verifiziert und ausdrücklich freigegeben ist.
