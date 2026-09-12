# Daten, Auth und Privacy

## Sensible Daten

- Account-ID und E-Mail.
- Team- und Rollenbezug.
- Check-in-Zustandswerte.
- Journal-, Dankbarkeits- und Reflexionstexte.
- Fragebogen- und Assessment-Rohantworten.
- individuelle Scores, Progress und Kalender-/Trainingsdaten.
- Push-Endpunkte und technische Notification-Logs.
- Consent-Status und Study-Zuordnung.

## Verbindliche Regeln

- `RP-PR-01 | CONFIRMED_FROM_CODE` Auth basiert auf Supabase Sessions mit persistenter Session und Token-Refresh.
- `RP-PR-02 | CONFIRMED_FROM_CODE` Rollen werden serverseitig aus `user_roles` geladen; lokaler Cache ist nur UX-Fallback.
- `RP-PR-03 | CONFIRMED_FROM_BOTH` Coach-Zugriff muss RLS-/RPC-seitig begrenzt sein, nicht nur durch ausgeblendete UI.
- `RP-PR-04 | CONFIRMED_FROM_BOTH` Coaches sehen keine Journaltexte, Freitexte, Einzel-Check-ins, Rohantworten oder individuellen psychologischen Scores.
- `RP-PR-05 | CONFIRMED_FROM_BOTH` Admin-Evidence-Exporte enthalten keine Namen, E-Mails, privaten Texte, Rohantworten oder Einzelverlaeufe.
- `RP-PR-06 | CONFIRMED_FROM_CODE` Sentry ist aus der App entfernt; das behaltene externe Projekt darf ohne neue Privacy- und Produktfreigabe nicht verbunden werden.
- `RP-PR-07 | CONFIRMED_FROM_CODE` `app_event_log` ist Incident-Log, kein allgemeines Klicktracking.
- `RP-PR-08 | CONFIRMED_FROM_CODE` Teamcodes duerfen nicht in Incident-Metadaten oder einen spaeter erneut freigegebenen Diagnosedienst gelangen.
- `RP-PR-09 | CONFIRMED_FROM_CODE` Freiwilliger Datenbeitrag ist versioniert, widerrufbar und erst nach Serverspeicherung Evidence-wirksam.
- `RP-PR-10 | CONFIRMED_FROM_CODE` QA/Test und Production muessen durch Flags und getrennte Auswertung unterscheidbar bleiben.
- `RP-PR-11 | CONFIRMED_FROM_BOTH` Psychologische Aggregate unter fuenf Personen muessen serverseitig auf `null` gesetzt beziehungsweise unterdrueckt werden.
- `RP-PR-12 | CONFIRMED_FROM_CODE` Secrets gehoeren in Supabase-/Hosting-Secrets, nie in Frontend, Chat, Commit oder Dokumentation.
- `RP-PR-13 | CONFIRMED_FROM_CODE` Frontend nutzt nur Publishable Key; Service Role ist ausschliesslich Backend/Function-Kontext.
- `RP-PR-14 | CONFIRMED_FROM_CODE` Account-Loeschung wird aktuell ueber Anfrage mit versprochener Bearbeitung innerhalb 48 Stunden beschrieben.
- `RP-PR-15 | OUTDATED_OR_UNCERTAIN` Ob der organisatorische 48-Stunden-Loeschprozess operational und vollstaendig getestet ist, ist im Repo nicht belegt.
- `RP-PR-16 | CONFIRMED_FROM_BOTH` Die Produktregel fuer Minderjaehrige ist lokal implementiert: unter 16 Guardian-Autorisierung plus eigene Zustimmung, 16 bis 17 eigene altersgerechte Entscheidung, kein Verein im Guardian-Flow. Production-Aktivierung bleibt bis Fachpruefung und Staging gesperrt.

## Niemals ohne Mahles vorherige Freigabe

- RLS-Policies, Rollenhelper oder Grants veraendern.
- Auth-Provider, Signup-/Login-Routing oder Teamcode-Zuordnung veraendern.
- Migrationen anwenden oder produktive SQL-Operationen ausfuehren.
- neue sensible Felder, Analytics, SDKs oder Datenempfaenger einfuehren.
- Coach-Zugriff auf Athletendaten erweitern.
- Consent-Scope oder Loeschlogik aendern.
- Service-Role-, VAPID-, DB- oder OAuth-Secrets bearbeiten/anzeigen.
- Production-Daten exportieren, backfillen, migrieren oder loeschen.
- Payments oder vertraglich relevante Datenverarbeitung einfuehren.

## Offene Privacy-Pflichten

- Self-Service-Loeschung beziehungsweise belastbarer operativer Loeschprozess.
- Consent-Widerruf gegen gespeicherte Snapshots organisatorisch/rechtlich klaeren.
- Die implementierte Minderjaehrigenregel, Rechtsgrundlagen und Texte qualifiziert juristisch pruefen; der Verein ist nach Produktentscheidung nicht Teil des Guardian-Flows.
- App Store Privacy Labels mit realem Produktionsverhalten abgleichen.
- `PrivacyInfo.xcprivacy` und Required-Reason APIs vor Submission pruefen.
