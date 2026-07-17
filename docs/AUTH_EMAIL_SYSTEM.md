# RewirePerform Auth Email System

Stand: 17. Juli 2026

## Ziel

Dieses Paket bildet den bewusst kleinen transaktionalen E-Mail-Fluss fuer den ersten RewirePerform App-Store-Release ab. Es umfasst ausschliesslich Registrierung, Passwort-Reset und die Sicherheitsmeldung nach einer Passwortaenderung.

Die Vorlagen sind bewusst frei von Marketing, Tracking-Pixeln, externen Bildern und privaten Produktdaten. Sie verwenden bis zur finalen Logoentscheidung eine robuste Textmarke.

## Implementierter Produktfluss

- Registrierung wartet bei aktivierter Supabase-Bestaetigung auf eine bestaetigte E-Mail.
- Bestaetigungs-E-Mail kann erneut angefordert werden.
- Link und sechsstelliger Code funktionieren als alternative Bestaetigungswege.
- Teamcode und sichere interne Zielroute bleiben beim Bestaetigungslink erhalten.
- Login mit unbestaetigter Adresse fuehrt zurueck in den Bestaetigungszustand.
- `Passwort vergessen?` fordert eine Recovery-E-Mail an, ohne offenzulegen, ob ein Konto existiert.
- Recovery funktioniert ueber Link oder sechsstelligen Code.
- Neues Passwort wird zweimal eingegeben und vor dem Supabase-Write lokal validiert.
- Abgelaufene, ungueltige oder bereits verwendete Links erhalten einen klaren Wiederherstellungsweg.
- Auth-Fehler werden in klare deutsche Meldungen uebersetzt; interne Providermeldungen werden nicht angezeigt.
- Nicht-HTTP-Urspruenge wie die interne Capacitor-WebView werden in E-Mails niemals als Redirect ausgegeben. Der sichere Fallback ist `https://rewireperform.com`.

## Versionierte Templates

Source of Truth:

```text
scripts/generate-auth-email-templates.mjs
supabase/templates/auth/manifest.json
supabase/templates/auth/*.html
```

Generieren und auf Drift pruefen:

```bash
npm run email:templates:build
npm run email:templates:check
```

| Datei | Supabase Dashboard | Aktivierung |
| --- | --- | --- |
| `confirmation.html` | Confirm signup | erforderlich |
| `recovery.html` | Reset password | erforderlich |
| `password_changed_notification.html` | Password changed | aktivieren |

Nicht Teil des Launch-Scopes sind Supabase-Einladungen, Magic Links, E-Mail-Aenderungen und E-Mail-Reauthentication. RewirePerform nutzt dafuer keine aktiven Produktflows. Coach-Einladungen laufen weiterhin ueber Team- beziehungsweise Coach-Code und die vorhandenen Teilen- und WhatsApp-Funktionen.

Betreffzeilen und Sender stehen in `manifest.json`. HTML wird nicht direkt editiert; Aenderungen erfolgen im Generator und werden neu erzeugt.

## Production-Aktivierung

Diese Schritte sind Dashboard-Aenderungen und werden nicht durch einen Git-Merge aktiviert.

1. Supabase Production-Projekt `bqsbxesmybthwtxmowfz` oeffnen.
2. Unter Authentication die Site URL auf `https://rewireperform.com` pruefen.
3. Mindestens diese exakten Redirect URLs erlauben:
   - `https://rewireperform.com/auth`
   - `https://rewireperform.com/auth/reset-password`
4. E-Mail-Bestaetigung aktiviert lassen.
5. Unter Authentication > Email Templates Betreff und HTML anhand des Manifests eintragen.
6. Die Sicherheitsmeldung fuer Passwortaenderungen aktivieren.
7. In Resend Link-/Open-Tracking fuer Auth-Mails deaktiviert lassen, damit Sicherheitslinks nicht umgeschrieben werden.
8. Sicherstellen, dass `hello@rewireperform.com` aus dem Support-Bereich tatsaechlich empfangen wird.

Keine API-Keys in Dashboard-Screenshots, Chat, Dokumentation oder Git uebernehmen.

## iOS-Grenze

Der HTTPS-Rueckweg funktioniert auf jedem iPhone im Browser. Damit derselbe Link die installierte App direkt oeffnet, braucht RewirePerform zusaetzlich Apple Universal Links:

- Associated Domains im signierten iOS Target
- `applinks:rewireperform.com`
- eine korrekte `/.well-known/apple-app-site-association`
- Routing von `/auth` und `/auth/reset-password` in die Capacitor-App

Diese iOS-Arbeit gehoert zum App-Store-Integrationsblock. Bis sie verifiziert ist, bleibt HTTPS der sichere produktive Fallback. Ein `capacitor://`-Link darf nicht per E-Mail versendet werden.

## QA-Matrix vor Aktivierung

| Fall | Erwartung |
| --- | --- |
| Neue Registrierung | Bestaetigungszustand statt vorzeitiger Fragebogen |
| Bestaetigungslink | Session wird erstellt, korrektes Ziel oeffnet |
| Bestaetigungscode | identisches Ergebnis wie Link |
| Teambeitritt | Teamcode bleibt erhalten, Fehler ist wiederholbar |
| Unbestaetigter Login | Bestaetigungszustand mit erneutem Versand |
| Passwort-Reset bekannte Adresse | E-Mail und Code kommen an |
| Passwort-Reset unbekannte Adresse | gleiche neutrale UI, keine Kontoauskunft |
| Abgelaufener Link | klare Meldung und neuer Anforderungsweg |
| Bereits verwendeter Link | keine zweite Verwendung, neuer Anforderungsweg |
| Passwort stimmt nicht ueberein | kein Supabase-Write |
| Passwort erfolgreich | Sicherheitsmeldung wird versendet |
| Gmail, Outlook, T-Online, Apple Mail | Button, Code, Dark Mode und Text umbrechen sauber |
| iPhone klein / Dynamic Type | keine abgeschnittenen Controls oder Texte |
| Resend und Supabase Logs | keine Fehler, keine privaten Inhalte |

## Rollback

- App-Code: E-Mail-Commits vor Merge getrennt halten und bei Bedarf gezielt zuruecknehmen.
- Templates: Vor dem Production-Update die bisherigen Subjects und HTML-Inhalte lokal sichern.
- SMTP nicht als Design-Rollback deaktivieren. Bei Templatefehlern nur auf die zuletzt funktionierende Vorlage zurueckgehen.
- Resend-Domain, DNS und API-Key nicht neu erzeugen, solange kein Credential-Vorfall vorliegt.
