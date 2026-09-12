import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ClipboardCheck,
  Gauge,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  MailCheck,
  Menu,
  NotebookPen,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  UserRoundCheck,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { BrandLockup, BrandSymbol } from "@/components/brand/BrandLogo";
import { useFirstRunCameraFit } from "@/lib/firstRunCameraFit";
import { cn } from "@/lib/utils";
import { usePublicLanguage } from "@/contexts/PublicLanguageContext";
import { PublicLanguageSwitch } from "@/components/public/PublicLanguageSwitch";

type CoachPreviewSection = "overview" | "state" | "development" | "toolkit" | "team";

type CoachFirstRunExperienceProps = {
  invitation?: boolean;
  invitationKind?: "coach_code" | "personal";
  onComplete?: () => void;
  onLogin?: () => void;
  onClose?: () => void;
  completionLabel?: string;
  fitCameraToViewport?: boolean;
};

export type CoachFirstRunSceneId =
  | "console"
  | "state"
  | "activity"
  | "program"
  | "practice"
  | "review"
  | "development"
  | "team"
  | "privacy"
  | "start";

type Scene = {
  id: CoachFirstRunSceneId;
  eyebrow: string;
  title: string;
  position: { x: number; y: number; scale: number };
};

const scenes: Scene[] = [
  {
    id: "console",
    eyebrow: "Deine Coach Console",
    title: "Dein Team. Klar an einem Ort.",
    position: { x: 0, y: 0, scale: 0.92 },
  },
  {
    id: "state",
    eyebrow: "Aggregierter Teamzustand",
    title: "Du erkennst, was dein Team heute braucht.",
    position: { x: 510, y: -70, scale: 0.96 },
  },
  {
    id: "activity",
    eyebrow: "Teilnahme im Blick",
    title: "Du siehst Aktivität – keine privaten Antworten.",
    position: { x: 920, y: -430, scale: 0.96 },
  },
  {
    id: "program",
    eyebrow: "Heute im Athleten-Programm",
    title: "Du kennst denselben Fokus wie dein Team.",
    position: { x: 660, y: -950, scale: 0.96 },
  },
  {
    id: "practice",
    eyebrow: "Direkt in die Praxis",
    title: "Aus dem Tagesfokus wird dein Coaching-Anker.",
    position: { x: 110, y: -1130, scale: 0.96 },
  },
  {
    id: "review",
    eyebrow: "Strukturierte Beobachtung",
    title: "Kurze Reviews halten echte Entwicklung fest.",
    position: { x: -500, y: -1060, scale: 0.96 },
  },
  {
    id: "development",
    eyebrow: "Entwicklung über 56 Tage",
    title: "Start, Mitte und Ende ergeben einen Verlauf.",
    position: { x: -990, y: -630, scale: 0.94 },
  },
  {
    id: "team",
    eyebrow: "Teams und Zugänge",
    title: "Du steuerst Einladungen und Programmstart.",
    position: { x: -1330, y: -290, scale: 0.96 },
  },
  {
    id: "privacy",
    eyebrow: "Klare Datenschutzgrenzen",
    title: "Überblick entsteht, ohne Vertrauen zu brechen.",
    position: { x: -1010, y: 10, scale: 0.96 },
  },
  {
    id: "start",
    eyebrow: "Bereit",
    title: "Begleite dein Team mit einem klaren System.",
    position: { x: -530, y: 570, scale: 0.92 },
  },
];

const englishScenes: Pick<Scene, "eyebrow" | "title">[] = [
  { eyebrow: "Your Coach Console", title: "Your team. Clear in one place." },
  { eyebrow: "Aggregated team picture", title: "See what your team may need today." },
  { eyebrow: "Participation at a glance", title: "See activity, not private answers." },
  { eyebrow: "Today's athlete programme", title: "Share the same focus as your team." },
  { eyebrow: "Straight into practice", title: "Turn the day's focus into a coaching cue." },
  { eyebrow: "Structured observation", title: "Short reviews document real progress." },
  { eyebrow: "Progress across 56 days", title: "Start, middle and finish form a picture." },
  { eyebrow: "Teams and access", title: "Manage invitations and the programme start." },
  { eyebrow: "Clear privacy boundaries", title: "Get an overview without breaking trust." },
  { eyebrow: "Ready", title: "Support your team with a clear system." },
];

const worldScreens = scenes.map(({ id, position }) => ({
  id,
  x: position.x,
  y: position.y,
}));

const CoachTopBar = ({ title = "Coach Console" }: { title?: string }) => (
  <div className="flex h-12 items-center justify-between border-b border-white/[0.055] bg-[#0D0E12]/90 px-4">
    <BrandLockup symbolSize={20} textClassName="text-[10px] tracking-[-0.02em]" />
    <span className="rounded-full border border-primary/15 bg-primary/[0.055] px-2.5 py-1 text-[7px] font-semibold uppercase tracking-[0.13em] text-primary">
      {title}
    </span>
  </div>
);

const CoachBottomNav = ({ active }: { active: CoachPreviewSection }) => {
  const { tr } = usePublicLanguage();
  const items = [
    { id: "overview", label: tr("Übersicht", "Overview"), icon: LayoutDashboard },
    { id: "state", label: tr("Zustand", "State"), icon: Activity },
    { id: "development", label: tr("Entwicklung", "Progress"), icon: BarChart3 },
    { id: "toolkit", label: "Toolkit", icon: Sparkles },
    { id: "team", label: "Team", icon: Settings },
  ] as const;

  return (
    <div className="absolute inset-x-0 bottom-0 grid h-[58px] grid-cols-5 border-t border-white/[0.07] bg-[#0B0C10]/95 px-1 pb-1">
      {items.map((item) => {
        const Icon = item.icon;
        const selected = active === item.id;
        return (
          <div key={item.id} className="relative flex flex-col items-center justify-center gap-1">
            {selected && <span className="absolute top-0 h-0.5 w-5 rounded-full bg-primary" />}
            <Icon className={cn("h-3.5 w-3.5", selected ? "text-primary" : "text-white/32")} strokeWidth={1.8} />
            <span className={cn("text-[6px] font-medium", selected ? "text-primary" : "text-white/32")}>
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const CoachAppScreen = ({
  children,
  active = "overview",
  labelledBy,
  chrome = true,
}: {
  children: ReactNode;
  active?: CoachPreviewSection;
  labelledBy: string;
  chrome?: boolean;
}) => (
  <section
    aria-labelledby={labelledBy}
    className="relative h-[610px] w-[344px] overflow-hidden rounded-[34px] border border-white/[0.09] bg-[#0D0E12] text-[#EEF0F2] shadow-[0_35px_100px_-36px_rgba(0,0,0,0.9),0_0_70px_-44px_rgba(46,173,137,0.7)]"
  >
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-6%,rgba(46,173,137,0.14),transparent_34%)]" />
    {chrome && <CoachTopBar />}
    <div className={cn("relative overflow-hidden", chrome ? "h-[500px]" : "h-full")}>{children}</div>
    {chrome && <CoachBottomNav active={active} />}
  </section>
);

const MiniMetric = ({ icon: Icon, value, label }: { icon: typeof Users; value: string; label: string }) => (
  <div className="rounded-[17px] border border-white/[0.065] bg-white/[0.025] p-3">
    <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
    <p className="mt-3 text-[21px] font-semibold leading-none tracking-[-0.04em]">{value}</p>
    <p className="mt-1.5 text-[7px] leading-3 text-white/38">{label}</p>
  </div>
);

const ConsoleScreen = () => {
  const { tr, language } = usePublicLanguage();
  return (
  <CoachAppScreen labelledBy="coach-preview-console-title">
    <div className="px-5 pt-5">
      <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-primary">Coach Dashboard</p>
      <h2 id="coach-preview-console-title" className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.045em]">
        {tr("Guten Morgen, Coach.", "Good morning, Coach.")}
      </h2>
      <p className="mt-3 text-[9px] leading-4 text-white/45">{tr("Dein Team und die wichtigsten nächsten Schritte.", "Your team and the most important next steps.")}</p>

      <section className="relative mt-5 overflow-hidden rounded-[26px] border border-white/[0.075] bg-[linear-gradient(145deg,rgba(28,31,36,0.96),rgba(15,17,21,0.98))] p-4">
        <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-primary/[0.10] blur-3xl" />
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-white/38">{tr("Beispielansicht", "Example view")}</p>
            <p className="mt-2 text-[18px] font-semibold tracking-[-0.035em]">{tr("U17 · Woche 4", "U17 · Week 4")}</p>
            <p className="mt-1 text-[8px] text-white/38">{tr("Tag 22 im 56-Tage-Programm", "Day 22 of the 56-day programme")}</p>
          </div>
          <span className="flex h-12 w-12 items-center justify-center rounded-[17px] border border-primary/20 bg-primary/[0.10] text-primary">
            <UsersRound className="h-5 w-5" />
          </span>
        </div>
        <div className="relative mt-4 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full w-[39%] rounded-full bg-primary" />
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <MiniMetric icon={Users} value="18" label={tr("Athleten im Team", "Athletes in the team")} />
        <MiniMetric icon={Activity} value="14" label={tr("in 7 Tagen aktiv", "active in 7 days")} />
      </div>

      <p className="mt-5 text-[8px] font-semibold uppercase tracking-[0.15em] text-white/42">{tr("Deine Bereiche", "Your areas")}</p>
      <div className="mt-2 overflow-hidden rounded-[18px] border border-white/[0.065] bg-white/[0.025]">
        {(language === "en" ? [
          [Gauge, "Team state", "Aggregated daily values"],
          [Sparkles, "Coach Toolkit", "Daily focus and practice"],
          [ClipboardCheck, "Progress", "Measurements and reviews"],
        ] : [
          [Gauge, "Teamzustand", "Aggregierte Tageswerte"],
          [Sparkles, "Coach Toolkit", "Tagesfokus und Praxis"],
          [ClipboardCheck, "Entwicklung", "Messungen und Reviews"],
        ]).map(([Icon, title, detail], index) => {
          const RowIcon = Icon as typeof Users;
          return (
            <div key={String(title)} className={cn("flex h-[53px] items-center gap-3 px-3", index < 2 && "border-b border-white/[0.05]")}>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/[0.08] text-primary"><RowIcon className="h-3.5 w-3.5" /></span>
              <div className="min-w-0 flex-1"><p className="text-[9px] font-semibold">{String(title)}</p><p className="mt-0.5 text-[7px] text-white/34">{String(detail)}</p></div>
              <ArrowRight className="h-3 w-3 text-white/24" />
            </div>
          );
        })}
      </div>
    </div>
  </CoachAppScreen>
  );
};

const StateScreen = () => {
  const { tr, language } = usePublicLanguage();
  return (
  <CoachAppScreen labelledBy="coach-preview-state-title" active="state">
    <div className="px-5 pt-5">
      <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-primary">{tr("Teamzustand · heute", "Team state · today")}</p>
      <h2 id="coach-preview-state-title" className="mt-2 text-[25px] font-semibold leading-none tracking-[-0.045em]">{tr("Was braucht das Team?", "What does the team need?")}</h2>
      <p className="mt-3 text-[9px] leading-4 text-white/45">{tr("Nur sichtbar, wenn mindestens fünf Athleten geantwortet haben.", "Visible only when at least five athletes have responded.")}</p>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {(language === "en" ? [
          ["Energy", "6.8", "+0.4"],
          ["Focus", "7.1", "stable"],
          ["Pressure", "5.4", "+0.7"],
        ] : [
          ["Energie", "6,8", "+0,4"],
          ["Fokus", "7,1", "stabil"],
          ["Druck", "5,4", "+0,7"],
        ]).map(([label, value, delta]) => (
          <div key={label} className="rounded-[17px] border border-white/[0.065] bg-white/[0.025] px-2.5 py-3 text-center">
            <p className="text-[7px] text-white/38">{label}</p>
            <p className="mt-2 text-[20px] font-semibold tracking-[-0.04em]">{value}</p>
            <p className="mt-1 text-[7px] text-primary">{delta}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[22px] border border-white/[0.065] bg-white/[0.025] p-4">
        <div className="flex items-center justify-between">
          <div><p className="text-[8px] font-semibold">{tr("7-Tage-Verlauf", "7-day trend")}</p><p className="mt-1 text-[7px] text-white/32">{tr("Aggregierter Fokus", "Aggregated focus")}</p></div>
          <span className="rounded-full bg-primary/[0.09] px-2 py-1 text-[7px] font-semibold text-primary">n = 14</span>
        </div>
        <svg className="mt-4 h-[86px] w-full overflow-visible" viewBox="0 0 280 86" role="img" aria-label={tr("Beispielhafter aggregierter Fokusverlauf", "Example aggregated focus trend")}>
          <defs><linearGradient id="coachStateArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2EAD89" stopOpacity="0.28" /><stop offset="100%" stopColor="#2EAD89" stopOpacity="0" /></linearGradient></defs>
          <path d="M0,66 C30,62 42,50 70,52 C102,54 118,38 146,42 C174,46 203,26 230,31 C248,34 262,24 280,20 L280,86 L0,86 Z" fill="url(#coachStateArea)" />
          <path d="M0,66 C30,62 42,50 70,52 C102,54 118,38 146,42 C174,46 203,26 230,31 C248,34 262,24 280,20" fill="none" stroke="#2EAD89" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-[18px] border border-primary/15 bg-primary/[0.055] p-3.5">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div><p className="text-[9px] font-semibold">{tr("Orientierung, kein Urteil.", "Guidance, not judgement.")}</p><p className="mt-1 text-[8px] leading-3.5 text-white/42">{tr("Keine Einzelantworten und keine Namen hinter den Teamwerten.", "No individual answers or names behind team values.")}</p></div>
      </div>
    </div>
  </CoachAppScreen>
  );
};

const ActivityScreen = () => {
  const { tr, language } = usePublicLanguage();
  return (
  <CoachAppScreen labelledBy="coach-preview-activity-title">
    <div className="px-5 pt-5">
      <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-primary">{tr("Teilnahme pro Athlet", "Participation by athlete")}</p>
      <h2 id="coach-preview-activity-title" className="mt-2 text-[25px] font-semibold leading-none tracking-[-0.045em]">{tr("Wer bleibt im Rhythmus?", "Who is keeping the rhythm?")}</h2>
      <p className="mt-3 text-[9px] leading-4 text-white/45">{tr("Du erkennst Anschlussbedarf, ohne Inhalte der Athleten zu lesen.", "See who may need a follow-up without reading athletes' private content.")}</p>

      <div className="mt-5 overflow-hidden rounded-[22px] border border-white/[0.065] bg-white/[0.025]">
        {(language === "en" ? [
          ["Noah M.", "16/22 days", "4 check-ins in 7 days", "active"],
          ["Lina K.", "15/22 days", "3 check-ins in 7 days", "active"],
          ["Samir B.", "9/22 days", "0 check-ins in 7 days", "follow-up"],
          ["Mia S.", "18/22 days", "5 check-ins in 7 days", "active"],
        ] : [
          ["Noah M.", "16/22 Tage", "4 Check-ins in 7 Tagen", "aktiv"],
          ["Lina K.", "15/22 Tage", "3 Check-ins in 7 Tagen", "aktiv"],
          ["Samir B.", "9/22 Tage", "0 Check-ins in 7 Tagen", "Anschluss"],
          ["Mia S.", "18/22 Tage", "5 Check-ins in 7 Tagen", "aktiv"],
        ]).map(([name, days, checkins, state], index) => (
          <div key={name} className={cn("flex min-h-[68px] items-center gap-3 px-3.5 py-3", index < 3 && "border-b border-white/[0.05]")}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.035] text-[9px] font-semibold text-white/62">{name.split(" ").map((part) => part[0]).join("")}</span>
            <div className="min-w-0 flex-1"><p className="text-[9px] font-semibold">{name}</p><p className="mt-1 text-[7px] text-white/35">{days} · {checkins}</p></div>
            <span className={cn("rounded-full px-2 py-1 text-[7px] font-semibold", state === "aktiv" || state === "active" ? "bg-primary/[0.09] text-primary" : "bg-amber-400/[0.09] text-amber-300")}>{state}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[[tr("Tage", "Days"), Check], ["Check-ins", Activity], ["Streak", Target]].map(([label, Icon]) => {
          const ItemIcon = Icon as typeof Check;
          return <div key={String(label)} className="rounded-[15px] border border-white/[0.055] bg-black/15 p-2.5"><ItemIcon className="mx-auto h-3.5 w-3.5 text-primary" /><p className="mt-1.5 text-[7px] text-white/38">{String(label)}</p></div>;
        })}
      </div>

      <div className="mt-4 flex items-start gap-2.5 text-[8px] leading-3.5 text-white/38">
        <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        {tr("Nur Aktivitätsstatus. Keine Journaltexte, Antworten oder individuellen Stimmungswerte.", "Activity status only. No journal entries, answers or individual mood values.")}
      </div>
    </div>
  </CoachAppScreen>
  );
};

const ProgramScreen = () => {
  const { tr, language } = usePublicLanguage();
  return (
  <CoachAppScreen labelledBy="coach-preview-program-title" active="toolkit">
    <div className="px-5 pt-5">
      <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-primary">{tr("Heute im Athleten-Programm", "Today's athlete programme")}</p>
      <h2 id="coach-preview-program-title" className="mt-2 text-[24px] font-semibold leading-[1.02] tracking-[-0.045em]">{tr("Du kennst ihre heutige Linie.", "You know today's focus.")}</h2>
      <p className="mt-3 text-[9px] leading-4 text-white/45">{tr("Damit dein Coaching denselben Fokus im Training verstärken kann.", "So your coaching can reinforce the same focus in training.")}</p>

      <section className="relative mt-5 overflow-hidden rounded-[25px] border border-primary/20 bg-[linear-gradient(145deg,rgba(28,40,37,0.86),rgba(15,18,21,0.98))] p-4">
        <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-primary/[0.12] blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between"><span className="text-[8px] font-semibold uppercase tracking-[0.16em] text-primary">{tr("Tag 22 · Skills", "Day 22 · Skills")}</span><span className="text-[7px] text-white/35">Training</span></div>
          <h3 className="mt-4 text-[21px] font-semibold leading-[1.06] tracking-[-0.04em]">{tr("Nimm das vollständige Bild wieder auf", "Bring the full picture back into view")}</h3>
          <p className="mt-3 text-[9px] leading-4 text-white/48">{tr("Wenn ein Problem fast alles verdeckt, holt dein Team das Funktionierende und die nächsten Möglichkeiten wieder mit ins Bild.", "When one problem crowds out almost everything else, the team brings what is working and the next options back into view.")}</p>
        </div>
      </section>

      <div className="mt-4 rounded-[20px] border border-white/[0.065] bg-white/[0.025] p-4">
        <p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-white/38">{tr("Eine Mission", "One mission")}</p>
        <div className="mt-3 space-y-2.5">
          {(language === "en" ? ["Name the problem clearly", "Notice other real information", "Choose the next action"] : ["Problem klar benennen", "Weitere reale Informationen sehen", "Nächste Handlung wählen"]).map((item, index) => (
            <div key={item} className="flex items-center gap-3 rounded-xl bg-white/[0.025] px-3 py-2.5"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/[0.12] text-[8px] font-semibold text-primary">{index + 1}</span><p className="text-[9px]">{item}</p></div>
          ))}
        </div>
      </div>
    </div>
  </CoachAppScreen>
  );
};

const PracticeScreen = () => {
  const { tr, language } = usePublicLanguage();
  return (
  <CoachAppScreen labelledBy="coach-preview-practice-title" active="toolkit">
    <div className="px-5 pt-5">
      <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-primary">Coach Toolkit</p>
      <h2 id="coach-preview-practice-title" className="mt-2 text-[25px] font-semibold leading-none tracking-[-0.045em]">{tr("Heute direkt nutzbar.", "Ready to use today.")}</h2>
      <p className="mt-3 text-[9px] leading-4 text-white/45">{tr("Ein kurzer Coach-Anker verbindet App und Trainingsalltag.", "A short coaching cue connects the app with everyday training.")}</p>

      <div className="relative mt-5 overflow-hidden rounded-[24px] border border-primary/22 bg-primary/[0.065] p-4">
        <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/[0.11] blur-3xl" />
        <div className="relative flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] bg-primary/[0.13] text-primary"><Target className="h-4 w-4" /></span>
          <div><p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-primary">{tr("Dein Satz fürs Training", "Your phrase for training")}</p><p className="mt-2 text-[13px] font-semibold leading-5">{tr("„Was ist außerdem real – und was ist jetzt die nächste Aktion?“", "‘What else is real, and what is the next action now?’")}</p></div>
        </div>
      </div>

      <p className="mt-5 text-[8px] font-semibold uppercase tracking-[0.15em] text-white/40">{tr("So bringst du ihn auf den Platz", "Bring it onto the pitch")}</p>
      <div className="mt-2 space-y-2.5">
        {(language === "en" ? [
          ["1", "Before", "Give the team the phrase clearly once."],
          ["2", "In the moment", "Remind them calmly after a mistake."],
          ["3", "Afterwards", "Point out the next good action."],
        ] : [
          ["1", "Vorher", "Den Satz einmal klar ans Team geben."],
          ["2", "Im Moment", "Nach einem Fehler ruhig daran erinnern."],
          ["3", "Danach", "Die nächste gute Handlung sichtbar machen."],
        ]).map(([number, title, copy]) => (
          <div key={number} className="flex gap-3 rounded-[18px] border border-white/[0.06] bg-white/[0.025] p-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/[0.12] text-[8px] font-semibold text-primary">{number}</span><div><p className="text-[9px] font-semibold">{title}</p><p className="mt-1 text-[8px] leading-3.5 text-white/38">{copy}</p></div></div>
        ))}
      </div>
    </div>
  </CoachAppScreen>
  );
};

const ReviewScreen = () => {
  const { tr, language } = usePublicLanguage();
  return (
  <CoachAppScreen labelledBy="coach-preview-review-title" active="development">
    <div className="px-5 pt-5">
      <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-primary">{tr("Woche 4 · strukturierte Beobachtung", "Week 4 · structured observation")}</p>
      <h2 id="coach-preview-review-title" className="mt-2 text-[24px] font-semibold leading-[1.03] tracking-[-0.045em]">{tr("Beobachten. Kurz festhalten.", "Observe. Record briefly.")}</h2>
      <p className="mt-3 text-[9px] leading-4 text-white/45">{tr("Fünf direkt beobachtbare Bereiche. Zielzeit: unter 90 Sekunden.", "Five directly observable areas. Target time: under 90 seconds.")}</p>

      <div className="mt-5 flex gap-2 rounded-[15px] border border-white/[0.065] bg-white/[0.025] p-1">
        <span className="flex h-9 flex-1 items-center justify-center rounded-[11px] bg-white/[0.055] text-[8px] font-semibold"><Users className="mr-1.5 h-3 w-3 text-primary" />Team</span>
        <span className="flex h-9 flex-1 items-center justify-center rounded-[11px] text-[8px] text-white/35"><UserRoundCheck className="mr-1.5 h-3 w-3" />{tr("Einzel", "Individual")}</span>
      </div>

      <div className="mt-4 space-y-3">
        {(language === "en" ? [
          ["Return after mistakes", 4],
          ["Act clearly under pressure", 3],
          ["Stay focused on the task", 4],
          ["Stay connected as a team", 3],
          ["Try new solutions", 4],
        ] : [
          ["Nach Fehlern zurückkehren", 4],
          ["Unter Druck klar handeln", 3],
          ["Aufgabenfokus halten", 4],
          ["Miteinander stabil bleiben", 3],
          ["Neue Lösungen ausprobieren", 4],
        ]).map(([label, value]) => (
          <div key={String(label)}>
            <div className="flex items-center justify-between"><p className="text-[8px] font-medium">{String(label)}</p><span className="text-[8px] font-semibold text-primary">{String(value)} / 5</span></div>
            <div className="mt-1.5 grid grid-cols-5 gap-1">{Array.from({ length: 5 }, (_, index) => <span key={index} className={cn("h-1.5 rounded-full", index < Number(value) ? "bg-primary" : "bg-white/[0.065]")} />)}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-start gap-2.5 rounded-[16px] border border-primary/15 bg-primary/[0.05] p-3">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /><p className="text-[8px] leading-3.5 text-white/42">{tr("Nur Verhalten bewerten, das du wirklich beobachten konntest.", "Rate only behaviour you actually observed.")}</p>
      </div>
    </div>
  </CoachAppScreen>
  );
};

const DevelopmentScreen = () => {
  const { tr, language } = usePublicLanguage();
  return (
  <CoachAppScreen labelledBy="coach-preview-development-title" active="development">
    <div className="px-5 pt-5">
      <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-primary">{tr("Entwicklung", "Progress")}</p>
      <h2 id="coach-preview-development-title" className="mt-2 text-[25px] font-semibold leading-none tracking-[-0.045em]">{tr("Ein Verlauf statt Momentaufnahme.", "A trend, not a snapshot.")}</h2>
      <p className="mt-3 text-[9px] leading-4 text-white/45">{tr("Messfenster, Aktivität und Beobachtungen bleiben klar getrennt.", "Measurement windows, activity and observations stay clearly separate.")}</p>

      <div className="mt-5 rounded-[22px] border border-white/[0.065] bg-white/[0.025] p-4">
        <div className="relative grid grid-cols-3">
          <span className="absolute left-[16.7%] right-[16.7%] top-4 h-px bg-gradient-to-r from-primary/50 via-primary/25 to-white/10" />
          {(language === "en" ? [
            ["Start", "before day 1", true],
            ["Midpoint", "Day 28", true],
            ["Finish", "Day 56", false],
          ] : [
            ["Start", "vor Tag 1", true],
            ["Zwischen", "Tag 28", true],
            ["Abschluss", "Tag 56", false],
          ]).map(([label, timing, active], index) => (
            <div key={String(label)} className="relative flex flex-col items-center text-center"><span className={cn("z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-[#111319]", active ? "border-primary/45 text-primary" : "border-white/[0.10] text-white/32")}>{active ? <Check className="h-3.5 w-3.5" /> : <span className="text-[8px] font-semibold">{index + 1}</span>}</span><span className="mt-2 text-[8px] font-semibold">{String(label)}</span><span className="mt-0.5 text-[7px] text-white/32">{String(timing)}</span></div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-white/[0.065] bg-white/[0.025] p-4">
        <div className="flex items-center justify-between"><div><p className="text-[8px] font-semibold">{tr("Programmbeteiligung", "Programme participation")}</p><p className="mt-1 text-[7px] text-white/34">{tr("Woche für Woche", "Week by week")}</p></div><span className="text-[18px] font-semibold text-primary">78%</span></div>
        <div className="mt-4 flex h-[82px] items-end gap-2">{[32, 48, 55, 67, 63, 74, 78].map((value, index) => <span key={index} className="flex-1 rounded-t-md bg-gradient-to-t from-primary/25 to-primary" style={{ height: `${value}%` }} />)}</div>
        <div className="mt-2 flex justify-between text-[6px] text-white/25"><span>W1</span><span>W2</span><span>W3</span><span>W4</span><span>W5</span><span>W6</span><span>W7</span></div>
      </div>

      <p className="mt-4 text-[8px] leading-3.5 text-white/38">{tr("Keine Talent-, Startelf- oder Karriereentscheidung. Der Verlauf unterstützt die gemeinsame Arbeit.", "Not for talent, starting-lineup or career decisions. The trend supports the work you do together.")}</p>
    </div>
  </CoachAppScreen>
  );
};

const TeamScreen = () => {
  const { tr } = usePublicLanguage();
  return (
  <CoachAppScreen labelledBy="coach-preview-team-title" active="team">
    <div className="px-5 pt-5">
      <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-primary">{tr("Team verwalten", "Manage team")}</p>
      <h2 id="coach-preview-team-title" className="mt-2 text-[25px] font-semibold leading-none tracking-[-0.045em]">{tr("Zugänge bleiben kontrolliert.", "Access stays controlled.")}</h2>
      <p className="mt-3 text-[9px] leading-4 text-white/45">{tr("Athleten und Coaches kommen über getrennte, sichere Wege ins Team.", "Athletes and coaches join the team through separate, secure paths.")}</p>

      <div className="mt-5 space-y-3">
        <div className="rounded-[22px] border border-white/[0.065] bg-white/[0.025] p-4">
          <div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-primary/[0.10] text-primary"><Users className="h-4 w-4" /></span><div><p className="text-[10px] font-semibold">{tr("Athleten einladen", "Invite athletes")}</p><p className="mt-1 text-[8px] leading-3.5 text-white/38">{tr("Teamcode teilen. Der Beitritt wird vom Athleten bestätigt.", "Share a team code. Each athlete confirms joining.")}</p></div></div>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/15 px-3 py-2.5"><span className="text-[12px] font-semibold tracking-[0.2em]">AB12CD</span><span className="text-[8px] font-semibold text-primary">{tr("Teilen", "Share")}</span></div>
        </div>

        <div className="rounded-[22px] border border-white/[0.065] bg-white/[0.025] p-4">
          <div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-primary/[0.10] text-primary"><MailCheck className="h-4 w-4" /></span><div><p className="text-[10px] font-semibold">{tr("Co-Coach einladen", "Invite a co-coach")}</p><p className="mt-1 text-[8px] leading-3.5 text-white/38">{tr("Team-Link teilen · eigenes bestätigtes Konto · der Lead Coach verwaltet Zugänge.", "Share a team link · verified personal account · lead coach manages access.")}</p></div></div>
        </div>

        <div className="rounded-[22px] border border-white/[0.065] bg-white/[0.025] p-4">
          <div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-primary/[0.10] text-primary"><CalendarDays className="h-4 w-4" /></span><div><p className="text-[10px] font-semibold">{tr("Programm gemeinsam starten", "Start the programme together")}</p><p className="mt-1 text-[8px] leading-3.5 text-white/38">{tr("Startdatum und Teamzugang werden bewusst festgelegt.", "The start date and team access are set deliberately.")}</p></div></div>
        </div>
      </div>
    </div>
  </CoachAppScreen>
  );
};

const PrivacyScreen = () => {
  const { tr, language } = usePublicLanguage();
  return (
  <CoachAppScreen labelledBy="coach-preview-privacy-title" chrome={false}>
    <CoachTopBar title={tr("Datenschutz", "Privacy")} />
    <div className="px-5 pt-6">
      <div className="relative mx-auto flex h-16 w-16 items-center justify-center"><div className="absolute inset-0 rounded-[22px] bg-primary/20 blur-2xl" /><span className="relative flex h-14 w-14 items-center justify-center rounded-[20px] border border-primary/25 bg-primary/[0.09] text-primary"><ShieldCheck className="h-6 w-6" /></span></div>
      <p className="mt-5 text-center text-[8px] font-semibold uppercase tracking-[0.18em] text-primary">{tr("Klare Grenze", "Clear boundary")}</p>
      <h2 id="coach-preview-privacy-title" className="mx-auto mt-2 max-w-[280px] text-center text-[24px] font-semibold leading-[1.04] tracking-[-0.045em]">{tr("Du siehst, was du zum Begleiten brauchst.", "See what you need to support your team.")}</h2>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-[20px] border border-primary/17 bg-primary/[0.045] p-3.5"><p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-primary">{tr("Sichtbar", "Visible")}</p><div className="mt-3 space-y-2.5">{(language === "en" ? ["Participation and activity", "Aggregated team state", "Approved progress", "Own coach notes"] : ["Teilnahme und Aktivität", "Aggregierter Teamzustand", "Freigegebene Entwicklung", "Eigene Coach-Notizen"]).map((item) => <div key={item} className="flex items-start gap-2"><Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" /><p className="text-[8px] leading-3 text-white/52">{item}</p></div>)}</div></div>
        <div className="rounded-[20px] border border-white/[0.065] bg-white/[0.025] p-3.5"><p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-white/35">{tr("Privat", "Private")}</p><div className="mt-3 space-y-2.5">{(language === "en" ? ["Journal entries", "Free-form reflections", "Individual check-in answers", "Individual psychological scores"] : ["Journaltexte", "Freie Reflexionen", "Einzelne Check-in-Antworten", "Individuelle psychologische Werte"]).map((item) => <div key={item} className="flex items-start gap-2"><LockKeyhole className="mt-0.5 h-3 w-3 shrink-0 text-white/32" /><p className="text-[8px] leading-3 text-white/38">{item}</p></div>)}</div></div>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-[18px] border border-white/[0.065] bg-white/[0.025] p-3.5"><NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><p className="text-[9px] font-semibold">{tr("Dein Coach Journal bleibt ebenfalls privat.", "Your coach journal stays private too.")}</p><p className="mt-1 text-[8px] leading-3.5 text-white/38">{tr("Klare Rollen schaffen Vertrauen auf beiden Seiten.", "Clear roles build trust on both sides.")}</p></div></div>
    </div>
  </CoachAppScreen>
  );
};

const StartScreen = ({
  invitation,
  invitationKind,
}: {
  invitation: boolean;
  invitationKind?: "coach_code" | "personal";
}) => {
  const isCoCoachInvitation = invitationKind === "coach_code";
  const { tr } = usePublicLanguage();

  return (
  <CoachAppScreen labelledBy="coach-preview-start-title" chrome={false}>
    <div className="flex h-full flex-col items-center px-5 pt-9 text-center">
      <div className="relative"><div className="absolute inset-0 rounded-full bg-primary/25 blur-2xl" /><span className="relative flex h-20 w-20 items-center justify-center rounded-[28px] border border-primary/25 bg-primary/[0.10]"><BrandSymbol size={42} /></span></div>
      <p className="mt-7 text-[8px] font-semibold uppercase tracking-[0.18em] text-primary">RewirePerform Coach</p>
      <h2 id="coach-preview-start-title" className="mt-3 text-[28px] font-semibold leading-[1.02] tracking-[-0.05em]">{invitation ? (isCoCoachInvitation ? tr("Deine Co-Coach-Einladung ist bereit.", "Your co-coach invitation is ready.") : tr("Deine Einladung ist bereit.", "Your invitation is ready.")) : tr("Bereit für dein Team?", "Ready for your team?")}</h2>
      <p className="mt-4 max-w-[268px] text-[10px] leading-4 text-white/45">{invitation ? (isCoCoachInvitation ? tr("Registriere dich oder melde dich als Coach an. Danach verbindest du dein persönliches Konto mit dem Team.", "Register or log in as a coach. Then connect your personal account to the team.") : tr("Registriere dich mit der eingeladenen E-Mail-Adresse. Danach wird dein Coach-Zugang sicher geprüft.", "Register with the invited email address. Your coach access is then checked securely.")) : tr("Starte mit einer persönlichen Anfrage. Teams und Rollen werden nicht automatisch freigeschaltet.", "Start with a personal request. Teams and roles are not enabled automatically.")}</p>

      <div className="mt-7 w-full rounded-[20px] border border-primary/22 bg-primary/[0.065] p-4 text-left">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-primary/[0.12] text-primary">{invitation ? <KeyRound className="h-4 w-4" /> : <UsersRound className="h-4 w-4" />}</span><div><p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-primary">{tr("Dein nächster Schritt", "Your next step")}</p><p className="mt-1 text-[11px] font-semibold">{invitation ? (isCoCoachInvitation ? tr("Co-Coach-Einladung fortsetzen", "Continue co-coach invitation") : tr("Persönliche Einladung bestätigen", "Confirm personal invitation")) : tr("Teamzugang anfragen", "Request team access")}</p></div></div>
        <p className="mt-3 text-[8px] leading-3.5 text-white/40">{invitation ? (isCoCoachInvitation ? tr("Team-Link · persönliches Konto · serverseitige Rollenprüfung", "Team link · personal account · server-side role check") : tr("Einmaliger Link · bestätigte E-Mail · serverseitige Rollenprüfung", "One-time link · verified email · server-side role check")) : tr("Ein Team, Verein oder eine Organisation kontrolliert einführen", "Set up a team, club or organisation with care")}</p>
      </div>

      {!invitation && <div className="mt-4 flex w-full items-start gap-2 rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-3 text-left"><MailCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /><p className="text-[8px] leading-3.5 text-white/38">{tr("Schon als Coach eingeladen? Öffne den persönlichen Link aus deiner Einladung.", "Already invited as a coach? Open the personal link in your invitation.")}</p></div>}

      <p className="mt-5 text-[8px] font-medium text-primary">{tr("Der nächste Schritt öffnet deinen passenden Zugangsweg.", "The next step opens the right access path for you.")}</p>
    </div>
  </CoachAppScreen>
  );
};

export const CoachFirstRunSceneVisual = ({
  sceneId,
  invitation = false,
  invitationKind,
}: {
  sceneId: CoachFirstRunSceneId;
  invitation?: boolean;
  invitationKind?: "coach_code" | "personal";
}) => {
  if (sceneId === "console") return <ConsoleScreen />;
  if (sceneId === "state") return <StateScreen />;
  if (sceneId === "activity") return <ActivityScreen />;
  if (sceneId === "program") return <ProgramScreen />;
  if (sceneId === "practice") return <PracticeScreen />;
  if (sceneId === "review") return <ReviewScreen />;
  if (sceneId === "development") return <DevelopmentScreen />;
  if (sceneId === "team") return <TeamScreen />;
  if (sceneId === "privacy") return <PrivacyScreen />;
  return <StartScreen invitation={invitation} invitationKind={invitationKind} />;
};

const CoachFirstRunExperience = ({
  invitation = false,
  invitationKind,
  onComplete,
  onLogin,
  onClose,
  completionLabel,
  fitCameraToViewport = false,
}: CoachFirstRunExperienceProps) => {
  const reduceMotion = useReducedMotion();
  const { tr, language } = usePublicLanguage();
  const [step, setStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const cameraViewportRef = useRef<HTMLDivElement>(null);
  const scene = scenes[step];
  const sceneCopy = language === "en" ? englishScenes[step] : scene;
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(46,173,137,0.13),transparent_30%),radial-gradient(circle_at_10%_80%,rgba(46,173,137,0.065),transparent_28%)]" />
      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between">
        <BrandLockup symbolSize={27} textClassName="text-[13px] tracking-[-0.02em]" />
        <div className="flex items-center gap-3">
          <span className="hidden text-[10px] font-medium uppercase tracking-[0.14em] text-white/30 sm:block">{tr("Coach Einführung", "Coach introduction")}</span>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[9px] font-semibold text-white/55">{step + 1} / {scenes.length}</span>
          <PublicLanguageSwitch />
          {onLogin && <button type="button" onClick={onLogin} className="flex min-h-11 items-center rounded-xl px-2 text-[11px] font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-3 sm:text-xs">{tr("Anmelden", "Log in")}</button>}
          {onClose && <button type="button" onClick={onClose} aria-label={tr("Coach-Einführung schließen", "Close coach introduction")} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-white/62 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X className="h-4 w-4" /></button>}
        </div>
      </header>

      <section ref={stageRef} data-testid="coach-first-run-stage" className="relative z-10 mx-auto mt-4 flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mt-2 md:grid md:grid-cols-[minmax(230px,320px)_1fr] md:items-center md:gap-6 lg:grid-cols-[minmax(260px,360px)_1fr] lg:gap-10">
        <div className="relative z-20 order-2 mt-4 md:order-1 md:mt-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={scene.id} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }} transition={{ duration: reduceMotion ? 0.01 : 0.34, ease: [0.22, 1, 0.36, 1] }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-primary">{sceneCopy.eyebrow}</p>
              <h1 ref={headingRef} tabIndex={-1} className="mt-2 max-w-md text-[clamp(1.45rem,6vw,2.7rem)] font-semibold leading-[1.02] tracking-[-0.05em] outline-none lg:mt-4">{sceneCopy.title}</h1>
            </motion.div>
          </AnimatePresence>
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
            data-testid="coach-first-run-camera"
            data-camera-fit={cameraFit.toFixed(4)}
            className={cn("absolute inset-x-0 top-0", fitCameraToViewport && !isLast ? "bottom-12" : "bottom-0")}
          >
            {worldScreens.map((screen) => (
              <motion.div key={screen.id} className="absolute inset-0 flex items-center justify-center" animate={reduceMotion ? { x: 0, y: 0, scale: 0.9 * cameraFit, opacity: screen.id === scene.id ? 1 : 0 } : { x: (screen.x - scene.position.x) * sceneScale, y: (screen.y - scene.position.y) * sceneScale, scale: sceneScale, opacity: screen.id === scene.id ? 1 : 0.28 }} transition={reduceMotion ? { duration: 0.01 } : { type: "spring", stiffness: 74, damping: 19, mass: 0.82 }} aria-hidden={screen.id !== scene.id}>
                <CoachFirstRunSceneVisual sceneId={screen.id} invitation={invitation} invitationKind={invitationKind} />
              </motion.div>
            ))}
          </div>
          {!isLast && (
            <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#0B0C10]/80 px-3 py-2 backdrop-blur-xl" aria-label={`${tr("Schritt", "Step")} ${step + 1} ${tr("von", "of")} ${scenes.length}`}>
              {scenes.map((item, index) => <span key={item.id} aria-hidden="true" className="flex h-2 min-w-2 items-center justify-center"><span className={cn("block h-1.5 rounded-full transition-all", index === step ? "w-5 bg-primary" : "w-1.5 bg-white/18")} /></span>)}
            </div>
          )}
        </div>
      </section>

      <footer data-testid="coach-first-run-footer" className="relative z-30 mx-auto mt-4 w-full max-w-6xl shrink-0 md:mt-2">
        <div className="grid w-full grid-cols-[3rem_1fr] gap-3 md:ml-auto md:max-w-[650px]">
          <button type="button" onClick={() => goTo(step - 1)} disabled={step === 0} aria-label={tr("Zurück", "Back")} className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-white/62 disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ArrowLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => { if (isLast) { if (onComplete) onComplete(); else goTo(0); } else goTo(step + 1); }} className="flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-[#07110E] shadow-[0_16px_35px_-18px_rgba(46,173,137,0.78)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            {isLast ? <>{completionLabel ?? (onComplete ? invitation ? tr("Einladung fortsetzen", "Continue invitation") : tr("Zugang anfragen", "Request access") : tr("Vorschau erneut ansehen", "Replay preview"))}{onComplete ? <ArrowRight className="ml-2 h-4 w-4" /> : <RotateCcw className="ml-2 h-4 w-4" />}</> : <>{tr("Weiter", "Continue")}<ArrowRight className="ml-2 h-4 w-4" /></>}
          </button>
        </div>
      </footer>

      <div className="sr-only" aria-live="polite">{tr("Coach-Einführung Schritt", "Coach introduction step")} {step + 1} {tr("von", "of")} {scenes.length}: {sceneCopy.eyebrow}. {sceneCopy.title}</div>
    </main>
  );
};

export default CoachFirstRunExperience;
