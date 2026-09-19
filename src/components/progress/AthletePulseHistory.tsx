import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronDown, Minus, TrendingDown, TrendingUp, Users } from "lucide-react";
import { Link } from "react-router-dom";
import {
  formatPulseDelta,
  formatPulseValue,
  getPulseDelta,
  groupPulseDaysByWeek,
  pulseMetricKeys,
  pulseMetricLabels,
  type PulseDay,
  type PulseMetricKey,
} from "@/lib/pulseHistory";

export interface AthleteTeamMomentum {
  available: boolean;
  team_size: number;
  checked_in_today: number;
  active_7d: number;
  today: string;
}

const headlineMetrics: PulseMetricKey[] = [
  "mood",
  "energy",
  "focus",
  "recovery",
  "motivation",
  "team_connection",
];

const Delta = ({ value }: { value: number | null }) => {
  const stable = value === null || Math.abs(value) < 0.05;
  const Icon = stable ? Minus : value > 0 ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-1 text-[9px] text-white/34">
      <Icon className="h-2.5 w-2.5" />
      {formatPulseDelta(value)}
    </span>
  );
};

const DayRow = ({ day, allDays }: { day: PulseDay; allDays: PulseDay[] }) => (
  <div className="border-t border-white/[0.055] px-4 py-4 first:border-t-0">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold capitalize text-white/82">
          {format(parseISO(day.date), "EEEE", { locale: de })}
        </p>
        <p className="mt-0.5 text-[10px] text-white/32">
          {format(parseISO(day.date), "dd. MMMM", { locale: de })}
        </p>
      </div>
      <p className="text-[9px] uppercase tracking-[0.12em] text-white/28">dein Check-in</p>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
      {headlineMetrics.map((key) => (
        <div key={key} className="min-w-0">
          <p className="truncate text-[9px] uppercase tracking-[0.1em] text-white/32">
            {pulseMetricLabels[key]}
          </p>
          <div className="mt-1 flex items-end justify-between gap-2">
            <p className="text-lg font-semibold leading-none text-white/88">
              {formatPulseValue(day.values[key])}
            </p>
            <Delta value={getPulseDelta(allDays, day, key)} />
          </div>
        </div>
      ))}
    </div>
    <details className="group mt-4">
      <summary className="flex cursor-pointer list-none items-center gap-1 text-[10px] font-medium text-primary/80">
        Alle Werte
        <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {pulseMetricKeys
          .filter((key) => !headlineMetrics.includes(key))
          .map((key) => (
            <div key={key} className="rounded-xl border border-white/[0.055] bg-white/[0.02] px-3 py-2">
              <p className="text-[9px] text-white/34">{pulseMetricLabels[key]}</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white/78">{formatPulseValue(day.values[key])}</p>
                <Delta value={getPulseDelta(allDays, day, key)} />
              </div>
            </div>
          ))}
      </div>
    </details>
  </div>
);

export const AthleteTeamMomentumCard = ({
  momentum,
  checkedInToday,
}: {
  momentum: AthleteTeamMomentum | null;
  checkedInToday: boolean;
}) => {
  if (!momentum?.available || momentum.team_size < 5) return null;

  const percent = Math.round((momentum.checked_in_today / momentum.team_size) * 100);
  return (
    <section className="mt-8 overflow-hidden rounded-[24px] border border-primary/20 bg-primary/[0.055] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Gemeinsam dran</p>
          <h2 className="mt-3 text-xl font-semibold tracking-[-0.025em]">Dein Team ist heute in Bewegung.</h2>
        </div>
        <Users className="h-5 w-5 shrink-0 text-primary" />
      </div>
      <p className="mt-4 text-sm leading-6 text-white/55">
        {momentum.checked_in_today} von {momentum.team_size} Spielern haben heute bereits eingecheckt.
        In den letzten sieben Tagen waren {momentum.active_7d} dabei.
      </p>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]" aria-label={`${percent} Prozent des Teams heute aktiv`}>
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
      </div>
      {!checkedInToday && (
        <Link
          to="/dashboard"
          className="mt-5 inline-flex min-h-11 items-center rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          Deinen Check-in machen
        </Link>
      )}
      <p className="mt-4 text-[10px] leading-4 text-white/30">
        Es werden nur Mannschaftszahlen angezeigt – niemals Namen oder Werte einzelner Spieler.
      </p>
    </section>
  );
};

export const AthletePulseHistory = ({ days }: { days: PulseDay[] }) => {
  const weeks = groupPulseDaysByWeek(days);
  if (weeks.length === 0) {
    return (
      <section className="mt-8 rounded-[24px] border border-white/[0.065] bg-white/[0.025] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Dein Check-in-Verlauf</p>
        <p className="mt-3 text-sm leading-6 text-white/48">
          Nach deinem ersten Check-in erscheinen hier deine eigenen Werte und ihre Veränderung.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8" aria-labelledby="own-pulse-history-title">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Nur für dich</p>
      <h2 id="own-pulse-history-title" className="mt-3 text-xl font-semibold tracking-[-0.025em]">
        Dein Check-in-Verlauf
      </h2>
      <p className="mt-2 text-xs leading-5 text-white/42">
        Deine Werte über Tage und Wochen. Die kleinen Veränderungen beziehen sich jeweils auf deinen vorherigen Check-in.
      </p>
      <div className="mt-4 space-y-3">
        {weeks.map((week, index) => (
          <details
            key={week.key}
            open={index === 0}
            className="group overflow-hidden rounded-[22px] border border-white/[0.065] bg-white/[0.025]"
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white/82">{week.label}</p>
                <p className="mt-0.5 text-[10px] text-white/32">
                  {week.days.length} {week.days.length === 1 ? "Check-in" : "Check-ins"}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-white/36 transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-white/[0.055]">
              {week.days.map((day) => <DayRow key={day.date} day={day} allDays={days} />)}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
};
