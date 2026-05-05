## What's actually broken

Your admin account is **already correct in the database**:

```
user_id: 870240aa-6742-4374-84a2-fbc108559a71  →  role: admin   (only row)
```

But every request to `GET /user_roles?user_id=eq.870240aa...` returns:

```
500  "infinite recursion detected in policy for relation \"teams\""
```

So `AuthContext.fetchRole()` fails silently, `role` stays `null`, and the UI behaves as if you have no admin access. This affects **all logged-in users**, not just you — coaches and athletes can't load their role either right now.

### Why it recurses

Current policies on `user_roles`:
- `Coaches can read team member roles` → subquery on `team_members` → which has policy `Coach can view own team members` → subquery on `teams` → which has policy `Members and creator can view teams` → subquery on `team_members` again. Postgres aborts the chain.

The `has_role()` SECURITY DEFINER function exists specifically to break this kind of cycle, but the coach-facing `user_roles` policy bypasses it with an inline `EXISTS` subquery.

## Fix (single migration, no code changes)

1. **Replace the recursive `user_roles` SELECT policies** with non-recursive ones that use the existing SECURITY DEFINER `has_role()` helper, plus a simple "own row" rule:
   - `Users read own role` → `user_id = auth.uid()`
   - `Admins read all roles` → `has_role(auth.uid(), 'admin')`
   - Coach access to athlete roles is moved into a SECURITY DEFINER helper (`is_coach_of(_user_id)`) so the policy doesn't traverse `team_members` → `teams` inline.

2. **Simplify the `teams` SELECT policy** to also avoid the `team_members` → `teams` cycle by introducing a SECURITY DEFINER `is_member_of_team(_team_id)` helper.

3. **Simplify `team_members` SELECT** the same way (use a SECURITY DEFINER `is_creator_of_team(_team_id)` helper instead of an inline subquery on `teams`).

All three helpers will be `STABLE SECURITY DEFINER SET search_path = public`, matching the existing `has_role` pattern, so they don't trigger RLS recursion.

4. **No data change needed** — your `admin` row is already there. After the migration, the next `GET /user_roles` will succeed and `AuthContext` will set `role = 'admin'`, which makes `/admin` load and the rest of the app treat you as admin.

## Verification after migration

- `SELECT role FROM user_roles WHERE user_id = '870240aa-...'` → `admin` (already true).
- Open the app, hard-refresh, sign in. Network tab: `GET /user_roles?...` → `200`, body `[{"role":"admin"}]`.
- Navigate to `/admin` — Admin Control Center loads.
- Coaches and athletes can still load their own role and team data (verified by the new helper functions returning the same answers the old subqueries did).

## Risk

Low. The new policies preserve the same access semantics:
- Users still see only their own role.
- Coaches still see roles of their team members.
- Admins still see everything.
- Teams/team_members visibility for coaches and members is unchanged.

The only behavioral change is that the SELECT no longer crashes.

## Out of scope

- No frontend changes.
- No new tables or columns.
- No change to `has_role`, the admin RPCs, or the existing admin UI.
- Not re-promoting the account — it is already admin.
