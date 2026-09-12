import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Brain,
  Building2,
  Eye,
  LockKeyhole,
  Mic,
  Pause,
  ShieldCheck,
  Target,
  UserRound,
  UsersRound,
  Volume2,
} from "lucide-react";
import heroImage from "@/assets/hero-athlete.jpg";
import { BrandLockup, BrandSymbol } from "@/components/brand/BrandLogo";
import CoachFirstRunExperience, {
  CoachFirstRunSceneVisual,
  type CoachFirstRunSceneId,
} from "@/pages/CoachFirstRunExperience";
import FirstRunExperiencePreview, {
  AthleteFirstRunSceneVisual,
  type AthleteFirstRunSceneId,
} from "@/pages/FirstRunExperiencePreview";
import { cn } from "@/lib/utils";
import { APP_STORE_PRODUCT_URL } from "@/lib/appStore";
import { usePublicLanguage } from "@/contexts/PublicLanguageContext";
import { PublicLanguageSwitch } from "@/components/public/PublicLanguageSwitch";

type Flight = "athlete" | "coach" | null;
type DailyContext = "training" | "competition" | "rest";

const contextContent: Record<DailyContext, {
  label: string;
  eyebrow: string;
  title: string;
  copy: string;
}> = {
  training: {
    label: "Training",
    eyebrow: "In einer echten Wiederholung",
    title: "Im Training wird daraus eine Handlung.",
    copy: "Der Athlet erkennt den passenden Moment, führt eine klare Reaktion aus und kehrt direkt zu seiner sportlichen Aufgabe zurück.",
  },
  competition: {
    label: "Wettkampf",
    eyebrow: "Vor dem Wettkampf",
    title: "Im Wettkampf wird es kürzer.",
    copy: "Der Tagesfokus wird aktiv abgerufen und anschließend noch einmal klar sichtbar. Danach zählt nur die nächste beeinflussbare Aktion.",
  },
  rest: {
    label: "Ruhetag",
    eyebrow: "Geführte mentale Anwendung",
    title: "Am Ruhetag wird die Reaktion visualisiert.",
    copy: "Das System führt durch eine konkrete Sportszene. Der Athlet sieht sich so handeln, wie er es später wirklich tun möchte.",
  },
};

const englishContextContent: typeof contextContent = {
  training: {
    label: "Training",
    eyebrow: "In a real repetition",
    title: "In training, it becomes an action.",
    copy: "Athletes notice the right moment, make a clear response and return to their sporting task.",
  },
  competition: {
    label: "Competition",
    eyebrow: "Before competition",
    title: "In competition, it gets shorter.",
    copy: "The day's focus is actively recalled and then shown clearly again. After that, only the next controllable action matters.",
  },
  rest: {
    label: "Rest day",
    eyebrow: "Guided mental practice",
    title: "On a rest day, the response is visualised.",
    copy: "The system guides athletes through a concrete sports scene. They picture themselves responding as they want to in real life.",
  },
};

const FlightOverlay = ({ flight, onClose }: { flight: Exclude<Flight, null>; onClose: () => void }) => {
  const { tr } = usePublicLanguage();
  return (
  <motion.div
    role="dialog"
    aria-modal="true"
    aria-label={flight === "athlete" ? tr("Athleten-Einführung", "Athlete introduction") : tr("Coach-Einführung", "Coach introduction")}
    className="fixed inset-0 z-[100] bg-[#0D0E12]"
    initial={{ opacity: 0, scale: 0.99 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.99 }}
    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
  >
    {flight === "athlete" ? (
      <FirstRunExperiencePreview fitCameraToViewport onComplete={onClose} onClose={onClose} completionLabel={tr("Zurück zur Website", "Back to website")} />
    ) : (
      <CoachFirstRunExperience fitCameraToViewport onComplete={onClose} onClose={onClose} completionLabel={tr("Zurück zur Website", "Back to website")} />
    )}
  </motion.div>
  );
};

const DeviceShot = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("relative h-[521px] w-[294px] shrink-0 sm:h-[610px] sm:w-[344px]", className)}>
    <div className="absolute left-0 top-0 origin-top-left scale-[0.855] sm:scale-100">
      {children}
    </div>
  </div>
);

const AthleteShot = ({ sceneId, className }: { sceneId: AthleteFirstRunSceneId; className?: string }) => (
  <DeviceShot className={className}>
    <AthleteFirstRunSceneVisual sceneId={sceneId} />
  </DeviceShot>
);

const CoachShot = ({ sceneId, className }: { sceneId: CoachFirstRunSceneId; className?: string }) => (
  <DeviceShot className={className}>
    <CoachFirstRunSceneVisual sceneId={sceneId} />
  </DeviceShot>
);

const ProductLight = ({ className }: { className?: string }) => (
  <div className={cn("pointer-events-none absolute rounded-full bg-primary/[0.11] blur-[110px]", className)} />
);

const AppStoreLink = ({ compact = false }: { compact?: boolean }) => {
  const { tr } = usePublicLanguage();
  return (
  <a
    href={APP_STORE_PRODUCT_URL}
    target="_blank"
    rel="noreferrer"
    aria-label={tr("RewirePerform im App Store laden", "Download RewirePerform on the App Store")}
    className={cn(
      "group inline-flex min-h-11 items-center gap-3 rounded-2xl border border-white/[0.10] bg-white/[0.045] text-left text-white transition-all hover:border-white/20 hover:bg-white/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
      compact ? "px-3.5 py-2" : "px-4 py-3",
    )}
  >
    <img src="/app-icon-192.png" alt="" className={cn("shrink-0 rounded-[10px]", compact ? "h-7 w-7" : "h-10 w-10")} />
    <span className="min-w-0 leading-none">
      <span className="block text-[9px] font-medium text-white/42">{tr("Laden im", "Download on the")}</span>
      <span className={cn("mt-1 block font-semibold tracking-[-0.025em]", compact ? "text-xs" : "text-sm")}>App Store</span>
    </span>
    {!compact && <ArrowUpRight className="ml-2 h-4 w-4 text-white/38 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />}
  </a>
  );
};

const SectionHeading = ({
  eyebrow,
  title,
  children,
  id,
}: {
  eyebrow: string;
  title: ReactNode;
  children: ReactNode;
  id: string;
}) => (
  <div className="max-w-[620px]">
    <p className="text-xs font-medium tracking-[-0.01em] text-white/38 sm:text-sm">{eyebrow}</p>
    <h2 id={id} className="mt-4 text-[clamp(2.35rem,5.7vw,5.25rem)] font-semibold leading-[0.94] tracking-[-0.062em] text-white">
      {title}
    </h2>
    <div className="mt-6 max-w-[570px] space-y-4 text-[15px] leading-7 text-white/58 sm:text-base sm:leading-8">
      {children}
    </div>
  </div>
);

const ProductProof = ({
  children,
  label,
  className,
}: {
  children: ReactNode;
  label: string;
  className?: string;
}) => (
  <div aria-label={label} className={cn("relative mx-auto flex min-h-[580px] w-full max-w-[760px] items-center justify-center overflow-visible p-2 sm:min-h-[700px] sm:p-6", className)}>
    <ProductLight className="-top-24 left-1/2 h-[26rem] w-[28rem] -translate-x-1/2 opacity-80" />
    <div className="relative z-10 flex w-full items-center justify-center">{children}</div>
  </div>
);

const VisualizationShot = () => {
  const { tr } = usePublicLanguage();
  return (
  <DeviceShot>
    <section aria-label={tr("Geführte Ruhetag-Visualisierung", "Guided rest-day visualisation")} className="relative h-[610px] w-[344px] overflow-hidden rounded-[34px] border border-white/[0.09] bg-[#0D0E12] px-5 pb-5 pt-6 text-[#EEF0F2] shadow-[0_35px_100px_-36px_rgba(0,0,0,0.9),0_0_70px_-44px_rgba(46,173,137,0.7)]">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-80 -translate-x-1/2 rounded-full bg-primary/[0.13] blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-semibold text-white/46">{tr("Visualisierung · 2 von 3", "Visualisation · 2 of 3")}</p>
          <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[7px] font-semibold text-white/38">{tr("Ruhetag", "Rest day")}</span>
        </div>

        <div className="mt-6 text-center">
          <h3 className="text-[22px] font-semibold leading-7 tracking-[-0.035em]">{tr("Stell dir einen entscheidenden Fehler vor.", "Imagine a crucial mistake.")}</h3>
          <p className="mx-auto mt-3 max-w-[280px] text-[9px] leading-4 text-white/44">{tr("Du spürst Frust. Das Spiel oder die Einheit läuft bereits weiter.", "You feel frustrated. The game or session has already moved on.")}</p>
        </div>

        <div className="relative mx-auto mt-5 flex h-44 w-44 items-center justify-center">
          <div className="absolute inset-5 rounded-full bg-primary/[0.08] blur-2xl" />
          <svg className="relative h-44 w-44 -rotate-90" viewBox="0 0 176 176" aria-hidden="true">
            <circle cx="88" cy="88" r="76" fill="none" stroke="rgba(255,255,255,0.055)" strokeWidth="7" />
            <circle cx="88" cy="88" r="76" fill="none" stroke="#2EAD89" strokeLinecap="round" strokeWidth="7" strokeDasharray="477" strokeDashoffset="188" style={{ filter: "drop-shadow(0 0 10px rgba(46,173,137,0.3))" }} />
          </svg>
          <div className="absolute text-center">
            <p className="text-3xl font-semibold tabular-nums tracking-[-0.04em]">0:52</p>
            <p className="mt-1 text-[8px] font-semibold text-white/35">{tr("Augen geschlossen", "Eyes closed")}</p>
          </div>
        </div>

        <div className="mt-4 rounded-[22px] border border-primary/24 bg-primary/[0.08] p-4 text-center shadow-[0_0_34px_rgba(46,173,137,0.08)]">
          <p className="text-[8px] font-semibold text-primary">{tr("Dein Satz für heute", "Your phrase for today")}</p>
          <p className="mt-2 text-[20px] font-semibold tracking-[-0.03em]">{tr("Passiert. Nächste Aktion.", "It happened. Next action.")}</p>
          <p className="mt-2 text-[8px] leading-3.5 text-white/43">{tr("Sieh möglichst genau, wie du den Frust bemerkst und dich wieder der nächsten Aktion zuwendest.", "Picture as clearly as you can how you notice the frustration and turn to the next action.")}</p>
        </div>

        <div className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.075] bg-white/[0.025] text-[10px] font-semibold text-white/60">
          <Pause className="h-4 w-4 fill-current" /> {tr("Pausieren", "Pause")}
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 text-[8px] text-white/30">
          <Volume2 className="h-3.5 w-3.5 text-primary" /> {tr("Ein leiser Ton beendet den Abschnitt.", "A soft tone ends this section.")}
        </div>
      </div>
    </section>
  </DeviceShot>
  );
};

const PreTrainingRecallShot = ({ competition = false, initiallyRevealed = false }: { competition?: boolean; initiallyRevealed?: boolean }) => {
  const { tr } = usePublicLanguage();
  const [revealed, setRevealed] = useState(initiallyRevealed);
  return (
    <DeviceShot>
      <section aria-label={competition ? tr("Pre-Wettkampf mit aktivem Abruf", "Pre-competition with active recall") : tr("Pre-Training mit aktivem Abruf", "Pre-training with active recall")} className="relative h-[610px] w-[344px] overflow-hidden rounded-[34px] border border-white/[0.09] bg-[#0D0E12] px-5 pb-5 pt-6 text-[#EEF0F2] shadow-[0_35px_100px_-36px_rgba(46,173,137,0.7)]">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-80 -translate-x-1/2 rounded-full bg-primary/[0.12] blur-3xl" />
        <div className="relative">
          <p className="text-[9px] font-semibold text-white/46">{competition ? tr("Pre-Wettkampf", "Pre-competition") : "Pre-Training"}</p>
          <h3 className="mt-3 text-[24px] font-semibold tracking-[-0.04em]">{competition ? tr("Bereit für den Wettkampf", "Ready for competition") : tr("Bereit für die nächste Einheit", "Ready for the next session")}</h3>
          <p className="mt-2 text-[9px] leading-4 text-white/42">{tr("Erst selbst erinnern. Danach den heutigen Satz prüfen.", "Recall it yourself first. Then check today's phrase.")}</p>

          <div className="mt-5 rounded-[24px] border border-primary/15 bg-[#101514] p-4">
            <p className="text-[8px] font-semibold text-primary">{tr("Erst erinnern", "Recall first")}</p>
            <p className="mt-2 text-[16px] font-semibold leading-6">{tr("Was hilft dir nach einem Fehler, wieder bei der nächsten Aktion zu sein?", "What helps you return to the next action after a mistake?")}</p>
            <div className="mt-4 min-h-[72px] rounded-2xl border border-white/[0.075] bg-white/[0.025] px-3 py-3 text-[9px] text-white/25">{tr("Deine kurze Erinnerung …", "Your short reminder …")}</div>
            <button type="button" onClick={() => setRevealed(true)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-primary/45 bg-primary/[0.055] text-[10px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <Eye className="h-3.5 w-3.5" /> {tr("Erinnerung prüfen", "Check recall")}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {revealed && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-[22px] border border-primary/25 bg-primary/[0.10] p-5 text-center shadow-[0_0_34px_rgba(46,173,137,0.10)]">
                <p className="text-[8px] font-semibold text-primary">{tr("Dein Satz für heute", "Your phrase for today")}</p>
                <p className="mt-3 text-[23px] font-semibold tracking-[-0.035em]">{tr("Passiert. Nächste Aktion.", "It happened. Next action.")}</p>
                <p className="mt-2 text-[9px] leading-4 text-white/48">{tr("Nimm den Fehler wahr und richte deine Aufmerksamkeit auf das, was du jetzt beeinflussen kannst.", "Notice the mistake and focus on what you can influence now.")}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </DeviceShot>
  );
};

const TrainingMissionShot = () => {
  const { tr, language } = usePublicLanguage();
  return (
  <DeviceShot>
    <section aria-label={tr("Trainingsmission", "Training mission")} className="relative h-[610px] w-[344px] overflow-hidden rounded-[34px] border border-white/[0.09] bg-[#0D0E12] px-5 pb-5 pt-6 text-[#EEF0F2] shadow-[0_35px_100px_-36px_rgba(0,0,0,0.9),0_0_70px_-44px_rgba(46,173,137,0.7)]">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-80 -translate-x-1/2 rounded-full bg-primary/[0.12] blur-3xl" />
      <div className="relative">
        <p className="text-[9px] font-semibold text-white/46">{tr("Training · Deine Mission", "Training · Your mission")}</p>
        <h3 className="mt-3 text-[25px] font-semibold tracking-[-0.04em]">{tr("Eine Reaktion, die du heute wirklich übst.", "A response you actually practise today.")}</h3>
        <p className="mt-3 text-[9px] leading-4 text-white/42">{tr("Die Schritte gehören zusammen. Sie führen zu einer klaren Handlung in einer echten Trainingsszene.", "The steps work together. They lead to one clear action in a real training moment.")}</p>
        <div className="mt-6 rounded-[24px] border border-white/[0.075] bg-white/[0.028] p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary"><Target className="h-4 w-4" /></span>
            <div><p className="text-[8px] text-white/35">{tr("Heute im Fokus", "Today's focus")}</p><p className="mt-1 text-[12px] font-semibold">{tr("Nach einem Fehler zurück zur nächsten Aktion", "Return to the next action after a mistake")}</p></div>
          </div>
          <div className="mt-5 space-y-3">
            {(language === "en" ? ["Notice that your mind is still on the mistake.", "Tell yourself: It happened. Next action.", "Turn your attention to the task in front of you."] : ["Bemerke, dass dein Kopf noch beim Fehler ist.", "Sag dir: Passiert. Nächste Aktion.", "Richte deinen Blick auf deine aktuelle Aufgabe."]).map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[9px] font-semibold text-primary">{index + 1}</span>
                <p className="text-[10px] leading-4 text-white/70">{step}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 flex h-12 items-center justify-center rounded-2xl bg-primary text-[10px] font-semibold text-[#07110E]">{tr("Mission verstanden", "Mission understood")}</div>
      </div>
    </section>
  </DeviceShot>
  );
};

const LearningLoopShot = () => {
  const { tr, language } = usePublicLanguage();
  return (
  <DeviceShot>
    <section aria-label={tr("Verbundener Tagesablauf", "Connected daily routine")} className="relative h-[610px] w-[344px] overflow-hidden rounded-[34px] border border-white/[0.09] bg-[#0D0E12] px-5 pb-5 pt-6 text-[#EEF0F2] shadow-[0_35px_100px_-36px_rgba(0,0,0,0.9),0_0_70px_-44px_rgba(46,173,137,0.7)]">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-80 -translate-x-1/2 rounded-full bg-primary/[0.12] blur-3xl" />
      <div className="relative">
        <p className="text-[9px] font-semibold text-white/46">{tr("Ein Fokus · mehrere Abrufe", "One focus · several recalls")}</p>
        <h3 className="mt-3 text-[25px] font-semibold tracking-[-0.04em]">{tr("Was wichtig ist, taucht gezielt erneut auf.", "What matters returns deliberately.")}</h3>
        <div className="mt-6 space-y-3">
          {(language === "en" ? [
            { icon: Brain, label: "Understand in Daily Flow", copy: "Why your mind can stay stuck on a mistake." },
            { icon: Eye, label: "Recall before the session", copy: "It happened. Next action." },
            { icon: Target, label: "Apply it in sport", copy: "Notice the mistake and return to the current task." },
            { icon: Mic, label: "Reflect in the evening", copy: "Actively revisit a real moment." },
          ] : [
            { icon: Brain, label: "Im Daily Flow verstehen", copy: "Warum der Kopf nach einem Fehler hängen bleibt." },
            { icon: Eye, label: "Vor der Einheit erinnern", copy: "Passiert. Nächste Aktion." },
            { icon: Target, label: "Im Sport anwenden", copy: "Den Fehler bemerken und zur aktuellen Aufgabe zurückkehren." },
            { icon: Mic, label: "Am Abend reflektieren", copy: "Eine echte Szene noch einmal aktiv abrufen." },
          ]).map(({ icon: Icon, label, copy }, index) => (
            <div key={label} className="relative flex gap-3 rounded-[20px] border border-white/[0.065] bg-white/[0.028] p-3.5">
              {index < 3 && <span className="absolute -bottom-3 left-[29px] h-3 w-px bg-primary/25" />}
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
              <div><p className="text-[10px] font-semibold">{label}</p><p className="mt-1 text-[8px] leading-3.5 text-white/40">{copy}</p></div>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-primary/18 bg-primary/[0.06] p-3 text-center text-[9px] leading-4 text-white/54">{tr("Der Inhalt bleibt verbunden. Die Situation und die Art des Abrufs verändern sich.", "The content stays connected. The situation and the way you recall it change.")}</div>
      </div>
    </section>
  </DeviceShot>
  );
};

const ContextShowcase = () => {
  const [context, setContext] = useState<DailyContext>("training");
  const { tr, language } = usePublicLanguage();
  const localizedContent = language === "en" ? englishContextContent : contextContent;
  const content = localizedContent[context];

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:gap-14">
      <div>
        <p className="mb-3 text-xs font-medium text-white/36">{tr("Wähle eine Tagesform", "Choose a daily context")}</p>
        <div className="grid w-full max-w-[440px] grid-cols-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-1.5" aria-label={tr("Tageskontext auswählen", "Choose a daily context")}>
          {(Object.keys(contextContent) as DailyContext[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setContext(key)}
              aria-pressed={context === key}
              className={cn(
                "min-h-11 rounded-xl px-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-4",
                context === key ? "bg-primary text-[#07110E] shadow-[0_12px_30px_-18px_rgba(46,173,137,0.9)]" : "text-white/42 hover:text-white/72",
              )}
            >
              {localizedContent[key].label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={context}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mt-8"
          >
            <p className="text-xs font-medium text-white/38">{content.eyebrow}</p>
            <h3 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.045em] sm:text-4xl">{content.title}</h3>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-white/52">{content.copy}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <ProductProof label={`${tr("Tagesform", "Daily context")} ${content.label}`} className="min-h-[600px] sm:min-h-[700px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={context}
            initial={{ opacity: 0, scale: 0.975, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.985, y: -8 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {context === "training" && <TrainingMissionShot />}
            {context === "competition" && <PreTrainingRecallShot competition initiallyRevealed />}
            {context === "rest" && <VisualizationShot />}
          </motion.div>
        </AnimatePresence>
      </ProductProof>
    </div>
  );
};

const PrincipleRow = ({
  index,
  title,
  copy,
  visual,
  reverse = false,
}: {
  index: string;
  title: ReactNode;
  copy: string;
  visual: ReactNode;
  reverse?: boolean;
}) => (
  <motion.article
    initial={{ opacity: 0, y: 32 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
    className="grid items-center gap-8 py-12 lg:grid-cols-2 lg:gap-16 lg:py-16"
  >
    <div className={cn("max-w-xl", reverse && "lg:order-2")}>
      <p className="text-xs font-medium text-white/34">{index}</p>
      <h3 className="mt-4 text-[clamp(2.25rem,4.2vw,4.6rem)] font-semibold leading-[0.96] tracking-[-0.055em]">{title}</h3>
      <p className="mt-6 text-[15px] leading-7 text-white/54 sm:text-base sm:leading-8">{copy}</p>
    </div>
    <div className={cn("relative flex min-h-[520px] items-center justify-center overflow-visible px-2 py-6 sm:min-h-[620px] sm:px-8", reverse && "lg:order-1")}>
      <ProductLight className="-top-20 left-1/2 h-[24rem] w-[26rem] -translate-x-1/2 opacity-75" />
      <div className="relative z-10">{visual}</div>
    </div>
  </motion.article>
);

const WebsiteGoldenPagePreview = () => {
  const { tr, language } = usePublicLanguage();
  const reduced = Boolean(useReducedMotion());
  const heroRef = useRef<HTMLElement>(null);
  const rolesRef = useRef<HTMLElement>(null);
  const systemRef = useRef<HTMLElement>(null);
  const [flight, setFlight] = useState<Flight>(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroCopyY = useTransform(heroProgress, [0, 1], reduced ? [0, 0] : [0, -52]);
  const heroImageY = useTransform(heroProgress, [0, 1], reduced ? [0, 0] : [0, 70]);
  const heroOpacity = useTransform(heroProgress, [0, 0.72, 1], [1, 1, 0]);

  useEffect(() => {
    const root = document.getElementById("root");
    const nodes = [document.documentElement, document.body, root].filter((node): node is HTMLElement => Boolean(node));
    const previousOverflowX = nodes.map((node) => node.style.overflowX);
    nodes.forEach((node) => { node.style.overflowX = "clip"; });
    return () => nodes.forEach((node, index) => { node.style.overflowX = previousOverflowX[index]; });
  }, []);

  useEffect(() => {
    if (!flight) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setFlight(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      trigger?.focus();
    };
  }, [flight]);

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => ref.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });

  return (
    <main className="relative bg-[#060709] text-[#EEF0F2] selection:bg-primary/30">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.055] bg-[#08090B]/82 backdrop-blur-2xl">
        <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <span className="sm:hidden" aria-label="RewirePerform"><BrandSymbol size={28} /></span>
          <span className="hidden sm:block"><BrandLockup symbolSize={26} textClassName="text-[13px] tracking-[-0.02em]" /></span>
          <div className="flex items-center gap-2 sm:gap-3">
            <button type="button" onClick={() => scrollTo(rolesRef)} className="flex min-h-11 items-center rounded-full border border-white/[0.09] bg-white/[0.045] px-4 text-xs font-semibold text-white/78 transition-all hover:border-primary/35 hover:bg-primary/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              {tr("System erleben", "Explore the system")}
            </button>
            <PublicLanguageSwitch />
          </div>
        </div>
      </header>

      <section ref={heroRef} className="relative flex min-h-[100svh] items-end overflow-hidden px-5 pb-14 pt-28 sm:px-8 sm:pb-20 lg:px-12" aria-labelledby="golden-hero-title">
        <motion.div style={{ y: heroImageY }} className="absolute inset-0">
          <img src={heroImage} alt={tr("Athlet in konzentrierter Vorbereitung", "Athlete preparing with focus")} className="h-full w-full object-cover object-[64%_center] opacity-55" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#060709_5%,rgba(6,7,9,0.94)_35%,rgba(6,7,9,0.42)_72%,rgba(6,7,9,0.76)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060709] via-transparent to-[#060709]/72" />
        </motion.div>
        <div className="pointer-events-none absolute -left-36 top-24 h-[34rem] w-[34rem] rounded-full bg-primary/[0.07] blur-[130px]" />

        <motion.div style={{ y: heroCopyY, opacity: heroOpacity }} className="relative mx-auto grid w-full max-w-[1440px] items-end gap-10 lg:grid-cols-[1fr_0.72fr]">
          <div className="relative z-10 max-w-[900px]">
            <p className="text-xs font-medium text-white/46 sm:text-sm">{tr("Mentale Performance · täglich trainiert", "Mental performance · trained daily")}</p>
            <h1 id="golden-hero-title" className="mt-5 text-[clamp(3.35rem,7.5vw,7.4rem)] font-semibold leading-[0.88] tracking-[-0.072em]">
              {tr("Trainiere das System", "Train the system")}
              <span className="mt-[0.14em] block text-primary">{tr("hinter deiner Performance.", "behind your performance.")}</span>
            </h1>
            <p className="mt-7 max-w-[680px] text-base leading-7 text-white/64 sm:text-lg sm:leading-8">
              {tr("RewirePerform bringt mentale Fähigkeiten aus einzelnen Gesprächen in eine klare tägliche Praxis – für Athleten, Coaches und Teams.", "RewirePerform turns mental skills into a clear daily practice for athletes, coaches and teams.")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="/auth?mode=signup&intent=solo" className="group flex min-h-[52px] items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-[#07110E] shadow-[0_18px_45px_-22px_rgba(46,173,137,0.95)] transition-transform hover:scale-[1.012] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                {tr("Als Athlet starten", "Start as an athlete")} <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <button type="button" onClick={() => scrollTo(systemRef)} className="flex min-h-[52px] items-center justify-center rounded-2xl border border-white/[0.10] bg-black/20 px-6 text-sm font-semibold text-white/76 backdrop-blur-xl transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {tr("System verstehen", "Understand the system")} <ArrowDown className="ml-2 h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              <a
                href="/auth?mode=login"
                data-testid="public-login-cta"
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full border border-primary/35 bg-primary/[0.10] px-5 text-sm font-semibold shadow-[0_12px_30px_-20px_rgba(46,173,137,0.9)] transition-all hover:border-primary/55 hover:bg-primary/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="text-white/58">{tr("Bereits registriert?", "Already registered?")}</span>
                <span className="text-primary">{tr("Anmelden", "Log in")}</span>
              </a>
              <AppStoreLink compact />
            </div>
          </div>

          <div className="relative hidden h-[580px] items-end justify-center lg:flex">
            <ProductLight className="bottom-4 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2" />
            <motion.div initial={reduced ? false : { opacity: 0, y: 30, rotate: 2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }} className="relative origin-bottom scale-[0.9]">
              <AthleteShot sceneId="today" />
            </motion.div>
          </div>
        </motion.div>
      </section>

      <section ref={systemRef} className="relative px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24" aria-labelledby="why-title">
        <div className="mx-auto grid w-full max-w-[1380px] items-center gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow={tr("01 · Warum RewirePerform existiert", "01 · Why RewirePerform exists")} title={<>{tr("Mentale Leistung", "Mental performance")} <span className="text-primary">{tr("systematisch trainieren.", "trained systematically.")}</span></>} id="why-title">
            <p>{tr("Technik, Taktik und Athletik werden geplant, wiederholt und begleitet. Der Umgang mit Fokusverlust, Fehlern, Druck und Selbstzweifeln häufig nicht.", "Technique, tactics and physical training are planned, repeated and supported. Dealing with lost focus, mistakes, pressure and self-doubt often is not.")}</p>
            <p>{tr("RewirePerform macht daraus eine tägliche Trainingspraxis: kurz genug für den Alltag, klar genug für die nächste Handlung und verbunden über 56 Tage.", "RewirePerform makes this a daily training practice: short enough for everyday life, clear enough for the next action and connected across 56 days.")}</p>
          </SectionHeading>
          <ProductProof label={tr("Echter Daily Flow", "Real Daily Flow")}>
            <AthleteShot sceneId="science" />
          </ProductProof>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#090B0E] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24" aria-labelledby="architecture-title">
        <ProductLight className="-right-64 top-1/3 h-[38rem] w-[38rem]" />
        <div className="relative mx-auto grid w-full max-w-[1380px] items-center gap-12 lg:grid-cols-[1.12fr_0.88fr] lg:gap-20">
          <div className="relative order-2 flex min-h-[600px] items-center justify-center lg:order-1 sm:min-h-[720px]">
            <motion.div initial={{ opacity: 0, y: 35 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.58, delay: 0.08 }} className="relative z-10 xl:translate-x-16">
              <AthleteShot sceneId="development" />
            </motion.div>
          </div>
          <div className="order-1 lg:order-2">
            <SectionHeading eyebrow={tr("02 · Das 56-Tage-System", "02 · The 56-day system")} title={<>{tr("Nicht 56 einzelne Tipps.", "Not 56 separate tips.")} <span className="text-primary">{tr("Ein Lernweg.", "One learning journey.")}</span></>} id="architecture-title">
              <p>{tr("Die 56 Tage sind als zusammenhängende Lernstrecke geplant. Themen werden eingeführt, später aus einer anderen Perspektive vertieft und mit bereits Bekanntem verbunden.", "The 56 days form a connected learning journey. Topics are introduced, revisited from another angle and linked with what you already know.")}</p>
              <p>{tr("Jeder Tag hat eine eigene Aufgabe, aber keine isolierte Botschaft. So bleibt das Programm abwechslungsreich, ohne ständig neue mentale Regeln zu erzeugen.", "Each day has its own task, but not an isolated message. The programme stays varied without constantly adding new mental rules.")}</p>
            </SectionHeading>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {(language === "en" ? ["Understand", "Recognise", "Use independently"] : ["Verstehen", "Wiedererkennen", "Selbstständig nutzen"]).map((label, index) => (
                <div key={label} className="rounded-2xl border border-white/[0.065] bg-white/[0.025] p-4">
                  <p className="text-[9px] font-semibold text-white/30">0{index + 1}</p>
                  <p className="mt-3 text-sm font-semibold text-white/74">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24" aria-labelledby="brain-title">
        <ProductLight className="-left-52 top-1/3 h-[36rem] w-[36rem] opacity-70" />
        <div className="relative mx-auto grid w-full max-w-[1380px] items-center gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
          <div>
            <SectionHeading eyebrow={tr("03 · Die wissenschaftliche Grundlage", "03 · The scientific basis")} title={<>{tr("Mentale Fähigkeiten sind trainierbar.", "Mental skills can be trained.")} <span className="text-primary">{tr("Weil dein Gehirn lernt.", "Because your brain learns.")}</span></>} id="brain-title">
              <p>{tr("Dein Gehirn passt sich an das an, was du aufmerksam wiederholst, selbst erinnerst und in echten Situationen nutzt.", "Your brain adapts to what you repeat with attention, actively recall and use in real situations.")}</p>
              <p>{tr("Aus einem hilfreichen Gedanken wird nicht automatisch eine stabile Reaktion. Die wiederholte Auseinandersetzung kann den Zugriff darauf leichter machen, wenn es im Sport darauf ankommt.", "A helpful thought does not automatically become a reliable response. Repeated practice may make it easier to access when it matters in sport.")}</p>
            </SectionHeading>
            <div className="mt-8 flex items-start gap-3 rounded-[22px] border border-primary/16 bg-primary/[0.05] p-4 text-sm leading-6 text-white/52">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/18 bg-primary/[0.08] text-primary"><Brain className="h-4 w-4" /></span>
              <p><span className="font-semibold text-white/72">{tr("Die Grundlage:", "The foundation:")}</span> {tr("Sportpsychologie, Lernforschung und Neurowissenschaft – übersetzt in einen täglichen Ablauf.", "Sport psychology, learning science and neuroscience, translated into a daily routine.")}</p>
            </div>
          </div>
          <ProductProof label={tr("Lernmechanismus im täglichen Ablauf", "Learning mechanism in the daily routine")}>
            <LearningLoopShot />
          </ProductProof>
        </div>
      </section>

      <section className="relative px-5 pb-6 sm:px-8 lg:px-12" aria-label={tr("So erscheint das System im Produkt", "How the system appears in the product")}>
        <div className="mx-auto max-w-[1380px]">
          <PrincipleRow index={tr("01 · Aufmerksamkeit", "01 · Attention")} title={<>{tr("Ein klarer Fokus für", "A clear focus for")} <span className="text-primary">{tr("die nächste Handlung.", "the next action.")}</span></>} copy={tr("Der Daily Flow reduziert konkurrierende Gedanken auf eine konkrete mentale Richtung. Der Athlet weiß, worauf er im entscheidenden Moment zurückkommen kann.", "The Daily Flow turns competing thoughts into one concrete mental direction. Athletes know what to return to at the decisive moment.")} visual={<TrainingMissionShot />} reverse />
          <PrincipleRow index={tr("02 · Aktiver Abruf", "02 · Active recall")} title={<>{tr("Erst selbst erinnern.", "Recall it yourself first.")} <span className="text-primary">{tr("Dann prüfen.", "Then check.")}</span></>} copy={tr("Vor Training oder Wettkampf formuliert der Athlet zuerst selbst, was heute wichtig ist. Erst danach erscheint der große Satz – als klare Vorbereitung auf die Einheit.", "Before training or competition, athletes first put today's focus into their own words. Only then does the key phrase appear as clear preparation for the session.")} visual={<PreTrainingRecallShot />} />
          <PrincipleRow index={tr("03 · Visualisierung", "03 · Visualisation")} title={<>{tr("Am Ruhetag", "On a rest day,")} <span className="text-primary">{tr("mental ausführen.", "rehearse it mentally.")}</span></>} copy={tr("Das System führt durch eine leicht verständliche Sportszene. Der Athlet sieht möglichst konkret, wie er den Tagesfokus in einer passenden Reaktion umsetzt.", "The system guides athletes through an easy-to-follow sports scene. They imagine as concretely as possible how to apply the day's focus in a fitting response.")} visual={<VisualizationShot />} reverse />
        </div>
      </section>

      <section className="relative bg-[#090B0E] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24" aria-labelledby="context-title">
        <div className="mx-auto max-w-[1380px]">
          <SectionHeading eyebrow={tr("04 · Ein Lernziel in drei Tagesformen", "04 · One goal in three daily contexts")} title={<>{tr("Der Fokus bleibt.", "The focus stays the same.")} <span className="text-primary">{tr("Die Anwendung verändert sich.", "The application changes.")}</span></>} id="context-title">
            <p>{tr("Training, Wettkampf und Ruhetag erhalten keinen beliebigen neuen Inhalt. Der Tageskontext verändert die Ausführung desselben Lernziels.", "Training, competition and rest days do not introduce random new content. The daily context changes how the same learning goal is applied.")}</p>
          </SectionHeading>
          <div className="mt-14"><ContextShowcase /></div>
        </div>
      </section>

      <section className="relative px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24" aria-labelledby="journal-title">
        <div className="mx-auto grid w-full max-w-[1380px] items-center gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20">
          <SectionHeading eyebrow={tr("05 · Reflexion und Journal", "05 · Reflection and journal")} title={<>{tr("Erleben. Erinnern.", "Experience. Recall.")} <span className="text-primary">{tr("Festigen.", "Reinforce.")}</span></>} id="journal-title">
            <p>{tr("Im Journal blickt der Athlet auf eine konkrete Szene zurück: Was ist passiert, wie hat er reagiert und was nimmt er daraus mit?", "In the journal, athletes revisit a specific moment: What happened, how did they respond, and what will they take from it?")}</p>
            <p>{tr("Die Fragen erscheinen nacheinander und können getippt oder frei eingesprochen werden. Antworten lassen sich anschließend bearbeiten und bleiben privat.", "Questions appear one at a time. Answers can be typed or spoken, edited afterwards and remain private.")}</p>
            <div className="flex items-center gap-3 pt-2 text-sm text-white/48"><span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/18 bg-primary/[0.07] text-primary"><Mic className="h-4 w-4" /></span> {tr("Tippen oder frei einsprechen. Das Journal bleibt privat.", "Type or speak freely. Your journal stays private.")}</div>
          </SectionHeading>
          <ProductProof label={tr("Privates Journal", "Private journal")}>
            <AthleteShot sceneId="journal" />
          </ProductProof>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#090B0E] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24" aria-labelledby="coach-title">
        <ProductLight className="-left-56 top-1/3 h-[38rem] w-[38rem]" />
        <div className="relative mx-auto max-w-[1380px]">
          <div className="grid items-center gap-12 lg:grid-cols-[0.86fr_1.14fr] lg:gap-20">
            <SectionHeading eyebrow={tr("06 · Das Coach-System", "06 · The coach system")} title={<>{tr("Das Team verstehen.", "Understand the team.")} <span className="text-primary">{tr("Nicht kontrollieren.", "Do not monitor individuals.")}</span></>} id="coach-title">
              <p>{tr("Coaches sehen Teilnahme, Tagesfokus und aggregierte Teamzustände. Dadurch können sie den mentalen Schwerpunkt in Training und Kommunikation aufgreifen.", "Coaches see participation, the daily focus and aggregated team signals. This helps them carry the mental focus into training and communication.")}</p>
              <p>{tr("Private Journale, Freitexte, einzelne Check-in-Antworten und individuelle psychologische Werte bleiben geschützt.", "Private journals, free-text responses, individual check-in answers and individual psychological scores remain protected.")}</p>
              <div className="mt-3 flex items-start gap-3 rounded-2xl border border-primary/18 bg-primary/[0.055] p-4 text-sm leading-6 text-white/56"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {tr("Orientierung für Coaches entsteht ohne Zugriff auf private Gedanken.", "Coaches get guidance without access to private thoughts.")}</div>
            </SectionHeading>
            <div>
              <ProductProof label={tr("Coach Console als freigegebene Zielansicht", "Coach Console example view")}>
                <div className="relative flex w-full items-center justify-center">
                  <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 0.52, x: 0 }} viewport={{ once: true }} className="absolute right-[2%] hidden scale-[0.82] xl:block"><CoachShot sceneId="privacy" /></motion.div>
                  <div className="relative z-10 xl:-translate-x-20"><CoachShot sceneId="console" /></div>
                </div>
              </ProductProof>
              <p className="mx-auto mt-2 max-w-xl text-center text-xs leading-5 text-white/28">{tr("Beispielansicht mit realen Coach-Funktionen. Private Inhalte bleiben geschützt.", "Example view showing real coach features. Private content stays protected.")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24" aria-labelledby="evidence-title">
        <div className="mx-auto max-w-[1380px]">
          <div className="grid items-start gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
            <div className="lg:sticky lg:top-28">
              <SectionHeading eyebrow={tr("07 · Entwicklung und Orientierung", "07 · Progress and context")} title={<>{tr("Entwicklung sichtbar machen.", "Make progress visible.")} <span className="text-primary">{tr("Den Alltag einordnen.", "Put daily practice in context.")}</span></>} id="evidence-title">
                <p>{tr("Start-, Zwischen- und Abschlussmessung, Programmaktivität und Verständnis ergeben einen nachvollziehbaren Verlauf.", "Start, midpoint and end measurements, programme activity and understanding form a traceable picture over time.")}</p>
                <p>{tr("Dieser Verlauf beschreibt Nutzung und Selbstauskünfte – keine Bewertung der Person und keinen automatischen Wirksamkeitsbeweis. Er hilft Athleten und Coaches, den nächsten Schritt sinnvoll einzuordnen.", "This picture describes use and self-reports, not a judgement of the person or automatic proof of effectiveness. It helps athletes and coaches put the next step in context.")}</p>
              </SectionHeading>
              <div className="mt-8 flex flex-wrap gap-2">
                {(language === "en" ? ["Pre · Mid · Post", "Activity", "Understanding", "Progress"] : ["Pre · Mid · Post", "Aktivität", "Verständnis", "Entwicklung"]).map((label) => <span key={label} className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[10px] font-semibold text-white/44">{label}</span>)}
              </div>
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="relative flex min-h-[580px] items-start justify-center overflow-visible px-4 pt-10 sm:min-h-[700px] sm:px-6"><ProductLight className="-top-24 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 opacity-75" /><div className="relative z-10"><AthleteShot sceneId="measurement" /></div></div>
              <div className="relative overflow-visible p-2 sm:p-5"><ProductLight className="-top-24 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 opacity-70" /><div className="relative z-10"><p className="mb-5 text-sm font-medium text-white/44">{tr("Dein Verlauf verbindet Start, Alltag und Abschluss – ohne dich auf eine Zahl zu reduzieren.", "Your progress connects the start, daily practice and the finish, without reducing you to a number.")}</p><AthleteShot sceneId="development" /></div></div>
            </div>
          </div>
        </div>
      </section>

      <section ref={rolesRef} className="relative overflow-hidden bg-[#090B0E] px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28" aria-labelledby="experience-title">
        <ProductLight className="left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 opacity-55" />
        <div className="relative mx-auto w-full max-w-[1100px] text-center">
          <p className="text-sm font-medium text-white/40">{tr("08 · Das System aus deiner Rolle erleben", "08 · Explore the system for your role")}</p>
          <h2 id="experience-title" className="mx-auto mt-5 max-w-5xl text-[clamp(2.8rem,6vw,5.9rem)] font-semibold leading-[0.92] tracking-[-0.064em]">
            {tr("Der Überblick ist klar.", "You have seen the overview.")} <span className="block text-primary">{tr("Jetzt wird das Produkt persönlich.", "Now make it personal.")}</span>
          </h2>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-white/50 sm:text-lg">{tr("Erlebe den echten Einstieg für Athleten oder Coaches – mit den Oberflächen und Funktionen, die in der App bereitstehen.", "Try the real athlete or coach introduction, with screens and features available in the app.")}</p>

          <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
            {[
              { id: "athlete" as const, icon: UserRound, title: tr("Als Athlet erleben", "Explore as an athlete"), copy: tr("Daily Flow, Pre-Training, Journal und Entwicklung.", "Daily Flow, pre-training, journal and progress.") },
              { id: "coach" as const, icon: UsersRound, title: tr("Als Coach erleben", "Explore as a coach"), copy: tr("Teamüberblick, Tagesfokus, Reviews und Datenschutz.", "Team overview, daily focus, reviews and privacy.") },
            ].map(({ id, icon: Icon, title, copy }) => (
              <motion.button key={id} type="button" onClick={() => setFlight(id)} whileTap={reduced ? undefined : { scale: 0.99 }} className="group relative min-h-[220px] overflow-hidden rounded-[30px] border border-white/[0.085] bg-white/[0.028] p-6 text-left transition-all hover:-translate-y-1 hover:border-primary/30 hover:bg-primary/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <ProductLight className="-right-20 -top-20 h-52 w-52 transition-opacity group-hover:opacity-100" />
                <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.10] text-primary"><Icon className="h-5 w-5" /></span>
                <p className="relative mt-8 text-2xl font-semibold tracking-[-0.04em]">{title}</p>
                <p className="relative mt-2 max-w-xs text-sm leading-6 text-white/42">{copy}</p>
                <ArrowRight className="absolute bottom-6 right-6 h-5 w-5 text-primary transition-transform group-hover:translate-x-1" />
              </motion.button>
            ))}
          </div>

          <div className="mx-auto mt-8 flex max-w-xl items-start justify-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs leading-5 text-white/36">{tr("Interaktive Produktvorschau mit gekennzeichneten Beispieldaten.", "Interactive product preview with labelled example data.")}</p>
          </div>

          <div className="mx-auto mt-14 max-w-5xl pt-10 text-left sm:mt-16 sm:pt-12">
            <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="text-sm font-medium text-white/40">{tr("Direkt weiter", "Continue")}</p>
                <h3 className="mt-4 max-w-3xl text-[clamp(2.35rem,4.8vw,4.8rem)] font-semibold leading-[0.96] tracking-[-0.055em]">
                  {tr("Dein Einstieg.", "Your starting point.")} <span className="text-primary">{tr("Passend zu deiner Rolle.", "Built for your role.")}</span>
                </h3>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-white/48 sm:text-base">{tr("Solo-Athleten können sofort starten. Teams, Coaches und Organisationen werden kontrolliert vorbereitet, damit Rollen, Einladungen und Datenzugriffe von Beginn an stimmen.", "Solo athletes can start right away. Teams, coaches and organisations are set up carefully so roles, invitations and data access are right from the start.")}</p>
              </div>
              <AppStoreLink />
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <div className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-primary/[0.055] p-6 sm:p-7">
                <ProductLight className="-right-24 -top-28 h-64 w-64 opacity-70" />
                <div className="relative">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.10] text-primary"><UserRound className="h-5 w-5" /></span>
                  <h4 className="mt-6 text-2xl font-semibold tracking-[-0.035em]">{tr("Allein als Athlet starten", "Start as a solo athlete")}</h4>
                  <p className="mt-3 max-w-md text-sm leading-6 text-white/45">{tr("Registriere dich direkt und beginne mit deinem persönlichen 56-Tage-Programm.", "Register and begin your personal 56-day programme.")}</p>
                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <a href="/auth?mode=signup&intent=solo" className="inline-flex min-h-[50px] items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-[#07110E] transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">{tr("Jetzt registrieren", "Register now")} <ArrowRight className="ml-2 h-4 w-4" /></a>
                    <a href="/auth?mode=login" className="inline-flex min-h-[50px] items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.03] px-5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{tr("Anmelden", "Log in")}</a>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-6 sm:p-7">
                <ProductLight className="-right-24 -top-28 h-64 w-64 opacity-45" />
                <div className="relative">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.04] text-primary"><Building2 className="h-5 w-5" /></span>
                  <h4 className="mt-6 text-2xl font-semibold tracking-[-0.035em]">{tr("Für Teams und Organisationen", "For teams and organisations")}</h4>
                  <p className="mt-3 max-w-md text-sm leading-6 text-white/45">{tr("Teamstart, Organisationszugang und Coach-Rollen werden persönlich geprüft und sicher eingerichtet.", "Team setup, organisation access and coach roles are reviewed personally and configured securely.")}</p>
                  <a href="/team-access" className="mt-7 inline-flex min-h-[50px] items-center justify-center rounded-2xl border border-white/[0.10] bg-white/[0.045] px-5 text-sm font-semibold text-white/78 transition-colors hover:border-primary/30 hover:bg-primary/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{tr("Zugang anfragen", "Request access")} <ArrowRight className="ml-2 h-4 w-4" /></a>
                  <p className="mt-4 text-xs leading-5 text-white/30">{tr("Bereits als Coach eingeladen? Nutze den persönlichen Einladungslink aus deiner E-Mail.", "Already invited as a coach? Use the personal invitation link from your email.")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#060709] px-5 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1380px] flex-col items-center justify-between gap-6 text-center lg:flex-row lg:text-left">
          <BrandLockup symbolSize={27} textClassName="text-sm" />
          <div className="flex flex-col items-center gap-4 lg:items-end">
            <p className="text-xs text-white/30">{tr("Mentale Performance als tägliche Praxis · © 2026 RewirePerform", "Mental performance as a daily practice · © 2026 RewirePerform")}</p>
            <nav aria-label={tr("Rechtliches und Support", "Legal and support")} className="flex flex-wrap justify-center gap-x-5 gap-y-3 text-xs font-medium text-white/40 lg:justify-end">
              <a href="/privacy" className="min-h-11 content-center transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{tr("Datenschutz", "Privacy")}</a>
              <a href="/imprint" className="min-h-11 content-center transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{tr("Impressum", "Legal notice")}</a>
              <a href="/support" className="min-h-11 content-center transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Support</a>
            </nav>
          </div>
        </div>
      </footer>

      <AnimatePresence>{flight && <FlightOverlay flight={flight} onClose={() => setFlight(null)} />}</AnimatePresence>
    </main>
  );
};

export default WebsiteGoldenPagePreview;
