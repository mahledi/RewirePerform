import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Flame,
  Home,
  LockKeyhole,
  Menu,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { BrandLockup, BrandSymbol } from "@/components/brand/BrandLogo";
import { cn } from "@/lib/utils";

type PreviewSection = "today" | "plan" | "progress" | "more";
type PreviewMode = "solo" | "team";

type Scene = {
  id: string;
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
    id: "daily",
    eyebrow: "Daily Flow",
    title: "Kurz einchecken. Klar in den Tag.",
    position: { x: 520, y: -90, scale: 1 },
  },
  {
    id: "anchor",
    eyebrow: "Vor deiner Einheit",
    title: "Dein Anker kommt im richtigen Moment zurück.",
    position: { x: 560, y: -790, scale: 1 },
  },
  {
    id: "journal",
    eyebrow: "Nach deinem Tag",
    title: "Drei Fragen. Privat festgehalten.",
    position: { x: -10, y: -940, scale: 1 },
  },
  {
    id: "development",
    eyebrow: "Deine Entwicklung",
    title: "Du siehst deine Wiederholungen, nicht eine Bewertung.",
    position: { x: -600, y: -690, scale: 0.96 },
  },
  {
    id: "team",
    eyebrow: "Solo oder im Team",
    title: "Der gleiche klare Ablauf – passend zu deinem Alltag.",
    position: { x: -650, y: 80, scale: 0.98 },
  },
  {
    id: "start",
    eyebrow: "Bereit",
    title: "Dein Weg beginnt mit dem ersten Tag.",
    position: { x: 0, y: 760, scale: 0.92 },
  },
];

const worldScreens = [
  { id: "today", x: 0, y: 0 },
  { id: "daily", x: 520, y: -90 },
  { id: "anchor", x: 560, y: -790 },
  { id: "journal", x: -10, y: -940 },
  { id: "development", x: -600, y: -690 },
  { id: "team", x: -650, y: 80 },
  { id: "start", x: 0, y: 760 },
] as const;

const MiniTopBar = ({ compact = false }: { compact?: boolean }) => (
  <div className="flex h-12 items-center justify-between border-b border-white/[0.055] px-4">
    <BrandLockup symbolSize={compact ? 18 : 20} textClassName="text-[10px] tracking-[-0.02em]" />
    <span className="rounded-full border border-primary/20 bg-primary/[0.08] px-2 py-1 text-[7px] font-semibold uppercase tracking-[0.14em] text-primary">
      Vorschau
    </span>
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
  labelledBy,
}: {
  children: ReactNode;
  active?: PreviewSection;
  className?: string;
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
    <MiniTopBar />
    <div className="relative h-[500px] overflow-hidden">{children}</div>
    <MiniBottomNav active={active} />
  </section>
);

const Ring = ({ value = 22 }: { value?: number }) => (
  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[conic-gradient(#2EAD89_0_39%,rgba(255,255,255,0.08)_39%_100%)]">
    <div className="absolute inset-[3px] rounded-full bg-[#111317]" />
    <div className="relative text-center">
      <p className="text-[15px] font-semibold leading-none">{value}</p>
      <p className="mt-0.5 text-[6px] uppercase tracking-[0.12em] text-white/40">von 56</p>
    </div>
  </div>
);

const TodayScreen = () => (
  <AppScreen labelledBy="preview-today-title">
    <div className="px-5 pt-5">
      <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-primary">Dienstag · Training</p>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] text-white/42">Hallo Noah</p>
          <h2 id="preview-today-title" className="mt-1 max-w-[210px] text-[26px] font-semibold leading-[1.02] tracking-[-0.045em]">
            Nächste Aktion.
          </h2>
        </div>
        <Ring />
      </div>
      <p className="mt-4 max-w-[270px] text-[10px] leading-4 text-white/48">
        Heute kehrst du nach jeder Unterbrechung direkt zur nächsten Handlung zurück.
      </p>

      <div className="mt-5 rounded-[20px] border border-primary/20 bg-primary/[0.08] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[#07110E]">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold">Daily Flow</p>
              <p className="mt-0.5 text-[8px] text-white/42">10 Tages-Puls-Fragen · 3 Aufgaben</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-primary" />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-white/45">Dein Tag</p>
        <span className="text-[8px] font-medium text-primary">Plan öffnen</span>
      </div>
      <div className="mt-2 overflow-hidden rounded-[18px] border border-white/[0.065] bg-white/[0.025]">
        {[
          { time: "Jetzt", title: "Daily Flow", icon: Sparkles, done: false },
          { time: "17:20", title: "Pre-Training", icon: Target, done: false },
          { time: "Abends", title: "Tagesjournal", icon: BookOpen, done: false },
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className={cn("flex h-[52px] items-center gap-3 px-3", index < 2 && "border-b border-white/[0.05]")}>
              <Icon className="h-3.5 w-3.5 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-[7px] uppercase tracking-[0.12em] text-white/32">{item.time}</p>
                <p className="mt-0.5 text-[10px] font-medium">{item.title}</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-white/24" />
            </div>
          );
        })}
      </div>
    </div>
  </AppScreen>
);

const PulseScale = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="mb-1.5 flex items-center justify-between text-[8px]">
      <span className="font-medium text-white/72">{label}</span>
      <span className="text-white/30">{value}/10</span>
    </div>
    <div className="grid grid-cols-10 gap-1">
      {Array.from({ length: 10 }, (_, index) => (
        <span
          key={index}
          className={cn("h-3 rounded-[3px]", index < value ? "bg-primary" : "bg-white/[0.07]")}
        />
      ))}
    </div>
  </div>
);

const DailyScreen = () => (
  <AppScreen labelledBy="preview-daily-title">
    <div className="border-b border-white/[0.055] px-4 py-3">
      <p className="text-[7px] font-medium uppercase tracking-[0.15em] text-white/35">Daily Flow · Training</p>
      <h2 id="preview-daily-title" className="mt-1 text-[12px] font-semibold">Tages-Puls</h2>
    </div>
    <div className="px-5 pt-5">
      <div className="flex items-center justify-between">
        <p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-primary">1 von 4</p>
        <p className="text-[8px] text-white/35">ca. 4 Minuten</p>
      </div>
      <h3 className="mt-3 text-[24px] font-semibold leading-[1.04] tracking-[-0.04em]">Wie kommst du heute an?</h3>
      <p className="mt-2 text-[9px] leading-4 text-white/42">Kurz auswählen. Es gibt hier kein richtig oder falsch.</p>

      <div className="mt-6 space-y-5 rounded-[20px] border border-white/[0.065] bg-white/[0.025] p-4">
        <PulseScale label="Energie" value={7} />
        <PulseScale label="Fokus" value={6} />
        <PulseScale label="Körperliche Bereitschaft" value={8} />
      </div>

      <div className="mt-5 rounded-[20px] border border-primary/20 bg-primary/[0.07] p-4">
        <p className="text-[7px] font-semibold uppercase tracking-[0.16em] text-primary">Heute im Fokus</p>
        <p className="mt-2 text-[13px] font-semibold">Fehler bindet Aufmerksamkeit.</p>
        <p className="mt-2 text-[9px] leading-4 text-white/48">
          Wenn dein Kopf am Ergebnis hängen bleibt, fehlt Fokus für die nächste Aktion.
        </p>
      </div>

      <div className="mt-4 flex h-11 items-center justify-center rounded-xl bg-primary text-[10px] font-semibold text-[#07110E]">
        Weiter
        <ArrowRight className="ml-2 h-3.5 w-3.5" />
      </div>
    </div>
  </AppScreen>
);

const AnchorScreen = () => (
  <AppScreen labelledBy="preview-anchor-title">
    <div className="flex h-full flex-col px-5 pt-7">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-primary/25 bg-primary/[0.10]">
        <Bell className="h-6 w-6 text-primary" />
      </div>
      <p className="mt-6 text-center text-[8px] font-semibold uppercase tracking-[0.18em] text-primary">17:20 · Vor deiner Einheit</p>
      <h2 id="preview-anchor-title" className="mx-auto mt-3 max-w-[250px] text-center text-[26px] font-semibold leading-[1.05] tracking-[-0.045em]">
        Dein Anker ist bereit.
      </h2>

      <div className="mt-7 rounded-[24px] border border-white/[0.075] bg-white/[0.028] p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[#07110E]">
            <Target className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[7px] uppercase tracking-[0.14em] text-white/34">Heute auf dem Platz</p>
            <p className="mt-1.5 text-[15px] font-semibold leading-tight">Blick hoch. Nächste Aktion.</p>
          </div>
        </div>
        <div className="mt-5 h-px bg-white/[0.06]" />
        <div className="mt-4 flex items-center justify-between text-[9px] text-white/42">
          <span>Training</span>
          <span>17:30</span>
        </div>
      </div>

      <div className="mt-5 flex h-12 items-center justify-center rounded-xl bg-primary text-[10px] font-semibold text-[#07110E]">
        Bereit fürs Training
      </div>
      <p className="mt-3 text-center text-[8px] text-white/30">Deine heutige Linse und drei konkrete Aufgaben.</p>
    </div>
  </AppScreen>
);

const JournalScreen = () => (
  <AppScreen labelledBy="preview-journal-title">
    <div className="px-5 pt-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[8px] font-semibold uppercase tracking-[0.17em] text-primary">Tagesjournal</p>
          <h2 id="preview-journal-title" className="mt-2 text-[25px] font-semibold leading-none tracking-[-0.045em]">Kurz festhalten.</h2>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.03]">
          <LockKeyhole className="h-4 w-4 text-primary" />
        </span>
      </div>
      <p className="mt-3 text-[9px] leading-4 text-white/43">Drei Fragen zu deinem Tag. Deine Antworten bleiben privat.</p>

      <div className="mt-5 space-y-3">
        {[
          "Wo ist dir die nächste Aktion gelungen?",
          "Was hat dich heute kurz festgehalten?",
          "Was nimmst du in die nächste Einheit mit?",
        ].map((question, index) => (
          <div key={question} className="rounded-[18px] border border-white/[0.065] bg-white/[0.025] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/[0.10] text-[8px] font-semibold text-primary">
                {index + 1}
              </span>
              <p className="pt-0.5 text-[10px] font-medium leading-4">{question}</p>
            </div>
            <div className="mt-3 h-8 rounded-lg border border-white/[0.055] bg-black/10 px-3 py-2 text-[8px] text-white/25">
              Deine Antwort …
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 text-[8px] text-white/32">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        Coaches sehen keine Journaltexte.
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

const TeamScreen = () => (
  <AppScreen labelledBy="preview-team-title" active="plan">
    <div className="px-5 pt-5">
      <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-primary">Teammodus</p>
      <h2 id="preview-team-title" className="mt-2 max-w-[280px] text-[26px] font-semibold leading-[1.02] tracking-[-0.045em]">Dein Plan bleibt verbunden.</h2>
      <p className="mt-3 text-[9px] leading-4 text-white/42">Termine vom Coach. Dein persönlicher Daily Flow.</p>

      <div className="mt-5 rounded-[22px] border border-white/[0.07] bg-white/[0.026] p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.10]">
            <Users className="h-4 w-4 text-primary" />
          </span>
          <div>
            <p className="text-[7px] uppercase tracking-[0.13em] text-white/32">Dein Team</p>
            <p className="mt-1 text-[12px] font-semibold">SV Nord · U17</p>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[20px] border border-white/[0.065] bg-white/[0.025]">
        {[
          { day: "Heute", time: "17:30", title: "Teamtraining", active: true },
          { day: "Donnerstag", time: "18:00", title: "Training", active: false },
          { day: "Samstag", time: "14:00", title: "Wettkampf", active: false },
        ].map((event, index) => (
          <div key={event.day} className={cn("flex h-[64px] items-center gap-3 px-4", index < 2 && "border-b border-white/[0.05]")}>
            <span className={cn("h-8 w-1 rounded-full", event.active ? "bg-primary" : "bg-white/[0.08]")} />
            <div className="min-w-0 flex-1">
              <p className={cn("text-[7px] uppercase tracking-[0.13em]", event.active ? "text-primary" : "text-white/28")}>
                {event.day} · {event.time}
              </p>
              <p className="mt-1 text-[10px] font-medium">{event.title}</p>
            </div>
            {event.active && <span className="rounded-full bg-primary/[0.10] px-2 py-1 text-[7px] font-medium text-primary">Dein Flow</span>}
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-[18px] border border-primary/15 bg-primary/[0.055] p-4">
        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <p className="text-[10px] font-semibold">Dein persönlicher Bereich bleibt deiner.</p>
          <p className="mt-1 text-[8px] leading-3.5 text-white/40">Journaltexte und freie Antworten sind für Coaches nicht sichtbar.</p>
        </div>
      </div>
    </div>
  </AppScreen>
);

const StartScreen = ({ mode }: { mode: PreviewMode }) => (
  <AppScreen labelledBy="preview-start-title">
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

      <div className="mt-7 grid w-full grid-cols-2 gap-3">
        <div className={cn(
          "rounded-[18px] border p-4 text-left",
          mode === "solo" ? "border-primary/35 bg-primary/[0.09]" : "border-white/[0.065] bg-white/[0.025]",
        )}>
          <Target className={cn("h-4 w-4", mode === "solo" ? "text-primary" : "text-white/35")} />
          <p className="mt-4 text-[11px] font-semibold">Solo</p>
          <p className="mt-1 text-[8px] text-white/35">Dein eigener Plan</p>
        </div>
        <div className={cn(
          "rounded-[18px] border p-4 text-left",
          mode === "team" ? "border-primary/35 bg-primary/[0.09]" : "border-white/[0.065] bg-white/[0.025]",
        )}>
          <Users className={cn("h-4 w-4", mode === "team" ? "text-primary" : "text-white/35")} />
          <p className="mt-4 text-[11px] font-semibold">Team</p>
          <p className="mt-1 text-[8px] text-white/35">Mit Teamcode</p>
        </div>
      </div>

      <div className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-[10px] font-semibold text-[#07110E]">
        Registrierung starten
        <ArrowRight className="ml-2 h-3.5 w-3.5" />
      </div>
      <p className="mt-4 text-[8px] font-medium text-primary">Schon registriert? Anmelden</p>
    </div>
  </AppScreen>
);

const FirstRunExperiencePreview = () => {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<PreviewMode>("solo");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cameraViewportRef = useRef<HTMLDivElement>(null);
  const scene = scenes[step];
  const isLast = step === scenes.length - 1;

  useEffect(() => {
    if (cameraViewportRef.current) {
      cameraViewportRef.current.scrollTop = 0;
      cameraViewportRef.current.scrollLeft = 0;
    }
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const goTo = (next: number) => setStep(Math.max(0, Math.min(scenes.length - 1, next)));

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#0D0E12] px-4 pb-[max(18px,env(safe-area-inset-bottom))] pt-[max(14px,env(safe-area-inset-top))] text-[#EEF0F2] sm:px-7">
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
        </div>
      </header>

      <section className="relative z-10 mx-auto mt-4 flex w-full max-w-6xl flex-1 flex-col md:mt-6 md:grid md:grid-cols-[minmax(230px,320px)_1fr] md:items-center md:gap-6 lg:grid-cols-[minmax(260px,360px)_1fr] lg:gap-10">
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

          {isLast && (
            <div className="mt-4 flex gap-2" role="group" aria-label="Programmweg auswählen">
              {(["solo", "team"] as const).map((item) => (
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
                  {item === "solo" ? "Solo" : "Team"}
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          ref={cameraViewportRef}
          className="relative order-1 mx-auto h-[min(64dvh,650px)] min-h-[430px] w-full max-w-[650px] overflow-clip rounded-[32px] border border-white/[0.065] bg-black/15 md:order-2 md:h-[min(76dvh,760px)]"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-[#0D0E12]/40 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-[#0D0E12]/35 to-transparent" />
          <div data-testid="first-run-camera" className="absolute inset-0">
            {worldScreens.map((screen) => (
              <motion.div
                key={screen.id}
                className="absolute inset-0 flex items-center justify-center"
                animate={reduceMotion
                  ? {
                      x: 0,
                      y: 0,
                      scale: 0.9,
                      opacity: screen.id === scene.id ? 1 : 0,
                    }
                  : {
                      x: (screen.x - scene.position.x) * scene.position.scale,
                      y: (screen.y - scene.position.y) * scene.position.scale,
                      scale: scene.position.scale,
                      opacity: screen.id === scene.id ? 1 : 0.28,
                    }}
                transition={reduceMotion
                  ? { duration: 0.01 }
                  : { type: "spring", stiffness: 74, damping: 19, mass: 0.82 }}
                aria-hidden={screen.id !== scene.id}
              >
                {screen.id === "today" && <TodayScreen />}
                {screen.id === "daily" && <DailyScreen />}
                {screen.id === "anchor" && <AnchorScreen />}
                {screen.id === "journal" && <JournalScreen />}
                {screen.id === "development" && <DevelopmentScreen />}
                {screen.id === "team" && <TeamScreen />}
                {screen.id === "start" && <StartScreen mode={mode} />}
              </motion.div>
            ))}
          </div>

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
        </div>
      </section>

      <footer className="relative z-30 mx-auto mt-4 grid w-full max-w-6xl grid-cols-[3rem_1fr] gap-3 md:max-w-[650px] md:self-end">
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
              goTo(0);
              return;
            }
            goTo(step + 1);
          }}
          className="flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-[#07110E] shadow-[0_16px_35px_-18px_rgba(46,173,137,0.78)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {isLast ? (
            <>
              Vorschau erneut ansehen
              <RotateCcw className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              Weiter
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </button>
      </footer>

      <div className="sr-only" aria-live="polite">
        Vorschau Schritt {step + 1} von {scenes.length}: {scene.eyebrow}. {scene.title}
      </div>
    </main>
  );
};

export default FirstRunExperiencePreview;
