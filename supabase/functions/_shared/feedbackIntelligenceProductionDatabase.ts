import postgres from "npm:postgres@3.4.7";

const PRODUCTION_PROJECT_REF = "bqsbxesmybthwtxmowfz";
const PRODUCTION_READER_ROLE = "mahleos_feedback_production_reader";
let client: ReturnType<typeof postgres> | null = null;

const requiredProductionReaderUrl = () => {
  const raw = Deno.env.get("MAHLEOS_FEEDBACK_PRODUCTION_READER_DATABASE_URL")?.trim() ?? "";
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("service_not_configured");
  }

  const username = decodeURIComponent(parsed.username);
  const directHost = `db.${PRODUCTION_PROJECT_REF}.supabase.co`;
  const directReader = parsed.hostname === directHost && username === PRODUCTION_READER_ROLE;
  const pooledReader = parsed.hostname.endsWith(".pooler.supabase.com")
    && username === `${PRODUCTION_READER_ROLE}.${PRODUCTION_PROJECT_REF}`;
  if (
    (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:")
    || !parsed.password
    || parsed.pathname !== "/postgres"
    || !["5432", "6543"].includes(parsed.port || "5432")
    || (!directReader && !pooledReader)
  ) {
    throw new Error("service_not_configured");
  }
  return raw;
};

export const feedbackIntelligenceProductionSql = () => {
  if (!client) {
    client = postgres(requiredProductionReaderUrl(), {
      max: 1,
      prepare: false,
      ssl: "require",
      connect_timeout: 3,
      idle_timeout: 5,
      max_lifetime: 60,
      onnotice: () => undefined,
    });
  }
  return client;
};
