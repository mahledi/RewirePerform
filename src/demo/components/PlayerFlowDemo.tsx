import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Check, CheckCircle2, FlaskConical, Lock, RotateCcw, Target } from "lucide-react";
import { checkinLabels, checkinOptions, demoFlowSteps } from "../data/demoData";
import type { DemoCheckinKey } from "../types";

const defaultCheckin: Record<DemoCheckinKey, string> = {
  energy: "medium",
  focus: "medium",
  pressure: "high",
  readiness: "medium",
};

const stepIds = demoFlowSteps.map((step) => step.id);

export const PlayerFlowDemo = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [checkin, setCheckin] = useState(defaultCheckin);
  const [taskDone, setTaskDone] = useState(false);

  const progress = useMemo(() => Math.round(((activeStep + 1) / demoFlowSteps.length) * 100), [activeStep]);
  const currentStep = stepIds[activeStep];

  const goNext = () => setActiveStep((step) => Math.min(step + 1, demoFlowSteps.length - 1));
  const reset = () => {
    setActiveStep(0);
    setCheckin(defaultCheckin);
    setTaskDone(false);
  };

  return (
    <section id="player-flow" className="py-20 scroll-mt-24">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-primary">Spieler-Flow</p>
          <h2 className="font-heading text-3xl font-bold md:text-5xl">Ein Daily Flow, der sofort verständlich wirkt.</h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Diese Demo speichert nichts. Sie zeigt nur, wie ein Athlet durch Kontext, Check-in, Aufgabe,
            Verständnis und Reflexion geführt wird.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="rounded-3xl border border-border bg-card/70 p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Demo-Fortschritt</p>
                <p className="mt-1 font-heading text-2xl font-bold">{progress}%</p>
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
            <div className="h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-6 space-y-3">
              {demoFlowSteps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(index)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${
                    activeStep === index
                      ? "border-primary/60 bg-primary/10"
                      : "border-border bg-background/60 hover:bg-secondary/60"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{step.eyebrow}</p>
                  <p className="mt-1 font-heading text-lg font-semibold">{step.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-[560px] rounded-3xl border border-border bg-gradient-to-br from-card to-background p-5 md:p-8">
            {currentStep === "context" && (
              <div className="flex h-full flex-col justify-between gap-8">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Tag 12 · Trainingstag</p>
                  <h3 className="mt-3 font-heading text-3xl font-bold">Fehlererholung</h3>
                  <p className="mt-4 max-w-xl text-muted-foreground">
                    Heute geht es nicht darum, Fehler zu vermeiden. Es geht darum, nach einem Fehler schneller wieder
                    in die nächste kontrollierbare Aktion zu kommen.
                  </p>
                </div>
                <div className="rounded-3xl border border-primary/25 bg-primary/10 p-5">
                  <div className="flex items-center gap-3 text-primary">
                    <Target className="h-5 w-5" />
                    <p className="font-heading text-lg font-semibold">Heute für dich</p>
                  </div>
                  <p className="mt-4 text-lg leading-relaxed">
                    Nach jedem Fehler: ausatmen, Blick heben, nächste Aufgabe lautlos benennen.
                  </p>
                </div>
                <DemoNextButton onClick={goNext} label="Check-in ansehen" />
              </div>
            )}

            {currentStep === "checkin" && (
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Check-in</p>
                  <h3 className="mt-3 font-heading text-3xl font-bold">Wie ist dein Zustand vor dem Tag?</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(Object.keys(checkinOptions) as DemoCheckinKey[]).map((key) => (
                    <div key={key} className="rounded-2xl border border-border bg-background/70 p-4">
                      <p className="mb-3 font-heading font-semibold">{checkinLabels[key]}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {checkinOptions[key].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setCheckin((state) => ({ ...state, [key]: option.value }))}
                            className={`rounded-xl border px-3 py-2 text-sm transition-all ${
                              checkin[key] === option.value
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card hover:bg-secondary"
                            }`}
                          >
                            {option.label}
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
                <DemoNextButton onClick={goNext} label="Tagesaufgabe öffnen" />
              </div>
            )}

            {currentStep === "task" && (
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Tagesaufgabe</p>
                  <h3 className="mt-3 font-heading text-3xl font-bold">Der 3-Sekunden-Reset</h3>
                </div>
                <div className="rounded-3xl border border-border bg-background/70 p-5">
                  <p className="font-heading text-lg font-semibold">Warum es zählt</p>
                  <p className="mt-3 text-muted-foreground">
                    Der Körper reagiert schneller als der Kopf. Ein kurzer Reset schafft genug Abstand, damit die nächste
                    Aktion nicht vom letzten Fehler gesteuert wird.
                  </p>
                  <div className="mt-5 space-y-3">
                    {["Ausatmen und Schultern lösen.", "Blick heben und Spielfeld scannen.", "Nächste Aufgabe in einem Satz benennen."].map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTaskDone(true)}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-heading font-semibold transition-all ${
                    taskDone ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground"
                  }`}
                >
                  <CheckCircle2 className="h-5 w-5" />
                  {taskDone ? "verstanden" : "als verstanden markieren"}
                </button>
                <DemoNextButton onClick={goNext} label="Science Bite lesen" />
              </div>
            )}

            {currentStep === "science" && (
              <div className="flex h-full flex-col justify-between gap-8">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Science Bite</p>
                  <h3 className="mt-3 font-heading text-3xl font-bold">Dein System braucht eine Rückkehrspur.</h3>
                  <div className="mt-6 rounded-3xl border border-border bg-background/70 p-6">
                    <div className="flex items-center gap-3 text-primary">
                      <FlaskConical className="h-5 w-5" />
                      <p className="font-heading font-semibold">Mechanismus</p>
                    </div>
                    <p className="mt-4 leading-relaxed text-muted-foreground">
                      Nach Fehlern zieht Aufmerksamkeit oft zur Bewertung: Was war das? Was denken andere? Eine kurze,
                      wiederholbare Rückkehrhandlung verschiebt den Fokus zurück auf Wahrnehmung und nächste Aktion.
                    </p>
                  </div>
                </div>
                <DemoNextButton onClick={goNext} label="Journal ansehen" />
              </div>
            )}

            {currentStep === "journal" && (
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Journal & Abschluss</p>
                  <h3 className="mt-3 font-heading text-3xl font-bold">Private Reflexion bleibt privat.</h3>
                </div>
                <div className="rounded-3xl border border-border bg-background/70 p-5">
                  <div className="mb-5 flex items-center gap-3 text-primary">
                    <BookOpen className="h-5 w-5" />
                    <p className="font-heading font-semibold">Beispiel-Fragen</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      "Wann bist du heute nach einem Fehler zur nächsten Aktion zurückgekehrt?",
                      "Was war ein Moment, in dem du bewusst ruhig geblieben bist?",
                      "Ein Satz für morgen: ...",
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

