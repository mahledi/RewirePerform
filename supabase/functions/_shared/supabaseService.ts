import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.99.3";

const requiredEnv = (key: string) => {
  const value = Deno.env.get(key)?.trim();
  if (!value) throw new Error("service_not_configured");
  return value;
};

const serviceKey = () => {
  const namedKeys = Deno.env.get("SUPABASE_SECRET_KEYS")?.trim();
  if (namedKeys) {
    try {
      const parsed = JSON.parse(namedKeys) as Record<string, unknown>;
      const key = parsed.mahleos ?? parsed.default;
      if (typeof key === "string" && key.trim()) return key.trim();
    } catch {
      throw new Error("service_not_configured");
    }
  }
  return requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
};

export const serviceClient = (): SupabaseClient =>
  createClient(requiredEnv("SUPABASE_URL"), serviceKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
