Lösche den Account `mherzogjuniorathlete6@gmail.com` vollständig aus der Datenbank.

## Vorgehen

1. User-ID via `auth.users` für die Mail nachschlagen.
2. Account in `auth.users` löschen — alle abhängigen Tabellen (`profiles`, `user_roles`, `daily_checkins`, `daily_journals`, `questionnaire_responses`, `team_members`, `program_instances`, `user_day_*`, `personalized_tasks`, `push_subscriptions`, `assessments`, `deep_profile_assessments`, `feedback`, `calendar_events`, `training_schedule`, `notification_log`, `qa_time_overrides`, `program_settings`, `program_progress_snapshots`, `comprehension_check_instances`, `coach_journals`) werden via `ON DELETE CASCADE` (FK auf `auth.users`) automatisch mitgelöscht.
3. Falls einzelne Tabellen keinen Cascade haben, vorher explizit per `user_id` löschen.

## Hinweis

Die Löschung ist endgültig und nicht umkehrbar. Bestätige bitte, dann führe ich es aus.