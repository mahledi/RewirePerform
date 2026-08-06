import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  MessageSquareText,
  ShieldCheck,
  X,
} from "lucide-react";

import { BrandLockup } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  feedbackTextConsentCopy,
  getFeedbackCheckpoint,
  isFeedbackQuestionVisible,
  type FeedbackCheckpointDay,
  type FeedbackQuestionDefinition,
} from "@/content/feedbackIntelligenceV1";
import { cn } from "@/lib/utils";

export type FeedbackExperienceScreen = "invitation" | "intro" | "questions" | "closing" | "complete";
export type FeedbackExperienceTextConsentState = "not_asked" | "granted" | "declined";

export interface FeedbackExperienceSnapshot {
  answers: Record<string, string[]>;
  comments: Record<string, string>;
  textConsentState: FeedbackExperienceTextConsentState;
  resumeScreen: "intro" | "questions" | "closing";
  resumeQuestionId: string | null;
  passedQuestionIds: string[];
}

type FeedbackQuestionnairePreviewProps = {
  day: FeedbackCheckpointDay;
  mode?: "preview" | "live";
  initialScreen?: FeedbackExperienceScreen;
  initialQuestionId?: string | null;
  initialAnswers?: Record<string, string[]>;
  initialComments?: Record<string, string>;
  initialConsentState?: FeedbackExperienceTextConsentState;
  initialPassedQuestionIds?: string[];
  textEnabled?: boolean;
  onStart?: () => Promise<void>;
  onDismiss?: () => Promise<void>;
  onSave?: (snapshot: FeedbackExperienceSnapshot) => Promise<void>;
  onSubmit?: (snapshot: FeedbackExperienceSnapshot) => Promise<void>;
  onComplete?: () => void;
};

const COMMENT_LIMIT = 1_200;
const CLOSING_COMMENT_ID = "__closing_comment__";

const optionIsSelected = (
  answers: Readonly<Record<string, readonly string[]>>,
  questionId: string,
  optionId: string,
) => (answers[questionId] ?? []).includes(optionId);

const ContextBadge = ({ day, reveal }: { day: FeedbackCheckpointDay; reveal: boolean }) => {
  const checkpoint = getFeedbackCheckpoint(day);
  if (!reveal) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/20 bg-primary/[0.08] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
        Dein Kontext an Tag {day}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{checkpoint.contentContext.title}</p>
    </motion.div>
  );
};

const OptionalComment = ({
  commentId,
  label,
  value,
  consentState,
  enabled,
  editing,
  onRequest,
  onChange,
  onClose,
}: {
  commentId: string;
  label: string;
  value: string;
  consentState: FeedbackExperienceTextConsentState;
  enabled: boolean;
  editing: boolean;
  onRequest: (commentId: string) => void;
  onChange: (commentId: string, value: string) => void;
  onClose: () => void;
}) => {
  if (!enabled) return null;

  if (editing && consentState === "granted") {
    return (
      <div className="mt-4 rounded-2xl border border-border/70 bg-card/70 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-foreground">Kurz etwas dazu sagen</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Freitextfeld schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <Textarea
          value={value}
          maxLength={COMMENT_LIMIT}
          onChange={(event) => onChange(commentId, event.target.value)}
          placeholder="Deine ehrliche Sicht (optional)"
          className="min-h-28 resize-none bg-background/65"
          aria-label="Optionaler Feedbacktext"
        />
        <p className="mt-2 text-right text-[11px] text-muted-foreground">
          {value.length}/{COMMENT_LIMIT}
        </p>
      </div>
    );
  }

  if (consentState === "declined") {
    return (
      <p className="mt-4 text-xs text-muted-foreground">
        Freitext ist nicht aktiviert. Deine Auswahl bleibt trotzdem gespeichert.
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onRequest(commentId)}
      className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl px-1 text-sm font-medium text-primary hover:text-primary/80"
    >
      <MessageSquareText className="h-4 w-4" />
      {label}
    </button>
  );
};

const QuestionCard = ({
  question,
  answers,
  comment,
  consentState,
  textEnabled,
  editingCommentId,
  onSelect,
  onRequestComment,
  onCommentChange,
  onCloseComment,
  reduceMotion,
}: {
  question: FeedbackQuestionDefinition;
  answers: Readonly<Record<string, readonly string[]>>;
  comment: string;
  consentState: FeedbackExperienceTextConsentState;
  textEnabled: boolean;
  editingCommentId: string | null;
  onSelect: (question: FeedbackQuestionDefinition, optionId: string) => void;
  onRequestComment: (commentId: string) => void;
  onCommentChange: (commentId: string, value: string) => void;
  onCloseComment: () => void;
  reduceMotion: boolean;
}) => (
  <section aria-labelledby={`${question.id}-prompt`}>
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
      {question.type === "multi" ? "Mehrfachauswahl möglich" : "Eine Antwort"}
    </p>
    <h1 id={`${question.id}-prompt`} className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.03em]">
      {question.prompt}
    </h1>

    <div
      className="mt-6 grid gap-2.5"
      role={question.type === "single" ? "radiogroup" : "group"}
      aria-labelledby={`${question.id}-prompt`}
    >
      {question.options.map((option) => {
        const selected = optionIsSelected(answers, question.id, option.id);
        return (
          <motion.button
            key={option.id}
            type="button"
            role={question.type === "single" ? "radio" : "checkbox"}
            aria-checked={selected}
            onClick={() => onSelect(question, option.id)}
            whileTap={reduceMotion ? undefined : { scale: 0.985 }}
            className={cn(
              "flex min-h-12 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
              selected
                ? "border-primary/55 bg-primary/[0.11] text-foreground"
                : "border-border/65 bg-card/65 text-foreground/85 hover:border-border hover:bg-card",
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center border",
                question.type === "single" ? "rounded-full" : "rounded-md",
                selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/45",
              )}
            >
              {selected && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
            </span>
            <span>{option.label}</span>
          </motion.button>
        );
      })}
    </div>

    <OptionalComment
      commentId={question.id}
      label={question.commentLabel ?? "+ Kurz etwas dazu sagen"}
      value={comment}
      consentState={consentState}
      enabled={textEnabled}
      editing={editingCommentId === question.id}
      onRequest={onRequestComment}
      onChange={onCommentChange}
      onClose={onCloseComment}
    />
  </section>
);

export const FeedbackQuestionnairePreview = ({
  day,
  mode = "preview",
  initialScreen = "invitation",
  initialQuestionId = null,
  initialAnswers = {},
  initialComments = {},
  initialConsentState = "not_asked",
  initialPassedQuestionIds = [],
  textEnabled = true,
  onStart,
  onDismiss,
  onSave,
  onSubmit,
  onComplete,
}: FeedbackQuestionnairePreviewProps) => {
  const shouldReduceMotion = useReducedMotion();
  const checkpoint = getFeedbackCheckpoint(day);
  const initialVisibleQuestions = checkpoint.questions.filter(
    (question) => isFeedbackQuestionVisible(question, initialAnswers),
  );
  const resolvedInitialIndex = Math.max(
    0,
    initialVisibleQuestions.findIndex((question) => question.id === initialQuestionId),
  );
  const [screen, setScreen] = useState<FeedbackExperienceScreen>(initialScreen);
  const [questionIndex, setQuestionIndex] = useState(resolvedInitialIndex);
  const [answers, setAnswers] = useState<Record<string, string[]>>(initialAnswers);
  const [comments, setComments] = useState<Record<string, string>>(initialComments);
  const [passedQuestionIds, setPassedQuestionIds] = useState<string[]>(initialPassedQuestionIds);
  const [consentState, setConsentState] = useState<FeedbackExperienceTextConsentState>(initialConsentState);
  const [pendingCommentId, setPendingCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const autosaveReady = useRef(false);

  const visibleQuestions = useMemo(
    () => checkpoint.questions.filter((question) => isFeedbackQuestionVisible(question, answers)),
    [answers, checkpoint.questions],
  );
  const question = visibleQuestions[questionIndex];
  const hasPassedRecall = !checkpoint.contentContext.revealAfterQuestionId
    || passedQuestionIds.includes(checkpoint.contentContext.revealAfterQuestionId);
  const resumeScreen = screen === "closing" ? "closing" : screen === "questions" ? "questions" : "intro";
  const experienceSnapshot = useMemo<FeedbackExperienceSnapshot>(() => ({
    answers,
    comments,
    textConsentState: consentState,
    resumeScreen,
    resumeQuestionId: screen === "questions" ? question?.id ?? null : null,
    passedQuestionIds,
  }), [answers, comments, consentState, passedQuestionIds, question?.id, resumeScreen, screen]);

  useEffect(() => {
    if (mode !== "live" || !onSave || screen === "invitation" || screen === "complete") return;
    if (!autosaveReady.current) {
      autosaveReady.current = true;
      return;
    }
    const timeout = window.setTimeout(() => {
      setSaveError(false);
      void onSave(experienceSnapshot).catch(() => setSaveError(true));
    }, 550);
    return () => window.clearTimeout(timeout);
  }, [experienceSnapshot, mode, onSave, screen]);

  useEffect(() => {
    if (mode !== "live" || !onSave || screen === "invitation" || screen === "complete") return;
    const persistBeforeBackground = () => {
      if (document.visibilityState !== "hidden") return;
      void onSave(experienceSnapshot).catch(() => setSaveError(true));
    };
    document.addEventListener("visibilitychange", persistBeforeBackground);
    return () => document.removeEventListener("visibilitychange", persistBeforeBackground);
  }, [experienceSnapshot, mode, onSave, screen]);

  const startExperience = async () => {
    setBusy(true);
    setSaveError(false);
    try {
      await onStart?.();
      setScreen("intro");
    } catch {
      setSaveError(true);
    } finally {
      setBusy(false);
    }
  };

  const dismissExperience = async () => {
    setBusy(true);
    setSaveError(false);
    try {
      await onDismiss?.();
    } catch {
      setSaveError(true);
    } finally {
      setBusy(false);
    }
  };

  const submitExperience = async () => {
    setBusy(true);
    setSaveError(false);
    try {
      await onSubmit?.({ ...experienceSnapshot, resumeScreen: "closing", resumeQuestionId: null });
      setScreen("complete");
    } catch {
      setSaveError(true);
    } finally {
      setBusy(false);
    }
  };

  const selectOption = (currentQuestion: FeedbackQuestionDefinition, optionId: string) => {
    const selectedOption = currentQuestion.options.find(({ id }) => id === optionId);
    if (!selectedOption) return;

    setAnswers((current) => {
      if (currentQuestion.type === "single") {
        return { ...current, [currentQuestion.id]: [optionId] };
      }

      const selected = current[currentQuestion.id] ?? [];
      if (selected.includes(optionId)) {
        return { ...current, [currentQuestion.id]: selected.filter((id) => id !== optionId) };
      }
      if (selectedOption.exclusive) {
        return { ...current, [currentQuestion.id]: [optionId] };
      }
      const exclusiveIds = new Set(
        currentQuestion.options.filter(({ exclusive }) => exclusive).map(({ id }) => id),
      );
      return {
        ...current,
        [currentQuestion.id]: [...selected.filter((id) => !exclusiveIds.has(id)), optionId],
      };
    });
  };

  const requestComment = (commentId: string) => {
    if (!textEnabled) return;
    if (consentState === "granted") {
      setEditingCommentId(commentId);
      return;
    }
    if (consentState === "declined") return;
    setPendingCommentId(commentId);
  };

  const acceptTextConsent = () => {
    setConsentState("granted");
    setEditingCommentId(pendingCommentId);
    setPendingCommentId(null);
  };

  const declineTextConsent = () => {
    setConsentState("declined");
    setPendingCommentId(null);
    setEditingCommentId(null);
  };

  const moveForward = () => {
    if (!question) return;
    setPassedQuestionIds((current) => current.includes(question.id) ? current : [...current, question.id]);
    setEditingCommentId(null);
    if (questionIndex >= visibleQuestions.length - 1) {
      setScreen("closing");
      return;
    }
    setQuestionIndex((current) => current + 1);
  };

  const moveBack = () => {
    setEditingCommentId(null);
    if (questionIndex === 0) {
      setScreen("intro");
      return;
    }
    setQuestionIndex((current) => current - 1);
  };

  const summaryRows = checkpoint.summaryConstructIds.flatMap((constructId) => {
    const summaryQuestion = checkpoint.questions.find(
      (candidate) => candidate.constructId === constructId && (answers[candidate.id]?.length ?? 0) > 0,
    );
    if (!summaryQuestion) return [];
    const selectedIds = new Set(answers[summaryQuestion.id]);
    return [{
      label: summaryQuestion.prompt,
      value: summaryQuestion.options.filter(({ id }) => selectedIds.has(id)).map(({ label }) => label).join(", "),
    }];
  }).slice(0, 4);

  const progressValue = question && visibleQuestions.length > 0
    ? ((questionIndex + 1) / visibleQuestions.length) * 100
    : 0;
  const sceneMotion = shouldReduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 14, scale: 0.992 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -10, scale: 0.995 },
      };

  return (
    <div
      data-testid="feedback-experience-frame"
      className="relative mx-auto flex min-h-[720px] w-full max-w-[430px] flex-col overflow-hidden rounded-[34px] border border-white/[0.09] bg-[#0D0E12] text-[#EEF0F2] shadow-[0_34px_100px_-40px_rgba(0,0,0,0.92),0_0_80px_-58px_rgba(46,173,137,0.7)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-8%,rgba(46,173,137,0.14),transparent_33%)]" />
      <header className="relative flex h-16 items-center justify-between border-b border-white/[0.06] px-5">
        <BrandLockup symbolSize={23} textClassName="text-[11px]" />
        <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
          {mode === "preview" ? `Vorschau · Tag ${day}` : `Tag ${day}`}
        </span>
      </header>

      <main className="relative flex flex-1 flex-col px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-6">
        <AnimatePresence mode="wait" initial={false}>
        {screen === "invitation" && (
          <motion.section
            key="invitation"
            {...sceneMotion}
            transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: "easeOut" }}
            className="flex flex-1 flex-col justify-between"
          >
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.1] text-primary">
                <MessageSquareText className="h-5 w-5" />
              </div>
              <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Kurzer Zwischenstand
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-[1.08] tracking-[-0.04em]">
                {checkpoint.heading}
              </h1>
              <p className="mt-5 text-base leading-7 text-white/62">
                Sag uns, wie sich RewirePerform an dieser Stelle für dich anfühlt. Ehrliche Kritik hilft uns genauso wie das, was bereits gut funktioniert.
              </p>
              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-3 text-sm text-white/58">
                <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
                <span>{checkpoint.durationLabel} · Fragen können übersprungen werden</span>
              </div>
            </div>
            <div className="grid gap-3">
              <motion.div whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}>
                <Button
                  size="lg"
                  className="h-12 w-full rounded-2xl shadow-glow"
                  onClick={() => void startExperience()}
                  disabled={busy}
                >
                  {busy ? "Wird geöffnet …" : "Feedback starten"} <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
              {mode === "live" && (
                <Button
                  variant="ghost"
                  className="h-11 w-full rounded-2xl text-white/55"
                  onClick={() => void dismissExperience()}
                  disabled={busy}
                >
                  Jetzt nicht
                </Button>
              )}
            </div>
          </motion.section>
        )}

        {screen === "intro" && (
          <motion.section
            key="intro"
            {...sceneMotion}
            transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: "easeOut" }}
            className="flex flex-1 flex-col justify-between"
          >
            <div>
              <button
                type="button"
                onClick={() => setScreen("invitation")}
                className="mb-7 inline-flex items-center gap-2 text-sm text-white/55 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" /> Zurück
              </button>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Bevor es losgeht</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.04em]">Deine Sicht zählt.</h1>
              <div className="mt-6 space-y-4 text-[15px] leading-7 text-white/65">
                {checkpoint.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              <p className="mt-6 text-sm leading-6 text-white/45">
                Die Auswahlantworten funktionieren unabhängig davon, ob du zusätzlich etwas schreibst.
              </p>
            </div>
            <Button size="lg" className="h-12 w-full rounded-2xl" onClick={() => setScreen("questions")}>
              Verstanden <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.section>
        )}

        {screen === "questions" && question && (
          <motion.section
            key={question.id}
            {...sceneMotion}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: "easeOut" }}
            className="flex flex-1 flex-col"
          >
            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between text-[11px] text-white/45">
                <span>Frage {questionIndex + 1}</span>
                <span>{checkpoint.durationLabel}</span>
              </div>
              <Progress value={progressValue} className="h-1.5 bg-white/[0.07] [&>div]:bg-[linear-gradient(90deg,#2EAD89,#62C6A8)]" />
            </div>
            <ContextBadge day={day} reveal={hasPassedRecall} />
            <div className={cn("flex-1", hasPassedRecall && "mt-5")}>
              <QuestionCard
                question={question}
                answers={answers}
                comment={comments[question.id] ?? ""}
                consentState={consentState}
                textEnabled={textEnabled}
                editingCommentId={editingCommentId}
                onSelect={selectOption}
                onRequestComment={requestComment}
                onCommentChange={(commentId, value) => setComments((current) => ({ ...current, [commentId]: value }))}
                onCloseComment={() => setEditingCommentId(null)}
                reduceMotion={Boolean(shouldReduceMotion)}
              />
            </div>
            <div className="mt-7 grid grid-cols-[auto_1fr] gap-3 border-t border-white/[0.06] pt-5">
              <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl" onClick={moveBack} aria-label="Zurück">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button className="h-12 rounded-2xl" onClick={moveForward}>
                {(answers[question.id]?.length ?? 0) > 0 ? "Weiter" : "Überspringen"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.section>
        )}

        {screen === "closing" && (
          <motion.section
            key="closing"
            {...sceneMotion}
            transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: "easeOut" }}
            className="flex flex-1 flex-col"
          >
            <button
              type="button"
              onClick={() => {
                setQuestionIndex(Math.max(0, visibleQuestions.length - 1));
                setScreen("questions");
              }}
              className="mb-7 inline-flex items-center gap-2 self-start text-sm text-white/55 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Zurück
            </button>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Zum Abschluss</p>
            <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.03em]">
              {checkpoint.closingTextPrompt}
            </h1>
            <p className="mt-4 text-sm leading-6 text-white/50">
              Optional. Deine bisherigen Auswahlantworten bleiben auch ohne Freitext erhalten.
            </p>
            <OptionalComment
              commentId={CLOSING_COMMENT_ID}
              label="+ Kurz etwas dazu sagen"
              value={comments[CLOSING_COMMENT_ID] ?? ""}
              consentState={consentState}
              enabled={textEnabled}
              editing={editingCommentId === CLOSING_COMMENT_ID}
              onRequest={requestComment}
              onChange={(commentId, value) => setComments((current) => ({ ...current, [commentId]: value }))}
              onClose={() => setEditingCommentId(null)}
            />
            <Button className="mt-auto h-12 rounded-2xl" onClick={() => void submitExperience()} disabled={busy}>
              {busy ? "Wird gespeichert …" : "Feedback abschließen"} <CheckCircle2 className="h-4 w-4" />
            </Button>
          </motion.section>
        )}

        {screen === "complete" && (
          <motion.section
            key="complete"
            {...sceneMotion}
            transition={{ duration: shouldReduceMotion ? 0 : 0.34, ease: "easeOut" }}
            className="relative flex flex-1 flex-col justify-center"
          >
            <motion.div
              data-testid="feedback-completion-mark"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: "easeOut" }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.1] text-primary shadow-[0_0_36px_-17px_rgba(46,173,137,0.72)]"
            >
              <CheckCircle2 className="h-7 w-7" />
            </motion.div>
            <h1 className="mt-7 text-3xl font-semibold leading-tight tracking-[-0.04em]">
              {checkpoint.completionTitle}
            </h1>
            <p className="mt-4 text-[15px] leading-7 text-white/60">{checkpoint.completionBody}</p>

            {summaryRows.length > 0 && (
              <section className="mt-7 rounded-3xl border border-white/[0.07] bg-white/[0.035] p-4" aria-label="Dein neutraler Zwischenstand">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Dein neutraler Zwischenstand</p>
                <div className="mt-3 divide-y divide-white/[0.06]">
                  {summaryRows.map((row) => (
                    <div key={row.label} className="py-3 first:pt-0 last:pb-0">
                      <p className="text-xs leading-5 text-white/45">{row.label}</p>
                      <p className="mt-1 text-sm font-medium text-white/82">{row.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <Button
              variant="outline"
              className="mt-8 h-12 rounded-2xl"
              onClick={() => mode === "preview" ? setScreen("invitation") : onComplete?.()}
            >
              {mode === "preview" ? "Vorschau neu starten" : "Zurück zu RewirePerform"}
            </Button>
          </motion.section>
        )}
        </AnimatePresence>
        {saveError && (
          <p role="status" className="mt-3 text-center text-xs text-red-300/90">
            Speichern gerade nicht möglich. Deine Eingabe bleibt hier erhalten – versuche es noch einmal.
          </p>
        )}
      </main>

      <Dialog open={pendingCommentId !== null} onOpenChange={(open) => !open && setPendingCommentId(null)}>
        <DialogContent className="max-w-[390px] rounded-3xl border-border/70 bg-background p-6">
          <DialogHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl leading-tight">{feedbackTextConsentCopy.title}</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-3 text-left text-sm leading-6 text-muted-foreground">
                {feedbackTextConsentCopy.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 grid gap-3">
            <Button variant="outline" className="h-auto min-h-12 whitespace-normal rounded-2xl px-4 py-3" onClick={declineTextConsent}>
              {feedbackTextConsentCopy.declineLabel}
            </Button>
            <Button variant="outline" className="h-auto min-h-12 whitespace-normal rounded-2xl px-4 py-3" onClick={acceptTextConsent}>
              {feedbackTextConsentCopy.acceptLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
