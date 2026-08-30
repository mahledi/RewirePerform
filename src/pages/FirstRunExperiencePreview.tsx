import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Brain,
  BookOpen,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Dumbbell,
  Flame,
  Home,
  Menu,
  Mic,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";
import { BrandLockup, BrandSymbol } from "@/components/brand/BrandLogo";
import { useFirstRunCameraFit } from "@/lib/firstRunCameraFit";
import { cn } from "@/lib/utils";

type PreviewSection = "today" | "plan" | "progress" | "more";
export type FirstRunMode = "solo" | "team";

type FirstRunExperiencePreviewProps = {
  onComplete?: (mode: FirstRunMode) => void;
  onLogin?: () => void;
  onClose?: () => void;
  completionLabel?: string;
  replay?: boolean;
  postSignup?: boolean;
  initialMode?: FirstRunMode;
  fitCameraToViewport?: boolean;
};

export type AthleteFirstRunSceneId =
  | "today"
  | "science"
  | "tasks"
  | "check"
  | "anchor"
  | "journal"
  | "development"
  | "measurement"
  | "team"
  | "start";

type Scene = {
  id: AthleteFirstRunSceneId;
  eyebrow: string;
  title: string;
  position: { x: number; y: number; scale: number };
};

const scenes: Scene[] = [
  {
    id: "today",
    eyebrow: "Dein System für heute",
    title: "Du siehst sofort, was ansteht.",
    position: { x: 0, y: 0, scale: 0.92 },
  },
  {
    id: "science",
    eyebrow: "Daily Flow · 1 von 5",
    title: "Zuerst verstehst du den Fokus des Tages.",
    position: { x: 500, y: -60, scale: 0.96 },
  },
  {
    id: "tasks",
    eyebrow: "Daily Flow · 4 von 5",
    title: "Eine klare Mission bringt ihn in deinen Alltag.",
    position: { x: 900, y: -420, scale: 0.96 },
  },
  {
    id: "check",
    eyebrow: "Daily Flow · 5 von 5",
    title: "Ein kurzer Check festigt, was du heute brauchst.",
    position: { x: 650, y: -950, scale: 0.96 },
  },
  {
    id: "anchor",
    eyebrow: "Vor deiner Einheit",
    title: "Vor dem Training siehst du denselben Fokus wieder.",
    position: { x: 100, y: -1120, scale: 0.96 },
  },
  {
    id: "journal",
    eyebrow: "Nach deinem Tag",
    title: "Am Abend reflektierst du den echten Tag.",
    position: { x: -500, y: -1050, scale: 0.96 },
  },
  {
    id: "development",
    eyebrow: "Deine Entwicklung",
    title: "Du siehst deine Wiederholungen, nicht eine Bewertung.",
    position: { x: -980, y: -620, scale: 0.94 },
  },
  {
    id: "measurement",
    eyebrow: "Messung über 56 Tage",
    title: "Viele Signale. Ein gemeinsamer Verlauf.",
    position: { x: -1320, y: -280, scale: 0.96 },
  },
  {
    id: "team",
    eyebrow: "Solo oder im Team",
    title: "Der gleiche klare Ablauf – passend zu deinem Alltag.",
    position: { x: -1000, y: 0, scale: 0.96 },
  },
  {
    id: "start",
    eyebrow: "Bereit",
    title: "Dein Weg beginnt mit dem ersten Tag.",
    position: { x: -520, y: 560, scale: 0.92 },
  },
];

const worldScreens = [
  { id: "today", x: 0, y: 0 },
  { id: "science", x: 500, y: -60 },
  { id: "tasks", x: 900, y: -420 },
  { id: "check", x: 650, y: -950 },
  { id: "anchor", x: 100, y: -1120 },
  { id: "journal", x: -500, y: -1050 },
  { id: "development", x: -980, y: -620 },
  { id: "measurement", x: -1320, y: -280 },
  { id: "team", x: -1000, y: 0 },
  { id: "start", x: -520, y: 560 },
] as const;

const MiniTopBar = ({ actions = false }: { actions?: boolean }) => (
  <div className="flex h-12 items-center justify-between border-b border-white/[0.055] bg-[#0D0E12]/88 px-4">
    <BrandLockup symbolSize={20} textClassName="text-[10px] tracking-[-0.02em]" />
    {actions && (
      <div className="flex items-center gap-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-full text-white/48">
          <ClipboardCheck className="h-4 w-4" />
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.075] bg-white/[0.035] text-white/58">
          <Settings className="h-4 w-4" />
        </span>
      </div>
    )}
  </div>
);

const MiniBottomNav = ({ active }: { active: PreviewSection }) => {
  const items = [
    { id: "today", label: "Heute", icon: Home },
    { id: "plan", label: "Plan", icon: CalendarDays },
    { id: "progress", label: "Entwicklung", icon: BarChart3 },
    { id: "more", label: "Mehr", icon: Menu },
  ] as const;

  return (
    <div className="absolute inset-x-0 bottom-0 grid h-[58px] grid-cols-4 border-t border-white/[0.07] bg-[#0B0C10]/95 px-2 pb-1">
      {items.map((item) => {
        const Icon = item.icon;
        const selected = active === item.id;
        return (
          <div key={item.id} className="relative flex flex-col items-center justify-center gap-1">
            {selected && <span className="absolute top-0 h-0.5 w-5 rounded-full bg-primary" />}
            <Icon className={cn("h-4 w-4", selected ? "text-primary" : "text-white/35")} strokeWidth={1.8} />
            <span className={cn("text-[7px] font-medium", selected ? "text-primary" : "text-white/35")}>
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const AppScreen = ({
  children,
  active = "today",
  className,
  chrome = "app",
  headerActions = false,
  labelledBy,
}: {
  children: ReactNode;
  active?: PreviewSection;
  className?: string;
  chrome?: "app" | "none";
  headerActions?: boolean;
  labelledBy: string;
}) => (
  <section
    aria-labelledby={labelledBy}
    className={cn(
      "relative h-[610px] w-[344px] overflow-hidden rounded-[34px] border border-white/[0.09] bg-[#0D0E12] text-[#EEF0F2]",
      "shadow-[0_35px_100px_-36px_rgba(0,0,0,0.9),0_0_70px_-44px_rgba(46,173,137,0.7)]",
      className,
    )}
  >
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-6%,rgba(46,173,137,0.13),transparent_34%)]" />
    {chrome === "app" && <MiniTopBar actions={headerActions} />}
    <div className={cn("relative overflow-hidden", chrome === "app" ? "h-[500px]" : "h-full")}>{children}</div>
    {chrome === "app" && <MiniBottomNav active={active} />}
  </section>
);

const ProgramDayRingPreview = ({ day = 22 }: { day?: number }) => {
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (day / 56) * circumference;

  return (
    <div className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center">
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 76 76" aria-hidden="true">
        <circle cx="38" cy="38" r="28" fill="none" stroke="rgba(255,255,255,.065)" strokeWidth="3.5" />
        <circle
          cx="38"
          cy="38"
          r="28"
          fill="none"
          stroke="#2EAD89"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="text-center">
        <span className="block text-lg font-semibold leading-none">{day}</span>
        <span className="mt-1 block text-[9px] uppercase tracking-[0.12em] text-white/48">von 56</span>
      </div>
    </div>
  );
};

const DailyCompletionRingPreview = () => (
  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/[0.09]">
    <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="21" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="2" />
      <circle
        cx="24"
        cy="24"
        r="21"
        fill="none"
        stroke="#2EAD89"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={132}
        strokeDashoffset={132}
      />
    </svg>
    <span className="text-[11px] font-semibold">0/2</span>
  </div>
);

const DashboardActionRowPreview = ({
  icon: Icon,
  eyebrow,
  title,
  detail,
  last = false,
}: {
  icon: typeof Dumbbell;
  eyebrow: string;
  title: string;
  detail: string;
  last?: boolean;
}) => (
  <div className={cn("flex min-h-[64px] items-center gap-3 px-3 py-3", !last && "border-b border-white/[0.055]")}>
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-white/[0.045]">
      <Icon className="h-4 w-4 text-white/62" strokeWidth={1.7} />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-[7px] font-semibold uppercase tracking-[0.15em] text-white/48">{eyebrow}</span>
      <span className="mt-0.5 block text-[10px] font-semibold leading-4">{title}</span>
      <span className="mt-0.5 block truncate text-[8px] leading-3 text-white/52">{detail}</span>
    </span>
    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/25" />
  </div>
);

const TodayScreen = () => (
  <AppScreen labelledBy="preview-today-title" headerActions>
    <div className="px-5 pt-5">
      <section className="mb-5">
        <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-white/48">Dienstag, 29. Juli</p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 id="preview-today-title" className="text-[26px] font-semibold leading-none tracking-[-0.045em]">Hallo Noah.</h2>
            <p className="mt-2 text-[11px] text-white/58">Dein System ist bereit.</p>
          </div>
          <DailyCompletionRingPreview />
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[28px] border border-white/[0.075] bg-[linear-gradient(145deg,rgba(29,32,37,0.95),rgba(15,17,21,0.97))] p-4 shadow-[0_28px_70px_-42px_rgba(0,0,0,1),inset_0_1px_0_rgba(255,255,255,0.055)]">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary/[0.085] blur-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-primary">Tag 22</span>
              <span className="h-1 w-1 rounded-full bg-white/25" />
              <span className="text-[9px] font-medium uppercase tracking-[0.16em] text-white/48">Skills</span>
              <span className="h-1 w-1 rounded-full bg-white/25" />
              <span className="text-[9px] font-medium uppercase tracking-[0.16em] text-white/48">Training</span>
            </div>
            <p className="mt-3 max-w-[185px] text-[22px] font-semibold leading-[1.05] tracking-[-0.04em]">
              Nimm das vollständige Bild wieder auf
            </p>
          </div>
          <ProgramDayRingPreview />
        </div>
        <p className="relative mt-4 line-clamp-3 text-[10px] leading-4 text-white/58">
          Wenn ein Problem fast alles verdeckt, holst du das Funktionierende und deine Möglichkeiten wieder mit ins Bild.
        </p>
        <div className="relative mt-4 flex min-h-[58px] items-center justify-between rounded-2xl bg-primary px-3.5 py-3 text-left text-[#08110E] shadow-[0_14px_35px_-18px_rgba(46,173,137,0.7)]">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/10">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span>
              <span className="block text-[11px] font-semibold">Daily Flow starten</span>
              <span className="mt-0.5 block text-[8px] text-black/65">10 Tages-Puls-Fragen · eine Mission</span>
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-black/60" />
        </div>
        <div className="relative mt-4 h-1 overflow-hidden rounded-full bg-white/[0.055]">
          <div className="h-full w-[39%] rounded-full bg-primary" />
        </div>
      </section>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/52">Dein Tag</p>
        <span className="text-[9px] font-medium text-primary">Plan öffnen</span>
      </div>
      <div className="mt-2 overflow-hidden rounded-[18px] border border-white/[0.065] bg-white/[0.025]">
        <DashboardActionRowPreview
          icon={Dumbbell}
          eyebrow="Vor dem Training"
          title="Pre-Training"
          detail="Training · heutigen Fokus aktiv erinnern"
        />
        <DashboardActionRowPreview
          icon={BookOpen}
          eyebrow="Nach dem Tag"
          title="Tagesjournal"
          detail="Tagesfragen · privat"
        />
        <DashboardActionRowPreview
          icon={Calendar}
          eyebrow="Deine Planung"
          title="Wochenplan"
          detail="Training, Regeneration und Wettkämpfe"
          last
        />
      </div>
    </div>
  </AppScreen>
);

const FlowHeader = ({ title, step }: { title: string; step: number }) => (
  <>
    <div className="flex min-h-[64px] items-center gap-2 border-b border-white/[0.055] bg-[#0D0E12]/88 px-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/62">
        <ArrowLeft className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[7px] font-medium uppercase tracking-[0.16em] text-white/45">Daily Flow · Training</p>
        <p className="mt-0.5 truncate text-[11px] font-semibold tracking-[-0.015em]">{title}</p>
      </div>
      <div className="flex items-center gap-1.5 rounded-full border border-white/[0.065] bg-white/[0.035] px-2.5 py-2 text-[8px] text-white/52">
        <Dumbbell className="h-3 w-3 text-primary" />
        29. Juli
      </div>
    </div>
    <div className="border-b border-white/[0.045] bg-[#0D0E12]/88 px-4 py-2">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full",
              step > index ? "bg-primary" : step === index ? "bg-primary/55" : "bg-white/[0.065]",
            )}
          />
        ))}
        <span className="ml-1 text-[8px] tabular-nums text-white/42">{step + 1}/5</span>
      </div>
    </div>
  </>
);

const FlowScreen = ({
  title,
  step,
  labelledBy,
  children,
}: {
  title: string;
  step: number;
  labelledBy: string;
  children: ReactNode;
}) => (
  <AppScreen labelledBy={labelledBy} chrome="none">
    <FlowHeader title={title} step={step} />
    <div className="h-[500px] overflow-hidden px-5 py-5">{children}</div>
  </AppScreen>
);

const ScienceScreen = () => (
  <FlowScreen title="Science Bite" step={0} labelledBy="preview-science-title">
    <div className="rounded-2xl bg-gradient-card border-glow overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border/50 p-4">
        <div>
          <p className="mb-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-primary">Science Bite</p>
          <h2 id="preview-science-title" className="text-[19px] font-bold leading-tight">
            Nimm das vollständige Bild wieder auf
          </h2>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <Brain className="h-4 w-4 text-primary" />
        </span>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-[10px] leading-4 text-muted-foreground">
          Ein enger Blick ist nicht automatisch falsch – nur unvollständig.
        </p>
        <p className="text-[10px] leading-4 text-muted-foreground">
          Unter Belastung kann ein Problem fast deine gesamte Aufmerksamkeit einnehmen. Andere reale Informationen verschwinden dadurch aus deinem Arbeitsbild.
        </p>
        <p className="text-[10px] leading-4 text-muted-foreground">
          Den Blick zu öffnen heißt nicht, positiv zu denken. Es heißt, mehr von der tatsächlichen Situation wahrzunehmen.
        </p>
      </div>
    </div>
    <div className="mt-3 rounded-2xl border border-border/50 bg-primary/10 p-4">
      <div className="flex items-start gap-3">
        <Dumbbell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-primary">Heute als Training</p>
          <p className="mt-1 text-[10px] leading-4 text-foreground">
            Wenn ein Problem fast alles verdeckt, holst du das Funktionierende und deine Möglichkeiten wieder mit ins Bild.
          </p>
        </div>
      </div>
    </div>
    <div className="mt-3 flex h-11 items-center justify-center rounded-xl bg-primary text-[10px] font-semibold text-primary-foreground">
      Verstanden <ArrowRight className="ml-2 h-3.5 w-3.5" />
    </div>
  </FlowScreen>
);

const TasksScreen = () => (
  <FlowScreen title="Deine Mission" step={3} labelledBy="preview-tasks-title">
    <h2 id="preview-tasks-title" className="text-[20px] font-bold">Heute im Fokus</h2>
    <p className="mt-1 text-[9px] text-muted-foreground">Tag 22 · Nimm das vollständige Bild wieder auf</p>
    <p className="mt-3 text-[9px] leading-4 text-muted-foreground">
      Eine Mission. Die Schritte gehören zusammen und führen dich zu einer Handlung.
    </p>
    <div className="mt-4 rounded-2xl border border-border/50 bg-gradient-card p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Target className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[10px] font-semibold">Drei Teile ins Bild holen</p>
          <p className="mt-1 text-[8px] leading-3 text-muted-foreground">Wenn ein Problem fast die ganze Situation bestimmt.</p>
        </div>
      </div>
      <div className="mt-4 space-y-2.5">
        {[
          "Benenne das reale Problem.",
          "Frag: Was funktioniert oder ist außerdem möglich?",
          "Wähle aus dem ganzen Bild deine nächste Handlung.",
        ].map((step, index) => {
        return (
          <div key={step} className="flex items-center gap-3 rounded-xl bg-secondary/35 px-3 py-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[8px] font-semibold text-primary">
              {index + 1}
            </span>
            <p className="text-[9px] leading-3.5 text-foreground">{step}</p>
          </div>
        );
      })}
      </div>
    </div>
  </FlowScreen>
);

const CheckScreen = () => (
  <FlowScreen title="Verständnis-Check" step={4} labelledBy="preview-check-title">
    <h2 id="preview-check-title" className="text-[20px] font-bold">Kurzer Verständnis-Check</h2>
    <p className="mt-2 text-[9px] leading-4 text-muted-foreground">
      Eine kurze Frage zum heutigen Fokus. Kein Test — nur Festigung.
    </p>
    <div className="mt-5">
      <p className="text-[11px] font-semibold leading-4">Was ist heute ausdrücklich nicht das Ziel?</p>
      <div className="mt-4 space-y-2">
        {[
          "Das Problem durch positives Denken wegzureden.",
          "Weitere reale Informationen wahrzunehmen.",
          "Möglichkeiten und Unterstützung mit ins Bild zu nehmen.",
        ].map((answer, index) => (
          <div
            key={answer}
            className={cn(
              "rounded-xl border px-3 py-3 text-[9px] leading-4",
              index === 0
                ? "border-primary/35 bg-primary/10 text-foreground"
                : "border-border/50 bg-secondary/25 text-muted-foreground",
            )}
          >
            <span className="mr-2 font-semibold">{String.fromCharCode(65 + index)}.</span>{answer}
          </div>
        ))}
      </div>
    </div>
  </FlowScreen>
);

const ScreenHeaderPreview = ({
  title,
  eyebrow,
  trailing,
}: {
  title: string;
  eyebrow: string;
  trailing?: ReactNode;
}) => (
  <div className="flex min-h-[64px] items-center gap-2 border-b border-white/[0.055] bg-[#0D0E12]/88 px-3">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/62">
      <ArrowLeft className="h-4 w-4" />
    </span>
    <div className="min-w-0 flex-1">
      <p className="truncate text-[7px] font-medium uppercase tracking-[0.16em] text-white/45">{eyebrow}</p>
      <p className="mt-0.5 truncate text-[11px] font-semibold tracking-[-0.015em]">{title}</p>
    </div>
    {trailing}
  </div>
);

const AnchorScreen = () => (
  <AppScreen labelledBy="preview-anchor-title" chrome="none">
    <ScreenHeaderPreview title="Pre-Training" eyebrow="Vor deiner Einheit" />
    <div className="h-[546px] overflow-hidden px-5 py-6">
      <div>
        <p className="mb-3 text-[8px] font-semibold uppercase tracking-[0.18em] text-primary">Pre-Training</p>
        <h2 id="preview-anchor-title" className="text-[24px] font-bold leading-tight tracking-[-0.035em]">
          Bereit für die nächste Einheit
        </h2>
        <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
          Kurz sortieren, klare Linse setzen, dann raus in die Arbeit.
        </p>
      </div>

      <div className="mt-5 rounded-[24px] border border-white/[0.065] bg-white/[0.025] p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
          <p className="text-[8px] uppercase tracking-[0.14em] text-muted-foreground">Heutiger Fokus</p>
          <p className="mt-1 text-[11px] font-semibold">Nimm das vollständige Bild wieder auf</p>
          <p className="mt-1 text-[9px] leading-4 text-muted-foreground">
            Ein Problem ist real. Es ist aber selten die ganze Situation.
          </p>
          <p className="mt-3 text-[8px] leading-3.5 text-muted-foreground">
            Nenne mindestens eine weitere reale Information und handle dann aus dem ganzen Bild.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {[
          ["1", "Erinnere dich aktiv", "Welche Frage öffnet deinen Blick, wenn ein Problem alles andere verdeckt?"],
          ["2", "Prüfe deine Erinnerung", "Danach siehst du den heutigen Satz noch einmal klar und groß."],
          ["3", "Nimm ihn mit", "Nutze das vollständige Bild in deiner nächsten Handlung."],
        ].map(([number, title, copy]) => (
          <div key={title} className="flex gap-3 rounded-[20px] border border-white/[0.065] bg-white/[0.025] p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-semibold text-primary">
              {number}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold leading-tight">{title}</p>
              <p className="mt-1 line-clamp-2 text-[8px] leading-3 text-muted-foreground">{copy}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex h-11 items-center justify-center rounded-xl bg-primary text-[10px] font-semibold text-primary-foreground">
        <Target className="mr-2 h-3.5 w-3.5" />
        Bereit fürs Training
      </div>
    </div>
  </AppScreen>
);

const JournalScreen = () => (
  <AppScreen labelledBy="preview-journal-title" chrome="none">
    <ScreenHeaderPreview
      title="Was war außerdem Teil der Situation?"
      eyebrow="Tag 22 · Training · 29. Juli"
      trailing={(
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Dumbbell className="h-3.5 w-3.5" />
        </span>
      )}
    />
    <div className="h-[546px] overflow-hidden px-5 py-5">
      <div className="rounded-2xl bg-gradient-card border-glow p-4">
        <p className="mb-2 text-[8px] uppercase tracking-widest text-primary">Heute im Fokus</p>
        <h2 id="preview-journal-title" className="text-[11px] font-semibold leading-snug">
          Nimm das vollständige Bild wieder auf
        </h2>
        <p className="mt-2 text-[9px] leading-4 text-muted-foreground">
          Ein enger Blick ist nicht automatisch falsch – nur unvollständig.
        </p>
        <div className="mt-3 flex items-start gap-2 border-t border-border/50 pt-3">
          <Dumbbell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <p className="text-[8px] leading-3.5 text-muted-foreground">
            Schau auf eine konkrete Szene und hole das ganze Bild zurück.
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-secondary/25 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <BookOpen className="h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-[10px] font-semibold">Frühere Einträge ansehen</p>
            <p className="mt-0.5 text-[8px] text-muted-foreground">Privater Rückblick, nach Tagen geordnet.</p>
          </div>
        </div>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </div>

      <div className="mt-3 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Mic className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="text-[9px] font-medium">Sprich deine Antworten ein.</p>
          <p className="mt-1 text-[8px] leading-3 text-muted-foreground">
            Du kannst den übernommenen Text anschließend bearbeiten oder vollständig tippen.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {[
          ["Welches Problem hat deinen Blick eng gemacht?", "Benenne es, ohne es kleinzureden."],
          ["Was war außerdem real vorhanden?", "Etwas Funktionierendes, Unterstützung oder eine Möglichkeit."],
        ].map(([question, placeholder]) => (
          <div key={question}>
            <p className="text-[9px] font-medium leading-3.5">{question}</p>
            <div className="mt-2 h-12 rounded-xl border border-border/40 bg-secondary/40 px-3 py-2 text-[8px] text-muted-foreground">
              {placeholder}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[8px] text-primary">
              <Mic className="h-3 w-3" />
              Antwort einsprechen
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 text-[8px] text-white/35">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        Deine Journalantworten bleiben privat.
      </div>
    </div>
  </AppScreen>
);

const DevelopmentScreen = () => (
  <AppScreen labelledBy="preview-development-title" active="progress">
    <div className="px-5 pt-5">
      <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-primary">Tag 22 von 56</p>
      <h2 id="preview-development-title" className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.045em]">Deine Entwicklung.</h2>
      <p className="mt-3 text-[9px] leading-4 text-white/42">Nicht als Urteil. Als sichtbare Spur deiner Wiederholungen.</p>

      <div className="mt-5 rounded-[24px] border border-white/[0.075] bg-white/[0.028] p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[7px] font-semibold uppercase tracking-[0.16em] text-primary">Programmtreue</p>
            <p className="mt-2 text-[34px] font-semibold leading-none tracking-[-0.06em]">
              73<span className="text-[16px] text-white/35">%</span>
            </p>
            <p className="mt-1.5 text-[8px] text-white/36">16 von 22 Tagen</p>
          </div>
          <Flame className="h-5 w-5 text-primary" strokeWidth={1.6} />
        </div>
        <svg className="mt-5 h-[76px] w-full overflow-visible" viewBox="0 0 280 76" role="img" aria-label="Beispielhafte Programmtreue in der Vorschau">
          <defs>
            <linearGradient id="firstRunArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2EAD89" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#2EAD89" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,64 C35,60 48,45 82,49 C116,53 130,31 164,38 C198,44 218,17 280,20 L280,76 L0,76 Z" fill="url(#firstRunArea)" />
          <path d="M0,64 C35,60 48,45 82,49 C116,53 130,31 164,38 C198,44 218,17 280,20" fill="none" stroke="#2EAD89" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <div className="mt-1 flex justify-between text-[6px] uppercase tracking-[0.12em] text-white/24">
          <span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span><span>Mo</span><span>Di</span>
        </div>
      </div>

      <p className="mt-5 text-[8px] font-semibold uppercase tracking-[0.15em] text-white/40">Dein 56-Tage-Weg</p>
      <div className="mt-2 overflow-hidden rounded-[18px] border border-white/[0.065] bg-white/[0.025]">
        {[
          { name: "Fundament", range: "Tag 1–14", state: "done" },
          { name: "Skills", range: "Tag 15–28", state: "now" },
          { name: "Transfer", range: "Tag 29–42", state: "later" },
        ].map((phase, index) => (
          <div key={phase.name} className={cn("flex h-[48px] items-center gap-3 px-3", index < 2 && "border-b border-white/[0.05]")}>
            <span className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border text-[8px] font-semibold",
              phase.state === "done" && "border-primary bg-primary text-[#07110E]",
              phase.state === "now" && "border-primary/40 bg-primary/[0.08] text-primary",
              phase.state === "later" && "border-white/[0.08] text-white/28",
            )}>
              {phase.state === "done" ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <div className="flex-1">
              <p className={cn("text-[10px] font-medium", phase.state === "later" && "text-white/40")}>{phase.name}</p>
              <p className="mt-0.5 text-[7px] text-white/28">{phase.range}</p>
            </div>
            {phase.state === "now" && <span className="text-[7px] font-semibold uppercase tracking-[0.12em] text-primary">Jetzt</span>}
          </div>
        ))}
      </div>
    </div>
  </AppScreen>
);

const MeasurementScreen = () => (
  <AppScreen labelledBy="preview-measurement-title" chrome="none">
    <div className="flex h-[58px] items-center justify-between border-b border-border/50 bg-[#0D0E12]/88 px-4">
      <BrandLockup symbolSize={20} textClassName="text-[10px] tracking-[-0.02em]" />
      <span className="text-[8px] font-medium text-muted-foreground">56 Tage · mehrere Perspektiven</span>
    </div>
    <div className="h-[552px] overflow-hidden px-5 py-5">
      <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-primary">Dein Messsystem</p>
      <h2 id="preview-measurement-title" className="mt-2 text-[24px] font-bold leading-[1.05] tracking-[-0.04em]">
        Nicht ein Test. Ein Verlauf.
      </h2>
      <p className="mt-3 text-[9px] leading-4 text-muted-foreground">
        RewirePerform verbindet feste Messungen mit kurzen Signalen aus deinem echten Programmalltag.
      </p>

      <div className="mt-4 rounded-[20px] border border-white/[0.065] bg-white/[0.025] p-3.5">
        <div className="relative grid grid-cols-3">
          <span className="absolute left-[16.7%] right-[16.7%] top-4 h-px bg-gradient-to-r from-primary/45 via-primary/20 to-white/10" />
          {[
            { label: "Start", timing: "Vor Tag 1", active: true },
            { label: "Zwischen", timing: "Tag 28", active: false },
            { label: "Abschluss", timing: "Tag 56", active: false },
          ].map((point, index) => (
            <div key={point.label} className="relative flex flex-col items-center text-center">
              <span className={cn(
                "z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-[#111319]",
                point.active ? "border-primary/45 text-primary" : "border-white/[0.10] text-white/35",
              )}>
                {point.active ? <ClipboardCheck className="h-3.5 w-3.5" /> : <span className="text-[8px] font-semibold">{index + 1}</span>}
              </span>
              <span className="mt-2 text-[8px] font-semibold">{point.label}</span>
              <span className="mt-0.5 text-[7px] text-white/34">{point.timing}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            { icon: CheckCircle2, value: "Programmtage", label: "Check-ins & Verständnis" },
            { icon: Target, value: "Bis zu 16", label: "Spieler-Pulse im Alltag" },
            { icon: ClipboardCheck, value: "3 Messungen", label: "Start · Tag 28 · Tag 56" },
            { icon: Users, value: "Bis zu 8", label: "Coach-Reviews im Team" },
          ].map((signal) => {
            const Icon = signal.icon;
            return (
              <div key={signal.label} className="rounded-[13px] border border-white/[0.055] bg-black/15 p-2.5">
                <div className="flex items-center gap-1.5 text-primary">
                  <Icon className="h-3 w-3" strokeWidth={1.8} />
                  <span className="text-[8px] font-semibold">{signal.value}</span>
                </div>
                <p className="mt-1.5 text-[7px] leading-3 text-white/42">{signal.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 rounded-[16px] border border-primary/15 bg-primary/[0.055] p-3">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <div>
            <p className="text-[9px] font-semibold">Du entscheidest. Keine Bewertung deiner Person.</p>
            <p className="mt-1 text-[7px] leading-3 text-white/42">
              Nur freigegebene Daten werden zusammengefasst, um RewirePerform für weitere Athleten zu verbessern. Private Journal- und Freitexte bleiben ausgeschlossen; individuelle Coach-Werte fließen nicht in diese Zusammenfassung ein.
            </p>
          </div>
        </div>
      </div>
    </div>
  </AppScreen>
);

const TeamScreen = () => (
  <AppScreen labelledBy="preview-team-title" active="plan">
    <div className="px-5 pt-5">
      <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-primary">Woche 4 von 8</p>
      <h2 id="preview-team-title" className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.045em]">Dein Plan.</h2>
      <p className="mt-3 text-[9px] leading-4 text-white/58">Coach-Termine und deine mentale Praxis in einer gemeinsamen Linie.</p>

      <div className="mt-4 flex items-start gap-3 rounded-[18px] border border-primary/15 bg-primary/[0.045] p-3">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <p className="text-[8px] leading-3.5 text-white/55">
          Dein Coach plant Termine. Deine privaten Antworten und Journaltexte bleiben außerhalb der Teamansicht.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1">
        {[
          ["Mo", "27"], ["Di", "28"], ["Mi", "29"], ["Do", "30"], ["Fr", "31"], ["Sa", "1"], ["So", "2"],
        ].map(([day, date], index) => (
          <div key={`${day}-${date}`} className="flex min-h-[50px] flex-col items-center justify-center gap-1">
            <span className="text-[7px] uppercase tracking-[0.1em] text-white/45">{day}</span>
            <span className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border text-[9px] font-semibold",
              index === 2 ? "border-primary bg-primary text-[#08110E]" : "border-white/[0.075] text-white/52",
            )}>
              {date}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[8px] font-semibold uppercase tracking-[0.15em] text-white/52">Dienstag, 29. Juli</p>
      <div className="mt-2 border-l border-white/10 pl-4">
        {[
          ["Heute", Brain, "Daily Flow", "10 Tages-Puls-Fragen, eine Mission und Verständnis-Check", true],
          ["17:30", Dumbbell, "Pre-Training", "Teamtraining · deine heutige Vorbereitung", true],
          ["Später", BookOpen, "Tagesjournal", "4 Tagesfragen · privat", false],
        ].map(([time, Icon, title, detail, active], index) => {
          const RowIcon = Icon as typeof Brain;
          return (
            <div key={String(title)} className={cn("relative flex gap-3 py-2.5", index === 2 && "pb-0")}>
              <span className={cn(
                "absolute -left-[19px] top-[17px] h-2 w-2 rounded-full ring-4 ring-[#0D0E12]",
                active ? "bg-primary" : "bg-white/28",
              )} />
              <span className="w-9 shrink-0 pt-0.5 text-[7px] font-medium text-white/38">{String(time)}</span>
              <span className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                active ? "bg-primary/10 text-primary" : "bg-white/[0.035] text-white/38",
              )}>
                <RowIcon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-semibold">{String(title)}</p>
                <p className="mt-1 text-[7px] leading-3 text-white/42">{String(detail)}</p>
              </div>
              <ChevronRight className="mt-2 h-3 w-3 shrink-0 text-white/28" />
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded-xl border border-white/[0.055] bg-white/[0.025] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <p className="text-[8px] font-medium">Teamkalender</p>
        </div>
      </div>
    </div>
  </AppScreen>
);

const StartScreen = ({ mode, postSignup }: { mode: FirstRunMode; postSignup: boolean }) => (
  <AppScreen labelledBy="preview-start-title" chrome="none">
    <div className="flex h-full flex-col items-center px-5 pt-9 text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/25 blur-2xl" />
        <span className="relative flex h-20 w-20 items-center justify-center rounded-[28px] border border-primary/25 bg-primary/[0.10]">
          <BrandSymbol size={42} />
        </span>
      </div>
      <p className="mt-7 text-[8px] font-semibold uppercase tracking-[0.18em] text-primary">RewirePerform</p>
      <h2 id="preview-start-title" className="mt-3 text-[29px] font-semibold leading-[1.02] tracking-[-0.05em]">Bereit für deinen ersten Tag?</h2>
      <p className="mt-4 max-w-[260px] text-[10px] leading-4 text-white/45">
        Richte RewirePerform jetzt passend zu dir und deinem Sportalltag ein.
      </p>

      {postSignup ? (
        <div className="mt-7 w-full rounded-[18px] border border-primary/30 bg-primary/[0.08] p-4 text-left">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <ClipboardCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-primary">Dein nächster Schritt</p>
              <p className="mt-1 text-[11px] font-semibold">Fragebogen</p>
            </div>
          </div>
          <p className="mt-3 text-[8px] leading-4 text-white/42">Sport, Alltag und Ausgangslage</p>
        </div>
      ) : (
        <div className="mt-7 grid w-full grid-cols-2 gap-3">
          <div className={cn(
            "rounded-[18px] border p-4 text-left",
            mode === "team" ? "border-primary/35 bg-primary/[0.09]" : "border-white/[0.065] bg-white/[0.025]",
          )}>
            <Users className={cn("h-4 w-4", mode === "team" ? "text-primary" : "text-white/35")} />
            <p className="mt-4 text-[11px] font-semibold">Team</p>
            <p className="mt-1 text-[8px] text-white/35">Mit Teamcode</p>
          </div>
          <div className={cn(
            "rounded-[18px] border p-4 text-left",
            mode === "solo" ? "border-primary/35 bg-primary/[0.09]" : "border-white/[0.065] bg-white/[0.025]",
          )}>
            <Target className={cn("h-4 w-4", mode === "solo" ? "text-primary" : "text-white/35")} />
            <p className="mt-4 text-[11px] font-semibold">Ohne Team</p>
            <p className="mt-1 text-[8px] text-white/35">Dein eigener Plan</p>
          </div>
        </div>
      )}

      <div className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-[10px] font-semibold text-[#07110E]">
        {postSignup ? "Fragebogen starten" : "Registrierung starten"}
        <ArrowRight className="ml-2 h-3.5 w-3.5" />
      </div>
      {!postSignup && <p className="mt-4 text-[8px] font-medium text-primary">Schon registriert? Anmelden</p>}
    </div>
  </AppScreen>
);

export const AthleteFirstRunSceneVisual = ({
  sceneId,
  mode = "solo",
  postSignup = false,
}: {
  sceneId: AthleteFirstRunSceneId;
  mode?: FirstRunMode;
  postSignup?: boolean;
}) => {
  if (sceneId === "today") return <TodayScreen />;
  if (sceneId === "science") return <ScienceScreen />;
  if (sceneId === "tasks") return <TasksScreen />;
  if (sceneId === "check") return <CheckScreen />;
  if (sceneId === "anchor") return <AnchorScreen />;
  if (sceneId === "journal") return <JournalScreen />;
  if (sceneId === "development") return <DevelopmentScreen />;
  if (sceneId === "measurement") return <MeasurementScreen />;
  if (sceneId === "team") return <TeamScreen />;
  return <StartScreen mode={mode} postSignup={postSignup} />;
};

const FirstRunExperiencePreview = ({
  onComplete,
  onLogin,
  onClose,
  completionLabel,
  replay = false,
  postSignup = false,
  initialMode = "solo",
  fitCameraToViewport = false,
}: FirstRunExperiencePreviewProps = {}) => {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<FirstRunMode>(initialMode);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const cameraViewportRef = useRef<HTMLDivElement>(null);
  const scene = scenes[step];
  const isLast = step === scenes.length - 1;
  const cameraFit = useFirstRunCameraFit(
    cameraViewportRef,
    fitCameraToViewport,
    isLast ? 0 : 48,
  );
  const sceneScale = scene.position.scale * cameraFit;

  useEffect(() => {
    if (cameraViewportRef.current) {
      cameraViewportRef.current.scrollTop = 0;
      cameraViewportRef.current.scrollLeft = 0;
    }
    if (stageRef.current) {
      stageRef.current.scrollTop = 0;
      stageRef.current.scrollLeft = 0;
    }
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const goTo = (next: number) => setStep(Math.max(0, Math.min(scenes.length - 1, next)));

  return (
    <main className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#0D0E12] px-4 pb-[max(18px,env(safe-area-inset-bottom))] pt-[max(14px,env(safe-area-inset-top))] text-[#EEF0F2] sm:px-7 md:pb-[max(10px,env(safe-area-inset-bottom))] md:pt-[max(10px,env(safe-area-inset-top))]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(46,173,137,0.12),transparent_30%),radial-gradient(circle_at_10%_80%,rgba(46,173,137,0.06),transparent_28%)]" />
      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between">
        <BrandLockup symbolSize={27} textClassName="text-[13px] tracking-[-0.02em]" />
        <div className="flex items-center gap-3">
          <span className="hidden text-[10px] font-medium uppercase tracking-[0.14em] text-white/30 sm:block">
            Interaktive Vorschau
          </span>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[9px] font-semibold text-white/55">
            {step + 1} / {scenes.length}
          </span>
          {onLogin && !replay && (
            <button
              type="button"
              onClick={onLogin}
              className="flex min-h-11 items-center rounded-xl px-2 text-[11px] font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-3 sm:text-xs"
            >
              Anmelden
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Einführung schließen"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-white/62 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      <section
        ref={stageRef}
        data-testid="first-run-stage"
        className="relative z-10 mx-auto mt-4 flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mt-2 md:grid md:grid-cols-[minmax(230px,320px)_1fr] md:items-center md:gap-6 lg:grid-cols-[minmax(260px,360px)_1fr] lg:gap-10"
      >
        <div className="relative z-20 order-2 mt-4 md:order-1 md:mt-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={scene.id}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: reduceMotion ? 0.01 : 0.34, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-primary">{scene.eyebrow}</p>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="mt-2 max-w-md text-[clamp(1.45rem,6vw,2.7rem)] font-semibold leading-[1.02] tracking-[-0.05em] outline-none lg:mt-4"
              >
                {scene.title}
              </h1>
            </motion.div>
          </AnimatePresence>

          {isLast && !replay && !postSignup && (
            <div className="mt-4">
              <div className="flex gap-2" role="group" aria-label="Programmweg auswählen">
                {(["team", "solo"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setMode(item)}
                    aria-pressed={mode === item}
                    className={cn(
                      "min-h-11 rounded-xl border px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      mode === item
                        ? "border-primary/40 bg-primary/[0.10] text-primary"
                        : "border-white/[0.08] bg-white/[0.025] text-white/48",
                    )}
                  >
                    {item === "solo" ? "Ohne Team" : "Teamcode"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          ref={cameraViewportRef}
          className={cn(
            "relative order-1 mx-auto w-full max-w-[650px] overflow-clip rounded-[32px] border border-white/[0.065] bg-black/15 md:order-2 md:h-full md:min-h-0 md:max-h-[700px]",
            fitCameraToViewport
              ? "h-auto min-h-0 flex-1"
              : "h-[min(64dvh,650px)] min-h-[430px] shrink [@media(max-height:800px)]:min-h-[350px] [@media(max-height:700px)]:h-[350px] [@media(max-height:500px)]:!h-[210px] [@media(max-height:500px)]:!min-h-[210px]",
          )}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-[#0D0E12]/40 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-[#0D0E12]/35 to-transparent" />
          <div
            data-testid="first-run-camera"
            data-camera-fit={cameraFit.toFixed(4)}
            className={cn("absolute inset-x-0 top-0", fitCameraToViewport && !isLast ? "bottom-12" : "bottom-0")}
          >
            {worldScreens.map((screen) => (
              <motion.div
                key={screen.id}
                className="absolute inset-0 flex items-center justify-center"
                animate={reduceMotion
                  ? {
                      x: 0,
                      y: 0,
                      scale: 0.9 * cameraFit,
                      opacity: screen.id === scene.id ? 1 : 0,
                    }
                  : {
                      x: (screen.x - scene.position.x) * sceneScale,
                      y: (screen.y - scene.position.y) * sceneScale,
                      scale: sceneScale,
                      opacity: screen.id === scene.id ? 1 : 0.28,
                    }}
                transition={reduceMotion
                  ? { duration: 0.01 }
                  : { type: "spring", stiffness: 74, damping: 19, mass: 0.82 }}
                aria-hidden={screen.id !== scene.id}
              >
                <AthleteFirstRunSceneVisual sceneId={screen.id} mode={mode} postSignup={postSignup} />
              </motion.div>
            ))}
          </div>

          {!isLast && (
            <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#0B0C10]/80 px-3 py-2 backdrop-blur-xl" aria-label={`Schritt ${step + 1} von ${scenes.length}`}>
              {scenes.map((item, index) => (
                <span
                  key={item.id}
                  aria-hidden="true"
                  className="flex h-2 min-w-2 items-center justify-center"
                >
                  <span className={cn(
                    "block h-1.5 rounded-full transition-all",
                    index === step ? "w-5 bg-primary" : "w-1.5 bg-white/18",
                  )} />
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer
        data-testid="first-run-footer"
        className="relative z-30 mx-auto mt-4 w-full max-w-6xl shrink-0 md:mt-2"
      >
        <div className="grid w-full grid-cols-[3rem_1fr] gap-3 md:ml-auto md:max-w-[650px]">
          <button
            type="button"
            onClick={() => goTo(step - 1)}
            disabled={step === 0}
            aria-label="Zurück"
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-white/62 disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLast) {
                if (onComplete) {
                  onComplete(mode);
                  return;
                }
                goTo(0);
                return;
              }
              goTo(step + 1);
            }}
            className="flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-[#07110E] shadow-[0_16px_35px_-18px_rgba(46,173,137,0.78)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {isLast ? (
              <>
                {completionLabel ?? (onComplete
                  ? replay
                    ? "Zurück zu den Einstellungen"
                    : postSignup
                      ? "Fragebogen starten"
                      : "Registrierung starten"
                  : "Vorschau erneut ansehen")}
                {onComplete ? <ArrowRight className="ml-2 h-4 w-4" /> : <RotateCcw className="ml-2 h-4 w-4" />}
              </>
            ) : (
              <>
                Weiter
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </footer>

      <div className="sr-only" aria-live="polite">
        Vorschau Schritt {step + 1} von {scenes.length}: {scene.eyebrow}. {scene.title}
      </div>
    </main>
  );
};

export default FirstRunExperiencePreview;
