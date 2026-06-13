import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Compass,
  Flame,
  Lock,
  Minus,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { getCurrentProgramDay } from "@/lib/getCurrentProgramDay";
import { resolveDay } from "@/lib/getDayContent";
import { captureAppError } from "@/lib/monitoring";

interface TrendPoint {
  week: string;
  value: number | null;
  n_users?: number;
  sufficient_data?: boolean;
}

interface WellbeingDay {
  date?: string;
  n_users: number;
  sufficient_data: boolean;
  mood: number | null;
  energy: number | null;
  focus: number | null;
  stress: number | null;
  recovery: number | null;
  sleep_quality: number | null;
  physical_readiness: number | null;
  motivation: number | null;
  pressure: number | null;
  team_connection: number | null;
  readiness_index: number | null;
}

interface TeamMentalData {
  insufficient_data?: boolean;
  insufficient_reason?: string;
  min_n?: number;
  energy: { current: number | null; trend: TrendPoint[] };
  mood: { current: number | null; trend: TrendPoint[] };
  focus: { current: number | null; trend: TrendPoint[] };
  resilience: { current: number | null; trend: { week: string; score: number | null; n_users?: number; sufficient_data?: boolean }[] };
  participation: { rate: number; total: number };
  stressWarning: boolean;
  teamSize: number;
  teamChemistry: {
    growthMindset: number;
    presence: number;
    egoFreedom: number;
    emotionalControl: number;
  } | null;
  vibe: string | null;
  wellbeing?: {
    today: WellbeingDay;
    daily_trends: WellbeingDay[];
    weekly_trends: (WellbeingDay & { week: string })[];
  };
  readiness_index?: number | null;
  coach_hints?: string[];
}

interface TeamRow {
  id: string;
  name: string;
  program_start_date: string | null;
}

type WellbeingKey =
  | "mood"
  | "energy"
  | "focus"
  | "stress"
  | "recovery"
  | "sleep_quality"
  | "pressure"
  | "team_connection";

const valueLabel = (value: number | null | undefined) => {
  if (typeof value !== "number") return "nicht sichtbar";
  if (value >= 7) return "hoch";
  if (value >= 5) return "mittel";
  return "niedrig";
};

const pressureLabel = (value: number | null | undefined) => {
  if (typeof value !== "number") return "nicht sichtbar";
  if (value >= 7) return "erhöht";
  if (value >= 5) return "mittel";
  return "niedrig";
};

const formatDecimal = (value: number | null | undefined) =>
  typeof value === "number" ? value.toFixed(1).replace(".", ",") : "—";

const formatSigned = (value: number) => {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return "stabil";
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1).replace(".", ",")}`;
};

const getPreviousDailyValue = (days: WellbeingDay[] | undefined, key: WellbeingKey) => {
  const previous = (days ?? [])
    .filter((day) => day.sufficient_data && typeof day[key] === "number")
    .slice(0, -1)
    .at(-1);
  return previous ? (previous[key] as number) : null;
};

const getDailyDelta = (today: WellbeingDay | undefined, days: WellbeingDay[] | undefined, key: WellbeingKey) => {
  if (!today?.sufficient_data || typeof today[key] !== "number") return null;
  const previous = getPreviousDailyValue(days, key);
  if (typeof previous !== "number") return null;
  return (today[key] as number) - previous;
};

const getTrendDelta = (trend: TrendPoint[]) => {
  const valid = trend.filter((item) => item.sufficient_data !== false && typeof item.value === "number");
  if (valid.length < 2) return null;
  return valid[valid.length - 1].value! - valid[valid.length - 2].value!;
};

const getResilienceDelta = (trend: TeamMentalData["resilience"]["trend"]) => {
  const valid = trend.filter((item) => item.sufficient_data !== false && typeof item.score === "number");
  if (valid.length < 2) return null;
  return valid[valid.length - 1].score! - valid[valid.length - 2].score!;
};

const deltaTone = (delta: number | null, inverse = false) => {
  if (delta === null || Math.abs(delta) < 0.05) return "text-muted-foreground";
  const positive = inverse ? delta < 0 : delta > 0;
  return positive ? "text-primary" : "text-amber-400";
};

const compactHint = (text: string) => {
  if (/spannung/i.test(text) && /erholung/i.test(text)) return "Spannung erhöht, Erholung niedrig";
  if (/energie/i.test(text) && /niedrig/i.test(text)) return "Energie niedrig";
  if (/fokus/i.test(text) && /niedrig/i.test(text)) return "Fokus niedrig";
  if (/bewertungsdruck|druck/i.test(text) && /hoch/i.test(text)) return "Druck erhöht";
  if (/teamverbundenheit/i.test(text) && /niedrig/i.test(text)) return "Teamverbundenheit niedrig";
  if (/stabil/i.test(text)) return "Aggregierte Werte stabil";
  return text.split(".")[0]?.trim() || text;
};

const TeamMentalState = ({ teamId }: { teamId: string }) => {
  const { session } = useAuth();
  const [data, setData] = useState<TeamMentalData | null>(null);
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.access_token) return;
      setLoading(true);
      setError(null);

      try {
        const [resp, teamResp] = await Promise.all([
          supabase.functions.invoke("team-mental-state", {
            body: { team_id: teamId },
          }),
          supabase.from("teams").select("id, name, program_start_date").eq("id", teamId).maybeSingle(),
        ]);

        if (resp.error) {
          setError("Daten konnten nicht geladen werden.");
          void captureAppError({
            eventName: "coach_mental_state_load_failed",
            error: resp.error,
            role: "coach",
            route: "/coach",
            metadata: { source: "team-mental-state" },
          });
        } else {
          setData(resp.data);
          setTeam((teamResp.data as TeamRow | null) ?? null);
        }
      } catch (e) {
        setError("Verbindungsfehler.");
        void captureAppError({
          eventName: "coach_mental_state_load_failed",
          error: e,
          role: "coach",
          route: "/coach",
          metadata: { source: "team-mental-state" },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [teamId, session]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="mb-4 h-5 w-40 rounded-full bg-secondary/70" />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="h-24 animate-pulse rounded-xl bg-secondary/50" />
            <div className="h-24 animate-pulse rounded-xl bg-secondary/50" />
            <div className="h-24 animate-pulse rounded-xl bg-secondary/50" />
          </div>
        </div>
        <div className="h-48 animate-pulse rounded-2xl border border-border/50 bg-card" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">{error}</p>
      </div>
    );
  }

  if (!data || data.teamSize === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Keine Athleten im Team.</p>
      </div>
    );
  }

  if (data.insufficient_data) {
    return (
      <div className="space-y-4">
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
          <Lock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground mb-1">Aggregierte Teamdaten</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Du siehst nur Aggregate ab mindestens {data.min_n ?? 5} Athlet:innen. Keine Einzelwerte,
              keine Reflexionen, keine Journale.
            </p>
          </div>
        </div>
        <div className="text-center py-12">
          <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground text-sm font-medium mb-1">
            Zu wenig Daten für anonymisierte Auswertung.
          </p>
          <p className="text-muted-foreground text-xs">
            Aktuell {data.teamSize} Athlet{data.teamSize === 1 ? "" : "en"} im Team, mindestens {data.min_n ?? 5} mit Daten erforderlich.
          </p>
        </div>
      </div>
    );
  }

  const today = data.wellbeing?.today;
  const hasToday = Boolean(today?.sufficient_data);
  const minN = data.min_n ?? 5;
  const dayInfo = team?.program_start_date ? getCurrentProgramDay(team.program_start_date) : null;
  const resolvedToday = dayInfo ? resolveDay(dayInfo.dayNumber, new Date(), "training") : null;

  const dailyMetrics: Array<{
    key: WellbeingKey;
    label: string;
    value: number | null | undefined;
    inverse?: boolean;
    status: string;
  }> = [
    { key: "mood", label: "Stimmung", value: today?.mood, status: valueLabel(today?.mood) },
    { key: "energy", label: "Energie", value: today?.energy, status: valueLabel(today?.energy) },
    { key: "focus", label: "Fokus", value: today?.focus, status: valueLabel(today?.focus) },
    { key: "stress", label: "Stress", value: today?.stress, inverse: true, status: pressureLabel(today?.stress) },
    { key: "recovery", label: "Erholung", value: today?.recovery, status: valueLabel(today?.recovery) },
    { key: "pressure", label: "Druck", value: today?.pressure, inverse: true, status: pressureLabel(today?.pressure) },
    { key: "team_connection", label: "Teamverbundenheit", value: today?.team_connection, status: valueLabel(today?.team_connection) },
    { key: "sleep_quality", label: "Schlaf", value: today?.sleep_quality, status: valueLabel(today?.sleep_quality) },
  ];

  const weeklyMetrics = [
    {
      icon: <Zap className="w-4 h-4" />,
      label: "Energie",
      value: data.energy.current,
      suffix: "/10",
      delta: getTrendDelta(data.energy.trend),
    },
    {
      icon: <Brain className="w-4 h-4" />,
      label: "Stimmung",
      value: data.mood.current,
      suffix: "/10",
      delta: getTrendDelta(data.mood.trend),
    },
    {
      icon: <Activity className="w-4 h-4" />,
      label: "Fokus",
      value: data.focus.current,
      suffix: "/10",
      delta: getTrendDelta(data.focus.trend),
    },
    {
      icon: <Flame className="w-4 h-4" />,
      label: "Umsetzungsrate",
      value: data.resilience.current,
      suffix: "%",
      delta: getResilienceDelta(data.resilience.trend),
    },
  ];

  const teamProfile = data.teamChemistry
    ? [
        { label: "Growth Mindset", value: data.teamChemistry.growthMindset },
        { label: "Präsenz", value: data.teamChemistry.presence },
        { label: "Ego-Freiheit", value: data.teamChemistry.egoFreedom },
        { label: "Emotionskontrolle", value: data.teamChemistry.emotionalControl },
      ]
    : [];

  return (
    <div className="w-full min-w-0 space-y-4">
      {data.stressWarning && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Auffälliger Teamzustand</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Stimmung oder Energie liegen im aktuellen Wochenbild niedrig.
            </p>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-primary/20 bg-gradient-card p-5 shadow-card">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-primary/80">
              Teamzustand
            </p>
            <h2 className="font-heading text-2xl font-semibold leading-tight text-foreground">
              Heutiges Lagebild
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Aggregierte Check-in-Werte. Keine Einzelwerte, keine Reflexionen, keine Journale.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:min-w-[360px]">
            <StatusTile label="Teamgröße" value={data.teamSize} />
            <StatusTile label="Mindestgruppe" value={minN} />
            <StatusTile label="Heute n" value={today?.n_users ?? 0} muted={!hasToday} />
          </div>
        </div>
      </section>

      {!hasToday ? (
        <div className="rounded-2xl border border-border/50 bg-card p-6 text-center">
          <ShieldCheck className="mx-auto mb-3 h-9 w-9 text-primary" />
          <p className="text-sm font-medium text-foreground">Heute noch kein belastbares Tagesbild</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
            Für anonymisierte Teamwerte braucht es mindestens {minN} Check-ins. Aktuell sichtbar: {today?.n_users ?? 0}/{minN}.
          </p>
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 lg:grid-cols-4">
          {dailyMetrics.map((metric) => (
            <DailyMetricCard
              key={metric.key}
              label={metric.label}
              value={metric.value}
              status={metric.status}
              delta={getDailyDelta(today, data.wellbeing?.daily_trends, metric.key)}
              inverse={metric.inverse}
            />
          ))}
        </section>
      )}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <div className="mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Teilnahme</h3>
          </div>
          <div className="flex min-w-0 items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-semibold text-foreground">{data.participation.rate}%</p>
              <p className="mt-1 text-xs text-muted-foreground">aktive Athleten in 7 Tagen</p>
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {data.participation.total}/{data.teamSize}
            </p>
          </div>
        </div>

        {resolvedToday ? (
          <div className="rounded-2xl border border-border/50 bg-card p-4">
            <div className="mb-4 flex items-center gap-2">
              <Compass className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Heutige Programmlinse</h3>
            </div>
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-base font-semibold text-foreground">{resolvedToday.matrix.lens}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {resolvedToday.matrix.practiceFocus}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tag</p>
                <p className="text-xl font-semibold text-primary">{resolvedToday.matrix.dayNumber}/56</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Compass className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Heutige Programmlinse</h3>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Sobald das Teamprogramm läuft, erscheint hier der Tageskontext.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Wochenbild</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 lg:grid-cols-4">
          {weeklyMetrics.map((metric) => (
            <WeeklyMetricCard
              key={metric.label}
              icon={metric.icon}
              label={metric.label}
              value={metric.value}
              suffix={metric.suffix}
              delta={metric.delta}
            />
          ))}
        </div>
      </section>

      {teamProfile.length > 0 && (
        <section className="rounded-2xl border border-border/50 bg-card p-4">
          <div className="mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Team-Profil</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 lg:grid-cols-4">
            {teamProfile.map((item) => (
              <div key={item.label} className="rounded-xl border border-border/40 bg-secondary/25 p-3">
                <p className="text-[11px] text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {item.value}
                  <span className="text-xs font-normal text-muted-foreground">/100</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.coach_hints && data.coach_hints.length > 0 && (
        <section className="rounded-2xl border border-border/50 bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Beobachtungen</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.coach_hints.map((hint) => (
              <span
                key={hint}
                className="inline-flex items-center rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-xs font-medium text-secondary-foreground"
              >
                {compactHint(hint)}
              </span>
            ))}
          </div>
        </section>
      )}

      {data.vibe && (
        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Kurzbild</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {data.vibe}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-3">
            Deterministische Auswertung aus aggregierten Zahlen. Keine Diagnose.
          </p>
        </section>
      )}
    </div>
  );
};

const StatusTile = ({ label, value, muted = false }: { label: string; value: number; muted?: boolean }) => (
  <div className="rounded-xl border border-border/50 bg-background/35 px-3 py-2">
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={`mt-1 text-xl font-semibold ${muted ? "text-muted-foreground" : "text-foreground"}`}>{value}</p>
  </div>
);

const DailyMetricCard = ({
  label,
  value,
  status,
  delta,
  inverse = false,
}: {
  label: string;
  value: number | null | undefined;
  status: string;
  delta: number | null;
  inverse?: boolean;
}) => (
  <div className="rounded-2xl border border-border/50 bg-card p-4 premium-hairline">
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-primary/80">{status}</p>
      </div>
      <DeltaBadge delta={delta} inverse={inverse} />
    </div>
    <p className="text-3xl font-semibold tracking-normal text-foreground">
      {formatDecimal(value)}
      {typeof value === "number" && <span className="text-sm font-normal text-muted-foreground">/10</span>}
    </p>
  </div>
);

const WeeklyMetricCard = ({
  icon,
  label,
  value,
  suffix,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  suffix: string;
  delta: number | null;
}) => (
  <div className="rounded-xl border border-border/40 bg-secondary/25 p-3">
    <div className="mb-3 flex items-center justify-between gap-2">
      <span className="text-primary">{icon}</span>
      <DeltaBadge delta={delta} small />
    </div>
    <p className="text-2xl font-semibold text-foreground">
      {typeof value === "number" ? formatDecimal(value) : "—"}
      {typeof value === "number" && <span className="text-xs font-normal text-muted-foreground">{suffix}</span>}
    </p>
    <p className="mt-1 text-xs text-muted-foreground">{label}</p>
  </div>
);

const DeltaBadge = ({ delta, inverse = false, small = false }: { delta: number | null; inverse?: boolean; small?: boolean }) => {
  const stable = delta === null || Math.abs(delta) < 0.05;
  const Icon = stable ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg bg-secondary/50 px-2 py-1 ${small ? "text-[10px]" : "text-xs"} ${deltaTone(delta, inverse)}`}>
      <Icon className="h-3 w-3" />
      {delta === null ? "—" : formatSigned(delta)}
    </span>
  );
};

export default TeamMentalState;
