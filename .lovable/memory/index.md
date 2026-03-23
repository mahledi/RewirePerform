Design system: dark theme, primary=green (160 84% 39%), Space Grotesk headings, Inter body
Auth: Email/password with profiles table, auto-confirm enabled (no email verification)
Scientific assessments: CSAI-2R, SMTQ, Flow-Kurzskala (Pre/Post)
Language: German UI throughout
Session model: localStorage session_id + auth user_id (dual support during migration)
Roles: auto-assigned via DB trigger on auth.users insert (reads raw_user_meta_data->role)
Privacy: Coaches see only aggregated participation data, never individual answers/mood/reflections
