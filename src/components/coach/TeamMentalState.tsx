import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Activity,
  AlertTriangle,
  Brain,
  Flame,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
  Users,
  Zap,
  Lock,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
} from "recharts";

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

const TeamMentalState = ({ teamId }: { teamId: string }) => {
  const { session } = useAuth();
  const [data, setData] = useState<TeamMentalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.access_token) return;
      setLoading(true);
      setError(null);

      try {
        const resp = await supabase.functions.invoke("team-mental-state", {
          body: { team_id: teamId },
        });

        if (resp.error) {
          setError("Daten konnten nicht geladen werden.");
          console.error(resp.error);
        } else {
          setData(resp.data);
        }
      } catch (e) {
        setError("Verbindungsfehler.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [teamId, session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
              Du siehst nur Aggregate (mind. {data.min_n ?? 5} Spieler). Keine Einzelwerte,
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
            Aktuell {data.teamSize} Athlet{data.teamSize === 1 ? "" : "en"} im Team —
            mindestens {data.min_n ?? 5} mit Daten erforderlich.
          </p>
        </div>
      </div>
    );
  }




  const getTrendIcon = (trend: TrendPoint[]) => {
    const valid = trend.filter((t) => t.value !== null);
    if (valid.length < 2) return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
    const last = valid[valid.length - 1].value!;
    const prev = valid[valid.length - 2].value!;
    if (last > prev) return <TrendingUp className="w-3.5 h-3.5 text-primary" />;
    if (last < prev) return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
    return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  const radarData = data.teamChemistry
    ? [
        { metric: "Growth Mindset", value: data.teamChemistry.growthMindset },
        { metric: "Präsenz", value: data.teamChemistry.presence },
        { metric: "Ego-Freiheit", value: data.teamChemistry.egoFreedom },
        { metric: "Emotionskontrolle", value: data.teamChemistry.emotionalControl },
      ]
    : null;

  // Combined trend for heatmap-style area chart
  const combinedTrend = data.energy.trend.map((e, i) => ({
    week: e.week,
    energy: e.value ?? 0,
    mood: data.mood.trend[i]?.value ?? 0,
    focus: data.focus.trend[i]?.value ?? 0,
  }));

  return (
    <div className="space-y-4">
      {/* Stress Warning */}
      {data.stressWarning && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex items-start gap-3 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">Erhöhtes Stresslevel</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Durchschnittliche Stimmung oder Energie liegt unter dem kritischen Schwellenwert.
            </p>
          </div>
        </div>
      )}

      {/* ─── Team Pulse — Heutige aggregierte Werte ─── */}
      {data.wellbeing && (
        <div className="bg-card border border-primary/20 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Team Pulse — heute
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Aggregierte Teamdaten · keine Einzelwerte
              </p>
            </div>
            {typeof data.readiness_index === "number" && (
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Team-Bereitschaft</p>
                <p className="text-2xl font-bold text-primary">{data.readiness_index}<span className="text-xs text-muted-foreground">/100</span></p>
              </div>
            )}
          </div>

          {!data.wellbeing.today.sufficient_data ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Zu wenig Daten für anonymisierte Auswertung. ({data.wellbeing.today.n_users}/{data.min_n ?? 5})
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { k: "mood", label: "Stimmung" },
                { k: "energy", label: "Energie" },
                { k: "focus", label: "Fokus" },
                { k: "stress", label: "Stress" },
                { k: "recovery", label: "Erholung" },
                { k: "sleep_quality", label: "Schlaf" },
                { k: "physical_readiness", label: "Körperl. Bereit." },
                { k: "motivation", label: "Motivation" },
                { k: "pressure", label: "Druck" },
                { k: "team_connection", label: "Teamverb." },
              ].map(({ k, label }) => {
                const v = (data.wellbeing!.today as any)[k] as number | null;
                return (
                  <div key={k} className="bg-secondary/30 rounded-xl px-3 py-2">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="text-base font-semibold text-foreground">
                      {typeof v === "number" ? v.toFixed(1) : "—"}
                      {typeof v === "number" && <span className="text-[10px] text-muted-foreground font-normal">/10</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground italic">
            Interner Team-Pulse-Wert aus aggregierten Check-in-Daten. Keine Diagnose. Keine Kausalaussage.
          </p>
        </div>
      )}

      {/* ─── Coach-Hinweise (deterministisch, aggregiert) ─── */}
      {data.coach_hints && data.coach_hints.length > 0 && (
        <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Heutige Hinweise (aggregiert)
          </h3>
          <ul className="space-y-2">
            {data.coach_hints.map((h, i) => (
              <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── 14-Tage Wellbeing Trend ─── */}
      {data.wellbeing && data.wellbeing.daily_trends.some((d) => d.sufficient_data) && (
        <div className="bg-card border border-border/50 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            14-Tage Trend (Stimmung · Energie · Stress · Erholung)
          </h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.wellbeing.daily_trends.map((d) => ({
                date: d.date?.slice(5) ?? "",
                mood: d.sufficient_data ? d.mood : null,
                energy: d.sufficient_data ? d.energy : null,
                stress: d.sufficient_data ? d.stress : null,
                recovery: d.sufficient_data ? d.recovery : null,
              }))}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(220 10% 55%)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 9, fill: "hsl(220 10% 55%)" }} axisLine={false} tickLine={false} width={22} />
                <Tooltip contentStyle={{ background: "hsl(220 18% 10%)", border: "1px solid hsl(220 14% 18%)", borderRadius: "12px", fontSize: "12px", color: "hsl(0 0% 95%)" }} />
                <Line type="monotone" dataKey="mood" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={false} name="Stimmung" connectNulls />
                <Line type="monotone" dataKey="energy" stroke="hsl(48, 96%, 53%)" strokeWidth={2} dot={false} name="Energie" connectNulls />
                <Line type="monotone" dataKey="stress" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={false} name="Stress" connectNulls />
                <Line type="monotone" dataKey="recovery" stroke="hsl(160, 84%, 39%)" strokeWidth={2} dot={false} name="Erholung" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-blue-400" /> Stimmung</span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Energie</span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-red-500" /> Stress</span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-primary" /> Erholung</span>
          </div>
        </div>
      )}


      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={<Zap className="w-4 h-4" />}
          label="Energie"
          value={data.energy.current}
          max={10}
          trend={getTrendIcon(data.energy.trend)}
          color="text-yellow-400"
        />
        <MetricCard
          icon={<Brain className="w-4 h-4" />}
          label="Stimmung"
          value={data.mood.current}
          max={10}
          trend={getTrendIcon(data.mood.trend)}
          color="text-blue-400"
        />
        <MetricCard
          icon={<Activity className="w-4 h-4" />}
          label="Fokus"
          value={data.focus.current}
          max={10}
          trend={getTrendIcon(data.focus.trend)}
          color="text-purple-400"
        />
        <MetricCard
          icon={<Flame className="w-4 h-4" />}
          label="Umsetzungsrate"
          value={data.resilience.current}
          max={100}
          suffix="%"
          trend={
            data.resilience.trend.length >= 2 ? (
              (() => {
                const valid = data.resilience.trend.filter((t) => t.score !== null);
                if (valid.length < 2) return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
                const last = valid[valid.length - 1].score!;
                const prev = valid[valid.length - 2].score!;
                if (last > prev) return <TrendingUp className="w-3.5 h-3.5 text-primary" />;
                if (last < prev) return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
                return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
              })()
            ) : <Minus className="w-3.5 h-3.5 text-muted-foreground" />
          }
          color="text-orange-400"
        />
      </div>

      {/* Participation Badge */}
      <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm text-muted-foreground">Teilnahme (7 Tage)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-foreground">{data.participation.rate}%</span>
          <span className="text-xs text-muted-foreground">({data.participation.total}/{data.teamSize})</span>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-card border border-border/50 rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          4-Wochen-Trend
        </h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={combinedTrend}>
              <defs>
                <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(48, 96%, 53%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(48, 96%, 53%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(271, 91%, 65%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(271, 91%, 65%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10, fill: "hsl(220 10% 55%)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 10]}
                tick={{ fontSize: 10, fill: "hsl(220 10% 55%)" }}
                axisLine={false}
                tickLine={false}
                width={24}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(220 18% 10%)",
                  border: "1px solid hsl(220 14% 18%)",
                  borderRadius: "12px",
                  fontSize: "12px",
                  color: "hsl(0 0% 95%)",
                }}
              />
              <Area type="monotone" dataKey="energy" stroke="hsl(48, 96%, 53%)" fill="url(#energyGrad)" strokeWidth={2} name="Energie" />
              <Area type="monotone" dataKey="mood" stroke="hsl(217, 91%, 60%)" fill="url(#moodGrad)" strokeWidth={2} name="Stimmung" />
              <Area type="monotone" dataKey="focus" stroke="hsl(271, 91%, 65%)" fill="url(#focusGrad)" strokeWidth={2} name="Fokus" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-4 mt-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-yellow-400" /> Energie
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-blue-400" /> Stimmung
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-purple-400" /> Fokus
          </span>
        </div>
      </div>

      {/* Team Chemistry Radar */}
      {radarData && (
        <div className="bg-card border border-border/50 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Team-Profil (Inner Excellence)
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="hsl(220 14% 18%)" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fontSize: 10, fill: "hsl(220 10% 55%)" }}
                />
                <PolarRadiusAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fill: "hsl(220 10% 55%)" }}
                  axisLine={false}
                />
                <Radar
                  dataKey="value"
                  stroke="hsl(160 84% 39%)"
                  fill="hsl(160 84% 39%)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Deterministic Team Summary */}
      {data.vibe && (
        <div className="bg-card border border-primary/20 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Team-Zusammenfassung
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {data.vibe}
          </p>
          <p className="text-xs text-muted-foreground/50 mt-3">
            Deterministische Auswertung. Basierend auf aggregierten Team-Pulse-Werten der letzten 7 Tage.
          </p>
        </div>
      )}

      {/* Resilience Trend */}
      <div className="bg-card border border-border/50 rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          aMCC-Resilienz Trend
        </h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data.resilience.trend.map((t) => ({
                week: t.week,
                score: t.score ?? 0,
              }))}
            >
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10, fill: "hsl(220 10% 55%)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "hsl(220 10% 55%)" }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(220 18% 10%)",
                  border: "1px solid hsl(220 14% 18%)",
                  borderRadius: "12px",
                  fontSize: "12px",
                  color: "hsl(0 0% 95%)",
                }}
                formatter={(value: number) => [`${value}%`, "Abschlussrate"]}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(25, 95%, 53%)"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(25, 95%, 53%)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Sub-component for metric cards
const MetricCard = ({
  icon,
  label,
  value,
  max,
  trend,
  color,
  suffix = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  max: number;
  trend: React.ReactNode;
  color: string;
  suffix?: string;
}) => {
  const hasValue = typeof value === "number";
  const percentage = hasValue && max > 0 ? (value! / max) * 100 : 0;
  const barColor =
    percentage >= 70 ? "bg-primary" : percentage >= 40 ? "bg-yellow-500" : "bg-destructive";

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className={color}>{icon}</span>
        {trend}
      </div>
      <p className="text-xl font-bold text-foreground">
        {hasValue ? value : <span className="text-muted-foreground">—</span>}
        {hasValue && (suffix || <span className="text-xs text-muted-foreground font-normal">/{max}</span>)}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      <div className="w-full h-1 bg-secondary/50 rounded-full mt-2">
        <div
          className={`h-1 rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

export default TeamMentalState;
