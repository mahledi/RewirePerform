# Feedback Intelligence 1.1 – isolierter Staging-Nachweis

Stand: 6. August 2026

## Bedeutung

Der Feedback-Intelligence-Datenbankpfad wurde in einem neuen, vollständig von
Production getrennten Supabase-Projekt mit ausschließlich synthetischen Daten
geprüft. Migrationen, Rollenbegrenzung, Minderjährigen-Schutz, Widerruf und der
Tag-10-Submit-Pfad verhalten sich in echtem PostgreSQL wie vorgesehen.

Dieser Nachweis aktiviert weder die Athleten-Collection noch Rohtextanalyse,
Jarvis, App Store oder Production. Das Staging-Projekt endete leer, alle
Collection- und Machine-Gates blieben geschlossen und alle Kampagnen blieben
`draft`.

## Zielumgebung und Kosten

- Supabase-Organisation: `NeuroRewire` (`zyjuvzaaennmpmddqmzl`), Free-Plan.
- Staging-Projekt: `RewirePerform Staging` (`zbeswjipayspgvcipzmx`).
- Region: `eu-central-1`.
- von Supabase vor Erstellung ausgewiesene Projektkosten: 0 USD pro Monat.
- Production blieb unverändert: `RewirePerform real`
  (`bqsbxesmybthwtxmowfz`).
- Der historische Ref `towgvykgezrmkbyudjen` bleibt stillgelegt und im
  Release-Target-Validator gesperrt.

Das getrennte Free-Projekt liefert für diesen technischen Datenbanknachweis die
benötigte Isolation. Es ersetzt keine später zu entscheidenden Pro-Funktionen
wie Preview Branches, Point-in-Time-Recovery, höhere Limits oder
Production-Backups.

## Deployment-Nachweis

- Ausgangszustand: neues Projekt, null App-Migrationen, null Auth-Nutzer.
- 79 bestehende Repository-Migrationen bis
  `20260801104717_harden_team_join_minor_authorization.sql` angewendet.
- zehn Feedback-Intelligence-/Guardian-Migrationen angewendet.
- additive Indexmigration
  `20260806081925_feedback_intelligence_fk_indexes.sql` angewendet.
- Endzustand: 90 Migrationen, Projektstatus `ACTIVE_HEALTHY`.

Die zusätzliche Migration schließt die vier vom Supabase Performance Advisor
gemeldeten Foreign-Key-Zugriffspfade. Danach bestanden für Feedback
Intelligence keine ungeindexierten Foreign Keys und keine bereichsspezifischen
Performance-Warnungen mehr.

## Rollen- und Zugriffsnachweis

Die folgenden echten Zielumgebungsprüfungen schlugen erwartungsgemäß
fail-closed fehl:

- `anon` auf dem Machine-RPC;
- `authenticated` direkt auf einer Rohtexttabelle;
- `service_role` direkt auf einer Rohtexttabelle;
- `authenticated` ohne Adminrolle auf dem Admin-Aggregat-RPC;
- `service_role` auf dem Machine-RPC.

Ein authentifizierter Claim bei geschlossenen Gates lieferte ausschließlich
`eligible: false` mit `reason: collection_disabled`. Der Guardian-RPC bleibt
nur für `service_role` ausführbar. `PUBLIC`, `anon`, `authenticated` und
normale Runtime-Rollen erhalten weder direkte Raw-/Consent-/Analysis-Rechte
noch Machine-Export-Rechte.

Supabase meldet weiterhin generische Hinweise für private RLS-Tabellen ohne
Policies und bewusst `SECURITY DEFINER` ausgeführte RPCs. Das ist hier Teil des
Designs: Tabellen bleiben vollständig verborgen; die eng begrenzten RPCs
prüfen Nutzeridentität, Rolle, Consent und Gates serverseitig. Die realen
Rollen-Negativtests bestätigen die beabsichtigte Begrenzung.

## Minderjährigen- und Widerrufsnachweis

Alle Fixtures liefen innerhalb von Transaktionen und wurden anschließend
zurückgerollt.

1. Ein synthetischer unter-16-jähriger Athlet ohne exakt passende
   Guardian-Autorisierung konnte keinen Freitext-Nachweis erhalten. PostgreSQL
   blockierte mit `42501 guardian_feedback_text_scope_required`.
2. Mit passender Guardian-Autorisierung und Athleten-Einwilligung konnten ein
   freiwilliger Kommentar und ein Analyseartefakt synthetisch erzeugt werden.
3. Beim Guardian-Widerruf wechselten Guardian- und Athleten-Nachweis auf
   `withdrawn`; Rohtext und Analyseartefakt wurden gelöscht.
4. Die strukturierte Antwort blieb erhalten; drei Auditereignisse wurden
   geschrieben.

Damit ist der technische Lebenszyklus Grant → Nutzung → Widerruf in Staging
belegt. Die deutsche Rechts-, Datenschutz- und Textfreigabe bleibt davon
unabhängig offen.

## Tag-10-RPC-Nachweis

Für einen synthetischen erwachsenen Athleten wurde innerhalb einer Transaktion
kurzzeitig nur die Tag-10-Kampagne samt DE-Testpolicy geöffnet. Über die echten
Athleten-RPCs liefen nacheinander:

1. `claim_my_feedback_checkpoint`;
2. `start_my_feedback_submission`;
3. `save_my_feedback_draft`;
4. `submit_my_feedback`.

Das Ergebnis war eine finalisierte Submission mit einer strukturierten
Antwort, null Rohtexten, einem unveränderlichen Activity-Snapshot und null
Freitext-Einwilligungen. Die Transaktion wurde vollständig zurückgerollt.

## Finaler leerer Zustand

Nach allen Prüfungen galt:

- null Auth-Nutzer und null Feedback-, Rohtext-, Analyse- oder Zugriffsdaten;
- vier Kampagnen, alle `draft`;
- `rollout_ready = false` und Minor-Enforcement nicht aktiviert;
- sämtliche Collection-, Privacy-, Store-, Text- und Machine-Gates `false`;
- Guardian-Policy weiterhin `draft`;
- Machine-RPC weiterhin ohne Runtime-Execute-Grant.

## Lokaler Release-Nachweis gegen Staging

Der vollständige Staging-Build lief gegen den exakten Projekt-Ref, die exakte
Staging-URL und einen nur im Prozess übergebenen Publishable Key:

- `npm run web:build:staging`: grün;
- 102 Vitest-Dateien mit 585 Tests: grün;
- alle Feedback-, Guardian-, Access-, Deletion- und Store-SQL-Harnesses: grün;
- TypeScript, App-Store-Static-Checks, Release-Target-Validierung und
  Vite/PWA-Build: grün.

Der Publishable Key wurde weder dokumentiert noch in Dateien oder Git
geschrieben.

## Weiterhin geschlossene Gates

Vor einer echten Athleten- oder Rohtextaktivierung fehlen weiterhin:

1. qualifizierte deutsche Rechts-, Datenschutz- und Minderjährigenfreigabe;
2. finale Privacy- und App-Store-Datenerklärungen;
3. Guardian-Kommunikation über die echte Edge-/E-Mail-Strecke;
4. signierter nativer Build und Gerätetest;
5. vollständige Lösch-/Retention- und mehrtägige Laufzeitprüfung;
6. separat genehmigter synthetischer Machine-Read mit dediziertem Read-only
   Actor;
7. danach eine neue, ausdrückliche Production- und Real-Read-Freigabe.

Es wurden keine Production-Migration, kein Production-Secret, kein Push, kein
Merge, kein App-Store-Schritt und kein echter Jarvis- oder Nutzerdatenzugriff
ausgeführt.
