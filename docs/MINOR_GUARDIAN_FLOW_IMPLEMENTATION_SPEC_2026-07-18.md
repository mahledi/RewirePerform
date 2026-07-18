# Minderjaehrigen- und Guardian-Flow: Implementierungsvertrag

Stand: 18. Juli 2026

Branch: `codex/minor-guardian-flow-20260718`

Status: lokal vollstaendig implementiert und technisch geprueft; noch nicht migriert, deployed oder fuer reale Minderjaehrige aktiviert

## 1. Produktvertrag

| Thema | Verbindliche Umsetzung |
|---|---|
| Teilnahme | freiwillig; ein Nein sperrt nur datenabhaengige RewirePerform-Funktionen |
| Altersabfrage | nur Altersgruppe; kein Geburtsdatum, Ausweis oder Altersdokument |
| unter 16 | Entscheidung einer sorgeberechtigten Person plus eigene Zustimmung des Athleten |
| 16 bis 17 | eigene verstaendliche Produktentscheidung; kein Guardian-Kontakt im Deutschland-Flow |
| ab 18 | Produktzugang ohne Guardian; freiwilliger Datenbeitrag bleibt getrennt |
| Guardian-Kontakt | vom Athleten eingegeben; verschluesselt und kurzzeitig gespeichert |
| Verein | kein Actor, Empfaenger oder Freigabeschritt des Guardian-Flows |
| Marketing | keine Werbung, kein Newsletter, kein Open- oder Link-Tracking fuer Guardian-E-Mails |
| Produkttracking | nach vollstaendiger Produktfreigabe aktiv, weil es das 56-Tage-Programm bereitstellt |
| Datenbeitrag | getrenntes freiwilliges Ja/Nein fuer gruppierte Produkt- und Performance-Optimierung |
| Transfer-Evidence | aktuelles Protokoll bleibt fuer alle Minderjaehrigen technisch deaktiviert |
| Adult-Evidence | Alters-Selbstauskunft und Datenbeitrag erzeugen keine Evidence-Freigabe; die bestehende separate Admin-Verifikation bleibt erforderlich |
| Trainer-Sicht | nur operative Aktivitaet; keine Guardian-Daten, privaten Antworten oder Einzelwerte |
| Zweckgrenze | keine Diagnose, Behandlung, Krisenhilfe oder Gesundheitsforschung |

Ein Nein zum freiwilligen Datenbeitrag veraendert das normale Programm nicht. Eine spaetere wissenschaftliche Studie braucht einen neuen, getrennten Vertrag und wird durch diesen Flow nicht freigegeben.

## 2. Zustandsmodell

```text
unknown_age
  -> adult: product_authorized
  -> age_16_17: athlete_assent_required
       -> product_authorized | declined
  -> under_16: guardian_contact_required
       -> guardian_pending
            -> guardian_declined | guardian_expired
            -> athlete_assent_required
                 -> product_authorized | declined

product_authorized
  -> revoked | policy_refresh_required
```

Guardian-Ja allein reicht bei unter 16 nicht. Der Athlet muss selbst zustimmen. Ein Athleten-Ja kann eine fehlende oder eingeschraenkte Guardian-Entscheidung nicht erweitern. Jeder Widerruf sperrt neue geschuetzte Writes serverseitig.

## 3. Datenmodell

Migration: `supabase/migrations/20260718122735_minor_guardian_authorization_v1.sql`

Das private Schema `minor_auth` ist fuer `PUBLIC`, `anon` und `authenticated` gesperrt. Nur die Service Role kann die versionierte Zustandsmaschine aufrufen.

### Tabellen

- `policy_versions`: aktive Deutschland-Policy, Einzelversionen und SHA-256-Hash des sichtbaren Inhalts;
- `participant_authorizations`: Altersgruppe, Produkt-, Guardian-, Athleten- und Datenbeitragsstatus;
- `guardian_challenges`: Token-Hash, AES-GCM-verschluesselte Adresse, HMAC-Lookup-Hash, Maske und Zustellstatus;
- `guardian_access_tokens`: gehashter, befristeter Widerrufslink;
- `authorization_audit`: minimierter Nachweis aus Actor, Event, Version, Status und Zeitpunkt; keine Adresse oder Freitexte;
- `system_settings`: globaler serverseitiger Enforcement-Schalter, standardmaessig `false`.

Alle Datensaetze referenzieren `auth.users` mit Kaskadenloeschung. Es werden kein Geburtsdatum, keine Ausweiskopie, keine IP-Adresse und kein User-Agent fuer diesen Flow gespeichert.

## 4. Serverseitige Durchsetzung

Die Migration setzt Write-Guards vor folgende personenbezogene Produktpfade:

- Fragebogenantworten;
- Check-ins und Journale;
- Assessments und Deep Profile;
- Tageszuweisungen und Tagesabschluesse;
- Verstaendnischecks und Fortschrittssnapshots;
- strukturierte Transferbeobachtungen.
- Kalenderereignisse, Programmeinstellungen und Programminstanzen;
- Trainingszeiten, Push-Abonnements und personalisierte Aufgaben;
- spaetere Aenderungen an Name, Sport, Position oder Profil-Teamfeld.

Der Profil-Trigger verhindert einen positiven Datenbeitrag ohne aktuelle, passende Autorisierung. `team-mental-state` filtert zuerst nach aktueller Consent-Version und Autorisierung und berechnet erst danach `n >= 5`.

Das Enforcement wird nicht mit der Migration automatisch eingeschaltet. `enforcement_preflight` muss zuerst bestaetigen, dass alle bestehenden Athleten eine aktuelle Produktentscheidung besitzen und kein positiver Datenbeitrag ohne passenden Nachweis existiert. Erst danach darf `set_enforcement` in Staging und spaeter Produktion aktiviert werden.

## 5. Edge Functions

### `minor-guardian-user`

JWT-geschuetzte Aktionen fuer Status, Altersgruppe, Einladung, Resend, eigene Zustimmung, Datenbeitrag, Widerruf und Neustart.

### `minor-guardian-public`

Oeffentliche Token-Aktionen fuer Information, Guardian-Entscheidung, Widerrufsstatus, getrennten Widerruf des freiwilligen Datenbeitrags und vollstaendigen Guardian-Widerruf. `verify_jwt=false` ist nur fuer diesen Token-Endpunkt gesetzt; Token-Laenge, Hash, Ablauf und Einmalnutzung werden selbst geprueft.

### Sicherheitsmerkmale

- 256-Bit-Zufallstoken; nur SHA-256-Hashes in Postgres;
- Token werden im Guardian-Link als URL-Fragment uebertragen und gelangen dadurch nicht in Vercel-Query-Logs;
- AES-256-GCM fuer Guardian-Adressen und separater HMAC-Schluessel fuer Rate Limits;
- maximal drei Challenges pro Stunde und sechs pro Tag je Nutzer oder Zielhash;
- Resend erzeugt einen neuen Token und widerruft den alten;
- 8-KiB-Requestlimit, POST-only, no-store und enge Origin-Allowlist;
- keine Payload-, Token- oder Adresslogs;
- generische Antworten fuer ungueltige oder verbrauchte Links;
- Guardian-E-Mails enthalten keine externen Bilder, Werbung oder Trainerdaten.

## 6. Aufbewahrung und Widerruf

Der taegliche Cron-Job `minor-auth-retention-daily` setzt abgelaufene Challenges auf abgelaufen und loescht:

- Guardian-Challenges spaetestens sieben Tage nach Erstellung;
- aktive Guardian-Widerrufstoken bis zu 370 Tage, danach beziehungsweise nach Nutzung oder Widerruf Loeschung innerhalb von sieben Tagen;
- minimierte Consent-Receipts ohne Guardian-Adresse nach drei Jahren ab dem jeweiligen Ereignis;
- interne App-Fehlerereignisse nach 30 Tagen;
- Push-Zustellprotokolle nach 90 Tagen.

Ein Guardian- oder Athleten-Widerruf setzt Produkt und Datenbeitrag sofort auf widerrufen, deaktiviert den Profil-Consent, widerruft offene Tokens und sperrt neue geschuetzte Writes. Bereits vollstaendig anonyme Aggregate koennen nur bestehen bleiben, wenn kein Personenbezug mehr herstellbar ist.

## 7. App-Oberflaechen

- produktives Alters- und Freigabe-Onboarding unter `/minor-consent`;
- oeffentliche Guardian-Entscheidung und Verwaltung unter `/guardian/decision`;
- zentraler Gate fuer alle geschuetzten Athletenrouten;
- Status, Datenbeitrag und sicherer Gesamtwiderruf in `Konto & Daten`;
- oeffentliches Impressum und aktualisierte Datenschutzerklaerung;
- interne DEV-Vorschau aller relevanten UI-Zustaende.

Die produktiven Screens verwenden dieselben versionierten Policy-Texte, deren kanonischer JSON-Inhalt als SHA-256-Hash im Datenbank-Receipt gespeichert wird.

## 8. Lokal ausgefuehrte Abnahme

- TypeScript-App- und Node-Typecheck;
- Deno-Typecheck fuer beide neuen Edge Functions und `team-mental-state`;
- PGlite/PostgreSQL-Lauf der kompletten Migration;
- Adult-, 16/17- und Unter-16-Zustandsuebergaenge;
- Guardian-Ja plus eigene Zustimmung, Ablehnung und Widerruf;
- Consent-Filter, Evidence-Trennung, Write-Guards und Rollenrechte;
- Retention-Cleanup;
- Unit- und Contract-Tests;
- Chromium- und iPhone-WebKit-Vorschau mit Overflow- und Konsolenpruefung;
- Produktionsbuild, App-Readiness-Skripte und Diff-Checks.

## 9. Verbleibende Release-Gates

Dieser technische Vertrag ist kein Rechtsgutachten. Vor dem ersten realen Minderjaehrigen muessen ausserhalb dieses Branches nachweisbar abgeschlossen werden:

1. fachrechtliche Pruefung von Rechtsgrundlagen, Art.-8-Altersregel und Sorgeberechtigten-Selbsterklaerung fuer den konkreten Deutschland-Pilot;
2. Supabase-Migration zuerst in Staging sowie echte RLS/RPC-/Race-Tests;
3. Resend-Domain, Absender, AVV/DPA, deaktiviertes Open-/Link-Tracking und echte Zustellung;
4. Providerseitige Bestaetigung der Backup-Rotation und Restore-Sperre geloeschter Nutzer;
5. VoiceOver, Dynamic Type, Offline, echter iPhone- und Xcode-Archivtest;
6. kontrollierter Rollout: bestehende Athleten entscheiden lassen, Preflight pruefen, Enforcement getrennt aktivieren;
7. App-Store-Privacy-Angaben und Altersfreigabe gegen den finalen Binary-Privacy-Report abgleichen.

Kein lokaler Test autorisiert Push, Merge, Deploy, Migration oder reale Guardian-E-Mails.
