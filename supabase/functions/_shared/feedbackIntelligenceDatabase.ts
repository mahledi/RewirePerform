import postgres from "npm:postgres@3.4.7";

const STAGING_PROJECT_REF = "zbeswjipayspgvcipzmx";
const READER_ROLE = "mahleos_feedback_reader";
let client: ReturnType<typeof postgres> | null = null;

const requiredReaderUrl = () => {
  const raw = Deno.env.get("MAHLEOS_FEEDBACK_READER_DATABASE_URL")?.trim() ?? "";
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("service_not_configured");
  }

  const username = decodeURIComponent(parsed.username);
  const directHost = `db.${STAGING_PROJECT_REF}.supabase.co`;
  const directReader = parsed.hostname === directHost && username === READER_ROLE;
  const pooledReader = parsed.hostname.endsWith(".pooler.supabase.com")
    && username === `${READER_ROLE}.${STAGING_PROJECT_REF}`;
  if (
    (
      parsed.protocol !== "postgresql:"
      && parsed.protocol !== "postgres:"
    )
    || !parsed.password
    || parsed.pathname !== "/postgres"
    || !["5432", "6543"].includes(parsed.port || "5432")
    || (!directReader && !pooledReader)
  ) {
    throw new Error("service_not_configured");
  }
  return raw;
};

export const feedbackIntelligenceSql = () => {
  if (!client) {
    client = postgres(requiredReaderUrl(), {
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
