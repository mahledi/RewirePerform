import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Dumbbell,
  Eye,
  Layers3,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BrandLockup } from "@/components/brand/BrandLogo";
import { cn } from "@/lib/utils";
import {
  GOLDEN_DAY_DRAFTS,
  type GoldenDayContext,
  type GoldenDayDraft,
} from "@/prototypes/golden-days/goldenDayDrafts";

type PreviewStage =
  | "overview"
  | "science"
  | "mission"
  | "comprehension"
  | "pre-training"
  | "journal"
  | "special";

const contextMeta: Record<GoldenDayContext, { label: string; icon: typeof Dumbbell; tone: string }> = {
  training: { label: "Training", icon: Dumbbell, tone: "text-primary bg-primary/10 border-primary/20" },
  rest: { label: "Ruhetag", icon: Moon, tone: "text-sky-300 bg-sky-400/10 border-sky-400/20" },
  competition: { label: "Wettkampf", icon: Trophy, tone: "text-amber-300 bg-amber-400/10 border-amber-400/20" },
};

const hasSpecialStage = (draft: GoldenDayDraft) => Boolean(
  draft.contextChange
  || draft.missedReviews?.length
  || draft.measurementBoundary
  || draft.integrationTools?.length,
);

const getStages = (draft: GoldenDayDraft): PreviewStage[] => [
  "overview",
  "science",
  "mission",
  "comprehension",
  ...(draft.preTraining ? ["pre-training" as const] : []),
  "journal",
  ...(hasSpecialStage(draft) ? ["special" as const] : []),
];

const stageLabels: Record<PreviewStage, string> = {
  overview: "Überblick",
  science: "Verstehen",
  mission: "Mission",
  comprehension: "Kurz prüfen",
  "pre-training": "Vor der Einheit",
  journal: "Journal",
  special: "Sonderfall",
};

const Panel = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("rounded-[24px] border border-white/[0.07] bg-white/[0.028] p-5", className)}>
    {children}
  </div>
);

const StageEyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{children}</p>
);

const OverviewStage = ({ draft }: { draft: GoldenDayDraft }) => {
  const meta = contextMeta[draft.context];
  const Icon = meta.icon;
  return (
    <div className="space-y-5">
      <div>
        <StageEyebrow>Golden Day · {draft.stage}</StageEyebrow>
        <h2 className="max-w-xl text-3xl font-semibold leading-[1.08] tracking-[-0.035em] sm:text-4xl">
          {draft.title}
        </h2>
        <p className="mt-4 max-w-xl text-[15px] leading-6 text-white/58">{draft.purpose}</p>
      </div>

      <Panel className="relative overflow-hidden border-primary/15 bg-primary/[0.055]">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-[#07110e]">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Ein sichtbarer Anker</p>
            <p className="mt-2 text-xl font-semibold tracking-[-0.02em]">{draft.cue}</p>
            <p className="mt-2 text-sm leading-6 text-white/52">{draft.tool}</p>
          </div>
        </div>
      </Panel>

      <div className={cn("inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium", meta.tone)}>
        <Icon className="h-4 w-4" />
        {meta.label}
      </div>

      <p className="text-xs leading-5 text-white/38">
        Interner V1.1-Redaktionsstand. Keine Speicherung, keine echten Nutzerdaten und keine Wirkungsaussage.
      </p>
    </div>
  );
};

const ScienceStage = ({ draft }: { draft: GoldenDayDraft }) => (
  <div className="space-y-5">
    <div>
      <StageEyebrow>Science Bite</StageEyebrow>
      <h2 className="text-2xl font-semibold leading-tight tracking-[-0.025em]">{draft.scienceBite.title}</h2>
    </div>
    <Panel>
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
        <Brain className="h-5 w-5" />
      </div>
      <div className="space-y-4 text-[15px] leading-7 text-white/67">
        {draft.scienceBite.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
    </Panel>
    <div className="flex items-start gap-3 rounded-2xl border border-white/[0.055] px-4 py-3 text-sm leading-6 text-white/54">
      <Eye className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      Danach folgt genau eine Mission. Es kommt kein zweites Tagesthema dazu.
    </div>
  </div>
);

const MissionStage = ({ draft }: { draft: GoldenDayDraft }) => (
  <div className="space-y-5">
    <div>
      <StageEyebrow>Deine Mission</StageEyebrow>
      <h2 className="text-2xl font-semibold tracking-[-0.025em]">{draft.mission.title}</h2>
      <p className="mt-3 text-sm leading-6 text-white/52">{draft.mission.trigger}</p>
    </div>
    <Panel className="p-0">
      <ol>
        {draft.mission.steps.map((step, index) => (
          <li key={step} className={cn("flex gap-4 p-5", index > 0 && "border-t border-white/[0.055]") }>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
              {index + 1}
            </span>
            <p className="pt-1 text-[15px] leading-6 text-white/76">{step}</p>
          </li>
        ))}
      </ol>
    </Panel>
    <div className="rounded-2xl bg-white/[0.025] px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">Warum das hilft</p>
      <p className="mt-2 text-sm leading-6 text-white/62">{draft.mission.why}</p>
    </div>
    <div className="rounded-2xl border border-primary/20 bg-primary/[0.065] px-4 py-4 text-center text-lg font-semibold text-primary">
      {draft.cue}
    </div>
  </div>
);

const ComprehensionStage = ({ draft }: { draft: GoldenDayDraft }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const checked = selected !== null;
  const correct = selected === draft.comprehension.correctOptionId;

  useEffect(() => setSelected(null), [draft.day]);

  return (
    <div className="space-y-5">
      <div>
        <StageEyebrow>Kurz prüfen</StageEyebrow>
        <h2 className="text-2xl font-semibold leading-tight tracking-[-0.025em]">{draft.comprehension.prompt}</h2>
      </div>
      <div className="space-y-3" role="radiogroup" aria-label="Antwort auswählen">
        {draft.comprehension.options.map((option) => {
          const isSelected = selected === option.id;
          const isCorrect = checked && option.id === draft.comprehension.correctOptionId;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelected(option.id)}
              className={cn(
                "flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm leading-5 transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isCorrect
                  ? "border-primary/40 bg-primary/10 text-white"
                  : isSelected
                    ? "border-white/20 bg-white/[0.06] text-white"
                    : "border-white/[0.065] bg-white/[0.025] text-white/65 hover:bg-white/[0.045]",
              )}
            >
              <span className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                isCorrect ? "border-primary bg-primary text-[#07110e]" : "border-white/10 text-white/48",
              )}>
                {isCorrect ? <Check className="h-4 w-4" /> : option.id.toUpperCase()}
              </span>
              {option.label}
            </button>
          );
        })}
      </div>
      {checked && (
        <div
          role="status"
          className={cn(
            "rounded-2xl border px-4 py-4 text-sm leading-6",
            correct ? "border-primary/20 bg-primary/[0.06] text-white/68" : "border-amber-400/20 bg-amber-400/[0.06] text-white/68",
          )}
        >
          <p className="font-semibold text-white">{correct ? "Genau." : "Schau noch einmal auf die Bewegung."}</p>
          <p className="mt-1">{draft.comprehension.feedback}</p>
        </div>
      )}
    </div>
  );
};

const PreTrainingStage = ({ draft }: { draft: GoldenDayDraft }) => {
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const pre = draft.preTraining;

  useEffect(() => {
    setAnswer("");
    setRevealed(false);
  }, [draft.day]);

  if (!pre) return null;

  return (
    <div className="space-y-5">
      <div>
        <StageEyebrow>{pre.label}</StageEyebrow>
        <h2 className="text-2xl font-semibold leading-tight tracking-[-0.025em]">Erst erinnern. Dann den Cue sehen.</h2>
        <p className="mt-3 text-sm leading-6 text-white/52">{pre.recallPrompt}</p>
      </div>
      <textarea
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        placeholder="Deine kurze Erinnerung …"
        aria-label="Eigene Erinnerung"
        className="min-h-28 w-full resize-none rounded-2xl border border-white/[0.075] bg-white/[0.025] px-4 py-4 text-base text-white outline-none placeholder:text-white/25 focus:border-primary/45 focus:ring-2 focus:ring-primary/15"
      />
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm font-semibold text-white/72 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        Erinnerung prüfen <ChevronDown className="h-4 w-4" />
      </button>
      {revealed && (
        <Panel className="border-primary/20 bg-primary/[0.06] text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Deine Linie für heute</p>
          <p className="mt-3 text-xl font-semibold">{pre.reveal}</p>
          <p className="mt-3 text-sm leading-6 text-white/56">{pre.application}</p>
        </Panel>
      )}
    </div>
  );
};

const JournalStage = ({ draft }: { draft: GoldenDayDraft }) => {
  const questions = draft.journal.questions.filter(Boolean);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const isGratitude = questionIndex === questions.length;

  useEffect(() => {
    setQuestionIndex(0);
    setAnswers({});
  }, [draft.day]);

  const question = questions[questionIndex];
  const activeId = isGratitude ? `${draft.day}-gratitude` : question.id;
  const value = answers[activeId] ?? "";
  const total = questions.length + 1;

  return (
    <div className="space-y-5">
      <div>
        <StageEyebrow>Journal · {questionIndex + 1} von {total}</StageEyebrow>
        <h2 className="text-2xl font-semibold leading-tight tracking-[-0.025em]">{draft.journal.title}</h2>
        <p className="mt-3 text-sm leading-6 text-white/52">{draft.journal.intro}</p>
      </div>

      <Panel>
        <p className="text-base font-semibold leading-6">
          {isGratitude ? draft.journal.gratitudePrompt : question.prompt}
        </p>
        <textarea
          value={value}
          onChange={(event) => setAnswers((current) => ({ ...current, [activeId]: event.target.value }))}
          placeholder={isGratitude ? "Ein konkreter Satz …" : question.placeholder}
          aria-label={isGratitude ? "Dankbarkeit" : `Journalfrage ${questionIndex + 1}`}
          className="mt-5 min-h-32 w-full resize-none rounded-2xl border border-white/[0.07] bg-black/10 px-4 py-4 text-base text-white outline-none placeholder:text-white/24 focus:border-primary/45 focus:ring-2 focus:ring-primary/15"
        />
        {isGratitude && (
          <p className="mt-3 text-xs leading-5 text-white/38">
            Redaktionstest: mindestens {draft.journal.gratitudeMinWords} Wörter. Kein Qualitäts- oder Wirkungsscore.
          </p>
        )}
      </Panel>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setQuestionIndex((current) => Math.max(0, current - 1))}
          disabled={questionIndex === 0}
          className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-white/52 disabled:opacity-25"
        >
          <ArrowLeft className="h-4 w-4" /> Zurück
        </button>
        <div className="flex gap-1.5" aria-label={`Journalfrage ${questionIndex + 1} von ${total}`}>
          {Array.from({ length: total }, (_, index) => (
            <span key={index} className={cn("h-1.5 rounded-full transition-all", index === questionIndex ? "w-6 bg-primary" : "w-1.5 bg-white/12")} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setQuestionIndex((current) => Math.min(total - 1, current + 1))}
          disabled={questionIndex === total - 1}
          className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-white/52 disabled:opacity-25"
        >
          Weiter <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-white/[0.055] px-4 py-3 text-xs leading-5 text-white/42">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        Im echten Produkt bleibt die Reflexion privat. Dieser Prüfstand speichert gar nichts.
      </div>
    </div>
  );
};

const SpecialStage = ({ draft }: { draft: GoldenDayDraft }) => {
  const [changed, setChanged] = useState(false);
  const [expandedReview, setExpandedReview] = useState<number | null>(null);

  useEffect(() => {
    setChanged(false);
    setExpandedReview(null);
  }, [draft.day]);

  return (
    <div className="space-y-5">
      <div>
        <StageEyebrow>Sonderfall prüfen</StageEyebrow>
        <h2 className="text-2xl font-semibold tracking-[-0.025em]">Systemwahrheit unter realen Änderungen</h2>
      </div>

      {draft.contextChange && (
        <Panel>
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1">
              <p className="font-semibold">Planänderung nach dem Check-in</p>
              <p className="mt-2 text-sm leading-6 text-white/55">
                {changed ? draft.contextChange.message : "Ausgangslage: Der Tag war als Training geplant."}
              </p>
              <button
                type="button"
                onClick={() => setChanged((current) => !current)}
                className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.075] px-4 text-sm font-semibold text-white/68"
              >
                <RotateCcw className="h-4 w-4" />
                {changed ? "Ausgangslage zeigen" : "Auf Ruhetag ändern"}
              </button>
            </div>
          </div>
        </Panel>
      )}

      {draft.missedReviews && (
        <Panel>
          <p className="font-semibold">Verpasste Tage · nur als Zusammenfassung</p>
          <p className="mt-2 text-sm leading-6 text-white/52">Keine Aufgabe wird nachgeholt. Der heutige Anker bleibt Tag {draft.day}.</p>
          <div className="mt-4 divide-y divide-white/[0.055] border-y border-white/[0.055]">
            {draft.missedReviews.map((review) => {
              const open = expandedReview === review.day;
              return (
                <div key={review.day}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setExpandedReview(open ? null : review.day)}
                    className="flex min-h-14 w-full items-center justify-between gap-3 py-3 text-left"
                  >
                    <span>
                      <span className="block text-[10px] uppercase tracking-[0.14em] text-white/35">Tag {review.day}</span>
                      <span className="mt-1 block text-sm font-semibold">{review.tool}</span>
                    </span>
                    <ChevronDown className={cn("h-4 w-4 text-white/38 transition-transform", open && "rotate-180")} />
                  </button>
                  {open && (
                    <div className="pb-4 text-sm leading-6 text-white/55">
                      <p>{review.summary}</p>
                      <p className="mt-2 text-white/42">Damals: {review.formerMission}</p>
                      <p className="mt-3 font-semibold text-primary">{review.cue}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {draft.integrationTools && (
        <Panel>
          <div className="flex items-center gap-3">
            <Layers3 className="h-5 w-5 text-primary" />
            <p className="font-semibold">Werkzeugbild · erkennen, nicht siebenmal bearbeiten</p>
          </div>
          <div className="mt-4 space-y-2">
            {draft.integrationTools.map((tool) => (
              <div key={tool.id} className="rounded-xl bg-white/[0.025] px-3 py-3">
                <div>
                  <p className="text-sm font-semibold">{tool.cue}</p>
                  <p className="mt-1 text-xs leading-5 text-white/42">{tool.use}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {draft.measurementBoundary && (
        <Panel className="border-primary/15 bg-primary/[0.045]">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="mt-4 text-lg font-semibold">{draft.measurementBoundary.title}</h3>
          <p className="mt-3 text-sm leading-6 text-white/58">{draft.measurementBoundary.body}</p>
          <p className="mt-3 text-xs leading-5 text-white/40">{draft.measurementBoundary.privacy}</p>
        </Panel>
      )}
    </div>
  );
};

const stageContent = (stage: PreviewStage, draft: GoldenDayDraft) => {
  if (stage === "overview") return <OverviewStage draft={draft} />;
  if (stage === "science") return <ScienceStage draft={draft} />;
  if (stage === "mission") return <MissionStage draft={draft} />;
  if (stage === "comprehension") return <ComprehensionStage draft={draft} />;
  if (stage === "pre-training") return <PreTrainingStage draft={draft} />;
  if (stage === "journal") return <JournalStage draft={draft} />;
  return <SpecialStage draft={draft} />;
};

const GoldenDaysPreview = () => {
  const [dayIndex, setDayIndex] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const contentRef = useRef<HTMLDivElement>(null);
  const draft = GOLDEN_DAY_DRAFTS[dayIndex];
  const stages = useMemo(() => getStages(draft), [draft]);
  const stage = stages[stageIndex] ?? stages[0];
  const ContextIcon = contextMeta[draft.context].icon;

  const selectDay = (index: number) => {
    setDayIndex(index);
    setStageIndex(0);
  };

  const moveStage = (next: number) => {
    setStageIndex(Math.max(0, Math.min(stages.length - 1, next)));
  };

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [dayIndex, stageIndex]);

  return (
    <main className="flex h-screen h-[100dvh] flex-col overflow-hidden bg-[#0D0E12] text-[#EEF0F2]" data-testid="golden-days-preview">
      <header className="shrink-0 border-b border-white/[0.055] bg-[#0D0E12]/94 px-4 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-2xl [@media(max-height:500px)]:pt-0">
        <div className="mx-auto flex min-h-11 max-w-4xl items-center justify-between gap-4 pb-3 [@media(max-height:500px)]:hidden">
          <BrandLockup symbolSize={22} textClassName="text-[11px]" />
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">V1.1 Content Lab</p>
            <p className="mt-0.5 text-xs text-white/42">Golden Days · intern</p>
          </div>
        </div>
        <div className="mx-auto flex max-w-4xl gap-2 overflow-x-auto pb-3 [scrollbar-width:none] [@media(max-height:500px)]:py-1.5 [&::-webkit-scrollbar]:hidden" aria-label="Golden Day auswählen">
          {GOLDEN_DAY_DRAFTS.map((item, index) => (
            <button
              key={item.day}
              type="button"
              onClick={() => selectDay(index)}
              aria-pressed={dayIndex === index}
              className={cn(
                "min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                dayIndex === index
                  ? "border-primary/35 bg-primary text-[#07110e]"
                  : "border-white/[0.065] bg-white/[0.025] text-white/52",
              )}
            >
              Tag {item.day}
            </button>
          ))}
        </div>
      </header>

      <div className="shrink-0 border-b border-white/[0.045] px-4 py-3 [@media(max-height:500px)]:py-1.5">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-white/38">Tag {draft.day}/56</p>
            <p className="mt-1 truncate text-sm font-semibold">{stageLabels[stage]}</p>
          </div>
          <div className={cn("flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-semibold", contextMeta[draft.context].tone)}>
            <ContextIcon className="h-3.5 w-3.5" />
            {contextMeta[draft.context].label}
          </div>
        </div>
        <div className="mx-auto mt-1 flex max-w-2xl items-center gap-1.5 [@media(max-height:500px)]:hidden" aria-label={`Abschnitt ${stageIndex + 1} von ${stages.length}`}>
          {stages.map((item, index) => (
            <button
              key={item}
              type="button"
              aria-label={stageLabels[item]}
              onClick={() => moveStage(index)}
              className="flex min-h-11 min-w-3 flex-1 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className={cn("h-1.5 w-full rounded-full transition-colors", index <= stageIndex ? "bg-primary" : "bg-white/[0.08]")} />
            </button>
          ))}
          <span className="ml-2 text-[10px] tabular-nums text-white/38">{stageIndex + 1}/{stages.length}</span>
        </div>
      </div>

      <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-7 [@media(max-height:500px)]:py-4" data-testid="golden-day-content">
        <div className="mx-auto w-full max-w-2xl">
          <AnimatePresence mode="wait" initial={false}>
            <motion.section
              key={`${draft.day}-${stage}`}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
              transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: "easeOut" }}
              aria-labelledby="golden-day-stage-title"
            >
              <span id="golden-day-stage-title" className="sr-only">{stageLabels[stage]}</span>
              {stageContent(stage, draft)}
            </motion.section>
          </AnimatePresence>
        </div>
      </div>

      <footer className="relative z-20 shrink-0 border-t border-white/[0.06] bg-[#0B0C10]/96 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl [@media(max-height:500px)]:pb-[max(8px,env(safe-area-inset-bottom))] [@media(max-height:500px)]:pt-2" data-testid="golden-day-footer">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            type="button"
            onClick={() => moveStage(stageIndex - 1)}
            disabled={stageIndex === 0}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/[0.075] text-white/58 disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Vorheriger Abschnitt"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => moveStage(stageIndex + 1)}
            disabled={stageIndex === stages.length - 1}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-[#07110e] disabled:bg-white/[0.06] disabled:text-white/28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0C10]"
          >
            {stageIndex === stages.length - 1 ? "Golden Day vollständig" : "Weiter"}
            {stageIndex < stages.length - 1 && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </footer>
    </main>
  );
};

export default GoldenDaysPreview;
