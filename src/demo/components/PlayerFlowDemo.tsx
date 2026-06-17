import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  Eye,
  Flame,
  Lightbulb,
  Lock,
  MessageCircle,
  Quote,
  RotateCcw,
  Target,
} from "lucide-react";
import { checkinDefaults, checkinLabels, demoDailyTask, demoFlowSteps, demoScienceBite } from "../data/demoData";
import type { DemoCheckinKey } from "../types";

const stepIds = demoFlowSteps.map((step) => step.id);

export const PlayerFlowDemo = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [checkin, setCheckin] = useState(checkinDefaults);
  const [taskDone, setTaskDone] = useState(false);
  const [showWhy, setShowWhy] = useState(true);
  const [reframeStep, setReframeStep] = useState(0);

  const progress = useMemo(() => Math.round(((activeStep + 1) / demoFlowSteps.length) * 100), [activeStep]);
  const currentStep = stepIds[activeStep];
  const reframeSteps = [
    { label: "Trigger", Icon: Flame, text: demoDailyTask.reframeStep.trigger },
    { label: "Reframe", Icon: Eye, text: demoDailyTask.reframeStep.reframe },
    { label: "Heute", Icon: Target, text: demoDailyTask.reframeStep.anchor },
  ];

  const goNext = () => setActiveStep((step) => Math.min(step + 1, demoFlowSteps.length - 1));
  const reset = () => {
    setActiveStep(0);
    setCheckin(checkinDefaults);
    setTaskDone(false);
    setShowWhy(true);
    setReframeStep(0);
  };

  return (
    <section id="player-flow" className="py-20 scroll-mt-24">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-primary">Athleten-Flow</p>
          <h2 className="font-heading text-3xl font-bold md:text-5xl">Ein Daily Flow, der sofort verständlich wirkt.</h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Diese Demo speichert nichts. Sie zeigt die echte Logik: Science Bite, Heute für dich, Check-in,
            Denkaufgabe, Reflexion und Journal.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-4xl">
          <div className="mb-5 rounded-3xl border border-border bg-card/70 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Demo-Fortschritt</p>
                <p className="mt-1 font-heading text-2xl font-bold">{demoFlowSteps[activeStep].title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Schritt {activeStep + 1} von {demoFlowSteps.length} · {progress}% abgeschlossen
                </p>
              </div>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4" />
                Neu starten
              </button>
            </div>
            <div className="mt-5 h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="min-h-[560px] rounded-3xl border border-border bg-gradient-to-br from-card to-background p-5 md:p-8">
            {currentStep === "science" && (
              <div className="flex h-full flex-col justify-between gap-8">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Schritt 1 · Science Bite</p>
                  <div className="mt-5 rounded-3xl border border-border bg-background/70">
                    <div className="flex items-start justify-between gap-4 border-b border-border/50 p-5">
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Mechanismus</p>
                        <h3 className="font-heading text-3xl font-bold leading-tight">{demoScienceBite.title}</h3>
                      </div>
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                        <Brain className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <p className="p-5 leading-relaxed text-muted-foreground">{demoScienceBite.body}</p>
                  </div>
                </div>
                <DemoNextButton onClick={goNext} label="Heute für dich ansehen" />
              </div>
            )}

            {currentStep === "today" && (
              <div className="flex h-full flex-col justify-between gap-8">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Schritt 2 · Heute für dich</p>
                  <h3 className="mt-3 font-heading text-3xl font-bold">Urteil zu Information</h3>
                  <p className="mt-4 max-w-xl text-muted-foreground">
                    Der echte `Heute für dich`-Block rahmt den Tag. Er ersetzt keine Aufgabe und verändert keine Inhalte,
                    sondern macht den Tagesfokus konkreter.
                  </p>
                </div>
                <div className="rounded-3xl border border-primary/25 bg-primary/10 p-5">
                  <div className="flex items-center gap-3 text-primary">
                    <Target className="h-5 w-5" />
                    <p className="font-heading text-lg font-semibold">Heute für dich</p>
                  </div>
                  <div className="mt-4 space-y-2 text-sm leading-relaxed">
                    <p>Heute trainierst du, einen Fehler nicht sofort als Urteil über dich zu lesen.</p>
                    <p className="text-muted-foreground">In deiner Rolle zählt besonders die nächste verwertbare Information.</p>
                    <p className="border-t border-primary/20 pt-3 text-xs text-muted-foreground">
                      <span className="mr-2 font-semibold uppercase tracking-[0.14em] text-primary">Cue</span>
                      Information, dann nächste Aktion.
                    </p>
                  </div>
                </div>
                <DemoNextButton onClick={goNext} label="Check-in ansehen" />
              </div>
            )}

            {currentStep === "checkin" && (
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Schritt 3 · Check-in</p>
                  <h3 className="mt-3 font-heading text-3xl font-bold">Wie ist dein Zustand heute?</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    In der echten App werden diese Werte als Tageszustand gespeichert. Sie sind kein privates
                    psychologisches Einzelprofil für den Coach.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(Object.keys(checkinLabels) as DemoCheckinKey[]).map((key) => (
                    <div key={key} className="rounded-2xl border border-border bg-background/70 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="font-heading font-semibold">{checkinLabels[key]}</p>
                        <p className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{checkin[key]}/10</p>
                      </div>
                      <div className="grid grid-cols-10 gap-1">
                        {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setCheckin((state) => ({ ...state, [key]: value }))}
                            className={`flex aspect-square items-center justify-center rounded-lg border text-xs transition-all ${
                              checkin[key] === value
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-muted-foreground hover:bg-secondary"
                            }`}
                            aria-label={`${checkinLabels[key]} ${value} von 10`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-border bg-background/70 p-4 text-sm leading-relaxed text-muted-foreground">
                  Im echten System wird daraus kein privates Einzelprofil für den Coach. Der Athlet bekommt seinen
                  Tagesrahmen; der Coach sieht nur passende Team-Signale und Teilnahme, wenn die fachliche Grundlage stimmt.
                </div>
                <DemoNextButton onClick={goNext} label="Denkaufgabe öffnen" />
              </div>
            )}

            {currentStep === "task" && (
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Schritt 4 · Denkaufgabe</p>
                  <h3 className="mt-3 font-heading text-3xl font-bold">{demoDailyTask.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWhy((value) => !value)}
                  className="w-full rounded-2xl border border-accent/20 bg-accent/10 p-4 text-left transition-colors hover:bg-accent/15"
                >
                  <div className="mb-1 flex items-center gap-2 text-xs font-medium text-primary">
                    <Lightbulb className="h-3.5 w-3.5" />
                    <span>Warum heute</span>
                    <ChevronDown className={`ml-auto h-3 w-3 transition-transform ${showWhy ? "rotate-180" : ""}`} />
                  </div>
                  <p className="text-sm leading-relaxed">{demoDailyTask.why}</p>
                  {showWhy && (
                    <p className="mt-3 border-t border-border/30 pt-3 text-xs leading-relaxed text-muted-foreground">
                      Es geht nicht darum, einen Zustand wegzumachen. Die Aufgabe trainiert eine andere Deutung,
                      damit der nächste Schritt wieder kontrollierbarer wird.
                    </p>
                  )}
                </button>
                <div className="rounded-2xl border border-accent/10 bg-accent/5 p-4">
                  <p className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-primary">
                    <Flame className="h-3 w-3" /> Wann aktiv
                  </p>
                  <p className="text-sm leading-relaxed">{demoDailyTask.trigger}</p>
                </div>
                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-5">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">Konkrete Handlung</p>
                  <p className="text-sm leading-relaxed">{demoDailyTask.concreteAction}</p>
                </div>
                <div className="rounded-2xl border border-border bg-secondary/40 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wider text-primary">Reframing</p>
                    <div className="flex gap-1">
                      {reframeSteps.map((_, index) => (
                        <div
                          key={index}
                          className={`h-1 rounded-full transition-all ${index <= reframeStep ? "w-6 bg-primary" : "w-3 bg-border"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {reframeSteps.map(({ label, Icon, text }, index) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setReframeStep(index)}
                        className={`w-full rounded-xl border p-3 text-left transition-colors ${
                          reframeStep === index ? "border-primary/60 bg-primary/10" : "border-border bg-card/70 hover:bg-card"
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                          {label}
                        </div>
                        <p className="text-sm leading-relaxed">{text}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <Quote className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="mb-1 text-[11px] uppercase tracking-widest text-primary">Self-Talk Anker</p>
                    <p className="text-sm italic leading-relaxed">„{demoDailyTask.selfTalk}"</p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-2xl bg-secondary/30 p-4">
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="text-xs leading-relaxed text-muted-foreground">{demoDailyTask.microReframe}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTaskDone(true)}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-heading font-semibold transition-all ${
                    taskDone ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground"
                  }`}
                >
                  <CheckCircle2 className="h-5 w-5" />
                  {taskDone ? "Verstanden" : "Verstanden"}
                </button>
                <DemoNextButton onClick={goNext} label="Reflexion ansehen" />
              </div>
            )}

            {currentStep === "reflection" && (
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Schritt 5 · Reflexion</p>
                  <h3 className="mt-3 font-heading text-3xl font-bold">Hast du die Aufgabe verstanden?</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    Diese Karte gehört zur Tagesaufgabe. Sie prüft nicht dein Leben, sondern ob der Mechanismus klar ist:
                    Fehler werden zu Information, bevor du in Bewertung rutschst.
                  </p>
                </div>
                <div className="rounded-3xl border border-border bg-background/70 p-5">
                  <div className="mb-4 flex items-center gap-3 text-primary">
                    <Check className="h-5 w-5" />
                    <p className="font-heading font-semibold">Kurze Aufgaben-Reflexion</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      "Was bedeutet heute: Fehler ist zuerst Information, nicht Identität?",
                      "Welche nächste kontrollierbare Aktion passt nach einem Fehler?",
                      "Welcher Self-Talk-Anker hilft dir, wieder in die Handlung zu kommen?",
                    ].map((question) => (
                      <div key={question} className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                        {question}
                      </div>
                    ))}
                  </div>
                </div>
                <DemoNextButton onClick={goNext} label="Journal öffnen" />
              </div>
            )}

            {currentStep === "journal" && (
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Schritt 6 · Journal</p>
                  <h3 className="mt-3 font-heading text-3xl font-bold">Privater Tagesabschluss.</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    Erst nach der Aufgaben-Reflexion kommt das Journal. Hier geht es um dein Erleben, was hängen bleibt
                    und wofür du heute konkret dankbar bist.
                  </p>
                </div>
                <div className="rounded-3xl border border-border bg-background/70 p-5">
                  <div className="mb-5 flex items-center gap-3 text-primary">
                    <BookOpen className="h-5 w-5" />
                    <p className="font-heading font-semibold">Journal zum Tag</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      "Wie war es heute, Fehler eher als Information zu lesen?",
                      "Was hast du über dich im Training oder Spiel bemerkt?",
                      "Wofür bist du heute konkret dankbar?",
                    ].map((question) => (
                      <div key={question} className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                        {question}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/10 p-4 text-sm">
                  <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <p>
                    Daily Flow abgeschlossen. Im echten System fließt nur der passende Status in Fortschritt und
                    Adherence. Private Reflexionen erscheinen nicht in der Coach-Ansicht.
                  </p>
                </div>
                <DemoNextButton onClick={reset} label="Demo erneut durchgehen" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const DemoNextButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 font-heading font-semibold text-primary-foreground transition-all hover:shadow-glow"
  >
    {label}
    <ArrowRight className="h-5 w-5" />
  </button>
);
