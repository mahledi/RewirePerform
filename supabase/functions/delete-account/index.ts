import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const RECENT_AUTH_MAX_AGE_SECONDS = 5 * 60;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type DeleteAction = "inspect" | "delete";
type TransferPlan = Record<string, string>;

interface RequestBody {
  action?: DeleteAction;
  transfers?: TransferPlan;
}

interface TeamCandidate {
  userId: string;
  fullName: string;
}

interface OwnedTeam {
  id: string;
  name: string;
  archived: boolean;
  candidates: TeamCandidate[];
}

const response = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

const parseJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const isRecentlyAuthenticated = (token: string) => {
  const payload = parseJwtPayload(token);
  const issuedAt = payload?.iat;
  if (typeof issuedAt !== "number") return false;
  const age = Math.floor(Date.now() / 1000) - issuedAt;
  return age >= -30 && age <= RECENT_AUTH_MAX_AGE_SECONDS;
};

const getOwnedTeams = async (
  admin: SupabaseClient,
  userId: string,
): Promise<OwnedTeam[]> => {
  const { data: teams, error: teamsError } = await admin
    .from("teams")
    .select("id,name,is_archived")
    .eq("created_by", userId)
    .order("created_at", { ascending: true });
  if (teamsError) throw teamsError;
  if (!teams?.length) return [];

  const teamIds = teams.map((team) => team.id);
  const { data: memberships, error: membershipsError } = await admin
    .from("team_members")
    .select("team_id,user_id")
    .in("team_id", teamIds)
    .neq("user_id", userId);
  if (membershipsError) throw membershipsError;

  const memberIds = Array.from(new Set((memberships ?? []).map((member) => member.user_id)));
  if (!memberIds.length) {
    return teams.map((team) => ({
      id: team.id,
      name: team.name,
      archived: Boolean(team.is_archived),
      candidates: [],
    }));
  }

  const [{ data: roles, error: rolesError }, { data: profiles, error: profilesError }] = await Promise.all([
    admin.from("user_roles").select("user_id").eq("role", "coach").in("user_id", memberIds),
    admin.from("profiles").select("id,full_name").in("id", memberIds),
  ]);
  if (rolesError) throw rolesError;
  if (profilesError) throw profilesError;

  const coachIds = new Set((roles ?? []).map((role) => role.user_id));
  const profileNames = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      typeof profile.full_name === "string" && profile.full_name.trim()
        ? profile.full_name.trim()
        : "Co-Coach",
    ]),
  );

  return teams.map((team) => ({
    id: team.id,
    name: team.name,
    archived: Boolean(team.is_archived),
    candidates: (memberships ?? [])
      .filter((membership) => membership.team_id === team.id && coachIds.has(membership.user_id))
      .map((membership) => ({
        userId: membership.user_id,
        fullName: profileNames.get(membership.user_id) ?? "Co-Coach",
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "de")),
  }));
};

const getProgramInstanceIds = async (admin: SupabaseClient, userId: string) => {
  const { data, error } = await admin
    .from("program_instances")
    .select("id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((instance) => instance.id);
};

const validateTransfers = (ownedTeams: OwnedTeam[], transfers: unknown): TransferPlan | null => {
  if (!transfers || typeof transfers !== "object" || Array.isArray(transfers)) {
    return ownedTeams.length === 0 ? {} : null;
  }

  const plan = transfers as TransferPlan;
  const validatedPlan: TransferPlan = {};
  for (const team of ownedTeams) {
    const successorId = plan[team.id];
    if (
      typeof successorId !== "string" ||
      !UUID_PATTERN.test(successorId) ||
      !team.candidates.some((candidate) => candidate.userId === successorId)
    ) {
      return null;
    }
    validatedPlan[team.id] = successorId;
  }
  return validatedPlan;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return response(405, { error: "method_not_allowed" });
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return response(401, { error: "unauthorized" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return response(503, { error: "service_unavailable" });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return response(401, { error: "unauthorized" });

  let body: RequestBody;
  let requestStored = false;
  const clearDeletionRequest = async () => {
    try {
      await admin.from("account_deletion_requests").delete().eq("user_id", user.id);
    } catch {
      // Best-effort cleanup only; the request expires after 15 minutes.
    }
  };

  try {
    body = await req.json() as RequestBody;
  } catch {
    return response(400, { error: "invalid_request" });
  }

  try {
    if (body.action === "inspect") {
      const [ownedTeams, programInstanceIds] = await Promise.all([
        getOwnedTeams(admin, user.id),
        getProgramInstanceIds(admin, user.id),
      ]);
      return response(200, { ownedTeams, programInstanceIds });
    }
    if (body.action !== "delete") {
      return response(400, { error: "invalid_action" });
    }
    if (!isRecentlyAuthenticated(token)) {
      return response(401, { error: "recent_auth_required" });
    }

    const ownedTeams = await getOwnedTeams(admin, user.id);
    const transferPlan = validateTransfers(ownedTeams, body.transfers);
    if (!transferPlan) {
      return response(409, { error: "team_transfer_required", ownedTeams });
    }

    const { error: requestError } = await admin
      .from("account_deletion_requests")
      .upsert(
        {
          user_id: user.id,
          transfer_plan: transferPlan,
          requested_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    if (requestError) throw requestError;
    requestStored = true;

    // Revoke refresh tokens on all devices before removing the Auth user.
    const { error: signOutError } = await admin.auth.admin.signOut(token, "global");
    if (signOutError) {
      await clearDeletionRequest();
      return response(500, { error: "account_deletion_failed" });
    }
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id, false);
    if (deleteError) {
      await clearDeletionRequest();
      return response(500, { error: "account_deletion_failed" });
    }

    return response(200, { deleted: true });
  } catch {
    if (requestStored) await clearDeletionRequest();
    return response(500, { error: "account_deletion_unavailable" });
  }
});
