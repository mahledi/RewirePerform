

# Team & Trainer System mit Zugangscode

## Was gebaut wird

Ein System, bei dem Mannschaften über einen **Zugangscode** verbunden werden. Sportler und Trainer nutzen denselben Code, wählen aber bei der Registrierung ihre **Rolle** (Sportler vs. Trainer). Trainer sehen ein Coach-Dashboard mit Übersicht aller Teammitglieder.

## Datenbank-Änderungen

### 1. `teams` Tabelle
- `id`, `name`, `sport`, `access_code` (unique, 6-stellig), `created_by` (user_id), `created_at`

### 2. `user_roles` Tabelle (Security Best Practice)
- `id`, `user_id` (FK auth.users), `role` (enum: `athlete`, `coach`), unique(user_id, role)

### 3. `team_members` Tabelle
- `id`, `team_id` (FK teams), `user_id` (FK auth.users), `joined_at`

### 4. `has_role()` Security Definer Funktion
- Verhindert RLS-Rekursion beim Rollen-Check

### 5. RLS Policies
- Trainer sehen alle Teammitglieder-Daten (Assessments, Check-ins, Fortschritt)
- Sportler sehen nur eigene Daten
- Team-Erstellung nur für authentifizierte User

## Frontend-Änderungen

### Auth.tsx erweitern
- Neues Feld bei Registrierung: **Rolle wählen** (Sportler / Trainer)
- Optionales Feld: **Zugangscode eingeben** (Team beitreten)
- Rolle wird in `user_roles` gespeichert, Code verknüpft User mit Team

### Neues Coach-Dashboard (`/coach`)
- Übersicht aller Sportler im Team: Name, Programm-Fortschritt, letzte Check-in-Daten
- Assessment-Ergebnisse (Pre/Post) pro Sportler
- Aggregierte Statistiken (Team-Durchschnitt Mood, Energie, Compliance)

### Team-Verwaltungsseite
- Trainer kann Team erstellen → generiert automatisch Zugangscode
- Code teilen mit Sportlern
- Mitglieder-Liste mit Möglichkeit zum Entfernen

### Routing
- `/coach` → ProtectedRoute + Rollen-Check (nur Trainer)
- `/dashboard` → bleibt Sportler-Dashboard
- Nach Login: Redirect basierend auf Rolle

## Technische Details

- Zugangscode: 6-stellige alphanumerische Codes, generiert via `gen_random_uuid()` substring
- Rollen-Check via `has_role()` SECURITY DEFINER Funktion (kein localStorage!)
- Coach sieht Daten über JOINs: `team_members` → `profiles`, `assessments`, `daily_checkins`

## Dateien

| Datei | Änderung |
|-------|----------|
| Migration SQL | teams, user_roles, team_members, RLS, has_role() |
| `src/pages/Auth.tsx` | Rollen-Auswahl + Zugangscode-Feld |
| `src/pages/Coach.tsx` | Neues Coach-Dashboard |
| `src/components/coach/TeamOverview.tsx` | Sportler-Liste mit Stats |
| `src/components/coach/TeamManagement.tsx` | Code generieren, Mitglieder verwalten |
| `src/App.tsx` | Neue Routes + Rollen-basiertes Routing |
| `src/contexts/AuthContext.tsx` | Rolle laden und bereitstellen |

