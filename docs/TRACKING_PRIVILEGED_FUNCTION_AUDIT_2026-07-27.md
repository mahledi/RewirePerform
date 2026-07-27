# Tracking Privileged Function Audit

Stand: 27. Juli 2026

Scope: alle 53 `SECURITY DEFINER`-Funktionen im Production-Schema `public`, die
von `authenticated` ausgefuehrt werden koennen.

## Kurzurteil

Die 53 Advisor-Warnungen sind nicht mit 53 frei ausnutzbaren Funktionen
gleichzusetzen. Der read-only Production-Audit hat fuer alle 53 bestaetigt:

- `anon` besitzt kein Ausfuehrungsrecht;
- `authenticated` besitzt nur den vorgesehenen RPC-Einstieg;
- jede Funktion besitzt einen festen funktionsbezogenen `search_path`;
- 42 Funktionen pruefen `auth.uid()` direkt;
- zehn weitere delegieren an einen Rollen-, Team- oder Ownership-Guard;
- `get_nlz_evidence_dossier` delegiert an zwei bereits geschuetzte
  run-spezifische Funktionen.

Damit ist kein anonymer Bypass und kein ungeschuetzter
`SECURITY DEFINER`-Einstieg nachgewiesen. Die Warnungen muessen trotzdem
bestehen bleiben, solange die App die Funktionen als RPCs benoetigt.

## Teststand

- Alle 53 aktuell in Production inventarisierten Funktionen besitzen im
  aktuellen Repository einen lokalen Negativtest oder einen expliziten
  Guard-/Privacy-Vertrag.
- Der neue fokussierte PGlite-Test
  `scripts/verify-tracking-privileged-functions-sql.mjs` prueft 15 zuvor
  unzureichend belegte Funktionen mit Outsider-, Athleten-, Manager- und
  Admin-Negativpfaden.
- `approve_coach_access` und `find_coach_access_candidate` sind mit PR #95 auf
  `main` integriert und besitzen einen eigenen PGlite-Harness. Ihre
  Repository-Migration liegt als `20260723101114`, in Production aber als
  `20260723151225`. Dieser Versionsunterschied muss vor einem weiteren
  Production-Migrationslauf explizit reconciled werden.

Das Gate bleibt wegen dieses Production-Abgleichs **GELB**, nicht gruen.

## Vollstaendige Matrix

Legende:

- `Self`: nur eigene Daten beziehungsweise eigene Instanz.
- `Team`: Teammitglied darf lesen.
- `Manager`: Coach/Creator/Admin fuer das betroffene Team.
- `Admin`: bestehende serverseitige Adminrolle.
- `Evidence`: aktueller Consent-/Guardian-/Mindest-n-Vertrag.
- `Local`: Testbeweis im aktuellen Repository.
- `Pending`: Beweis liegt auf dem noch nicht integrierten App-Store-Branch.

| Nr. | Funktion | Grenze | Negativbeweis |
|---:|---|---|---|
| 1 | `activate_team_program_run(uuid)` | Manager | Local focused |
| 2 | `approve_coach_access(uuid,uuid,text,text)` | Admin | Local access |
| 3 | `archive_qa_cohort(uuid)` | Admin | Local evidence |
| 4 | `assign_team_members_to_program_run(uuid)` | Manager | Local focused + MahleOS |
| 5 | `can_manage_team_calendar(uuid)` | Manager helper | Local policy |
| 6 | `can_manage_team_program_runs(uuid)` | Manager helper | Local focused |
| 7 | `compute_team_outcomes(uuid,integer)` | Manager + Evidence | Local privacy |
| 8 | `create_evidence_data_lock(uuid,text,text,boolean,text)` | Admin + Evidence | Local evidence |
| 9 | `create_team_program_run(uuid,text,date)` | Manager | Local focused |
| 10 | `find_coach_access_candidate(text)` | Admin | Local access |
| 11 | `get_active_team_program_run(uuid)` | Team/Manager | Local focused |
| 12 | `get_admin_evidence_eligibility(boolean)` | Admin | Local minor/evidence |
| 13 | `get_admin_evidence_quality(boolean)` | Admin | Local focused |
| 14 | `get_admin_nlz_evidence_dossier(boolean,uuid)` | Admin + Evidence | Local evidence |
| 15 | `get_admin_ops_status(boolean)` | Admin | Local operations |
| 16 | `get_admin_overview_stats()` | Admin | Local admin |
| 17 | `get_admin_overview_stats(boolean)` | Admin | Local admin |
| 18 | `get_admin_presentation_metrics(boolean)` | Admin + Consent | Local focused |
| 19 | `get_admin_study_overview(boolean)` | Admin + Consent | Local focused |
| 20 | `get_admin_system_health()` | Admin | Local focused |
| 21 | `get_admin_teams_summary()` | Admin | Local admin |
| 22 | `get_admin_teams_summary(boolean)` | Admin | Local admin |
| 23 | `get_coach_evidence_review_context(uuid,text)` | Manager | Local evidence |
| 24 | `get_coach_team_activity_status(uuid)` | Manager | Local focused |
| 25 | `get_effective_today(uuid)` | Self/Admin | Local runtime |
| 26 | `get_evidence_data_lock(uuid)` | Admin | Local evidence |
| 27 | `get_my_evidence_status(uuid,text,integer,text)` | Self | Local evidence |
| 28 | `get_my_transfer_evidence_summary(uuid,text)` | Self | Local evidence |
| 29 | `get_nlz_evidence_dossier(uuid)` | Manager + Evidence | Local focused |
| 30 | `get_nlz_pilot_readiness(uuid,uuid)` | Manager/Admin | Local readiness |
| 31 | `get_performance_evidence_summary(uuid,boolean,text)` | Admin/Manager + Evidence | Local evidence/minor |
| 32 | `get_program_run_development_evidence(uuid,text)` | Manager + Evidence | Local focused/minor |
| 33 | `get_qa_evidence_parity(uuid,text)` | Admin + QA only | Local evidence |
| 34 | `get_solo_development_evidence_summary(text,text,boolean,text)` | Admin + Evidence | Local minor/evidence |
| 35 | `get_solo_sport_evidence_summary(text,text,boolean,text)` | Admin + Evidence | Local evidence |
| 36 | `get_team_mental_state_aggregate(uuid,text)` | Manager + Evidence | Local privacy/runtime |
| 37 | `get_team_program_run_status(uuid)` | Team/Manager | Local focused |
| 38 | `get_team_questionnaire_status(uuid)` | Manager | Local focused |
| 39 | `get_team_stats(uuid)` | Team/Manager | Local policy |
| 40 | `get_user_role(uuid)` | Self/Admin | Local runtime |
| 41 | `has_role(uuid,app_role)` | Self/authorization helper | Local policy |
| 42 | `invalidate_evidence_data_lock(uuid,text)` | Admin | Local evidence |
| 43 | `is_coach_of_user(uuid)` | Coach relation helper | Local policy |
| 44 | `is_creator_of_team(uuid)` | Ownership helper | Local policy |
| 45 | `is_member_of_team(uuid)` | Membership helper | Local policy |
| 46 | `join_team_by_code(text)` | Authenticated athlete | Local access |
| 47 | `refresh_my_program_progress_snapshot(uuid)` | Self | Local runtime |
| 48 | `save_coach_evidence_review(text,uuid,uuid,text,integer,text,jsonb,integer)` | Manager | Local evidence |
| 49 | `save_daily_tracking_v2(...)` | Self + active instance | Local runtime |
| 50 | `save_daily_tracking_v3(...)` | Self + active instance | Local runtime/evidence |
| 51 | `set_evidence_adult_eligibility(uuid,boolean)` | Admin | Local minor/evidence |
| 52 | `set_team_program_run_status(uuid,text)` | Manager | Local focused |
| 53 | `update_feedback_status(uuid,text,text)` | Admin | Local focused |

## Production-Abgleich

Production meldet 53 passende Funktionen und keine fuer `anon` ausfuehrbare
Funktion in diesem Scope. Die Verteilung der finalen Suchpfade ist:

- 27 Funktionen: `search_path=pg_catalog`
- 26 Funktionen: `search_path=public`
- 0 Funktionen ohne festen Suchpfad

`search_path=public` ist hier nicht automatisch ein Exploit, weil der Pfad
funktionsbezogen fixiert ist und normale App-Rollen keine Objekte in `public`
erzeugen duerfen. Fuer neue oder erneut gehaertete Funktionen bleibt
`pg_catalog` plus vollqualifizierte Objektnamen der bevorzugte Standard.

## Vorgeschlagene 54. Funktion

Dieser Branch fuegt
`get_admin_comprehension_insights(boolean)` als neue, noch nicht in Production
aktivierte Funktion hinzu. Sie:

- prueft die Adminrolle serverseitig;
- verwendet `search_path=pg_catalog` und vollqualifizierte Objekte;
- schliesst QA-/Testdaten standardmaessig aus;
- unterdrueckt Scores unter fuenf unterschiedlichen Athleten;
- gibt keine Nutzerkennungen, Namen, E-Mails, gewaehlten Antwortoptionen,
  Journale oder Reflexionen aus;
- besitzt einen eigenen PGlite-Negativtest.

Nach Anwendung in Production muss die Inventur deshalb 54 statt 53 Funktionen
erwarten. Vorher bleibt die Production-Zahl korrekt bei 53.

## Merge-Gate

Gruen erst wenn:

1. die Migration `20260723101114` gegen die bereits als `20260723151225`
   angewendete Production-Version reconciled ist;
2. die neue Verstaendnisfunktion unabhaengig geprueft und ausdruecklich fuer
   Production freigegeben ist;
3. der komplette SQL-, Privacy- und CI-Lauf vom finalen `main` erneut gruen ist.
