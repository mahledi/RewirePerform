import { useEffect, useState } from "react";
import { Bell, Check, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import {
  EVENING_REMINDER_OPTIONS,
  MORNING_REMINDER_OPTIONS,
  PRE_TRAINING_REMINDER_OPTIONS,
  formatReminderTime,
  parseReminderTime,
  utcToLocalReminderTime,
  type LocalReminderTime,
} from "@/lib/reminderTime";

interface QuestionnaireNotificationOnboardingProps {
  onContinue: () => void;
}

type Step = "intro" | "times" | "complete";

const QuestionnaireNotificationOnboarding = ({
  onContinue,
}: QuestionnaireNotificationOnboardingProps) => {
  const push = usePushSubscription();
  const [step, setStep] = useState<Step>("intro");
  const [morning, setMorning] = useState<LocalReminderTime>({ h: 7, m: 30 });
  const [evening, setEvening] = useState<LocalReminderTime>({ h: 21, m: 0 });
  const [preTrainingMinutes, setPreTrainingMinutes] = useState(60);
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (push.loading) return;
    if (!push.enabled) return;
    const storedMorning = push.mode === "web"
      ? utcToLocalReminderTime(push.morningHour, push.morningMinute)
      : { h: push.morningHour, m: push.morningMinute };
    const storedEvening = push.mode === "web"
      ? utcToLocalReminderTime(push.eveningHour, push.eveningMinute)
      : { h: push.eveningHour, m: push.eveningMinute };
    setMorning(storedMorning);
    setEvening(storedEvening);
    setPreTrainingMinutes(push.preTrainingMinutes);
    setStep("complete");
  }, [
    push.enabled,
    push.eveningHour,
    push.eveningMinute,
    push.loading,
    push.mode,
    push.morningHour,
    push.morningMinute,
    push.preTrainingMinutes,
  ]);

  const enableNotifications = async () => {
    setEnabling(true);
    setError(null);
    try {
      await push.subscribe({
        morningHour: morning.h,
        morningMinute: morning.m,
        eveningHour: evening.h,
        eveningMinute: evening.m,
        preTrainingMinutes,
      });
      setStep("complete");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Benachrichtigungen konnten gerade nicht aktiviert werden.",
      );
    } finally {
      setEnabling(false);
    }
  };

  if (push.loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-6">
        <div role="status" className="text-center text-muted-foreground">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          Benachrichtigungen werden vorbereitet…
        </div>
      </main>
    );
  }

  if (step === "complete") {
    return (
      <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-5 py-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.14),transparent_68%)]" />
        <section className="relative w-full max-w-md text-center" aria-labelledby="notifications-ready-title">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-[0_20px_60px_-30px_hsl(var(--primary)/0.8)]">
            <Check className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Alles bereit</p>
          <h1 id="notifications-ready-title" className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Dein Start ist vorbereitet.
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {push.enabled
              ? "Deine Erinnerungen sind aktiv. Zeiten und Benachrichtigungen kannst du jederzeit in den Einstellungen ändern."
              : "Dein Fragebogen ist gespeichert. Du kannst Benachrichtigungen jederzeit später in den Einstellungen aktivieren."}
          </p>
          <Button onClick={onContinue} size="lg" className="mt-8 min-h-12 w-full rounded-xl text-base">
            Zum Dashboard
          </Button>
        </section>
      </main>
    );
  }

  if (step === "times") {
    return (
      <main className="relative min-h-[100dvh] overflow-x-hidden bg-background px-5 py-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.14),transparent_68%)]" />
        <section className="relative mx-auto flex min-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-3rem)] w-full max-w-md flex-col justify-center" aria-labelledby="notification-times-title">
          <button
            type="button"
            onClick={() => setStep("intro")}
            className="mb-6 inline-flex min-h-11 w-fit items-center gap-2 rounded-xl px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Zurück
          </button>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Deine Zeiten</p>
          <h1 id="notification-times-title" className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Wann sollen wir dich erinnern?
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Wähle passende Zeiten. Erst dein Tap auf „Benachrichtigungen erlauben“ öffnet die Systemabfrage.
          </p>

          <div className="mt-7 space-y-4 rounded-2xl border border-border/70 bg-card/70 p-5 shadow-[0_24px_80px_-50px_hsl(var(--primary)/0.7)] backdrop-blur-xl">
            <div>
              <label htmlFor="notification-morning" className="mb-2 block text-sm font-medium text-foreground">Check-in am Morgen</label>
              <Select
                value={formatReminderTime(morning.h, morning.m)}
                onValueChange={(value) => setMorning(parseReminderTime(value))}
              >
                <SelectTrigger id="notification-morning" className="min-h-11 bg-secondary/50" aria-label="Uhrzeit für den Check-in am Morgen">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MORNING_REMINDER_OPTIONS.map((option) => (
                    <SelectItem key={formatReminderTime(option.h, option.m)} value={formatReminderTime(option.h, option.m)}>
                      {formatReminderTime(option.h, option.m)} Uhr
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="notification-pretraining" className="mb-2 block text-sm font-medium text-foreground">Vor Training oder Wettkampf</label>
              <Select value={String(preTrainingMinutes)} onValueChange={(value) => setPreTrainingMinutes(Number(value))}>
                <SelectTrigger id="notification-pretraining" className="min-h-11 bg-secondary/50" aria-label="Vorlauf für die mentale Vorbereitung">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRE_TRAINING_REMINDER_OPTIONS.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>{minutes} Minuten vorher</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="notification-evening" className="mb-2 block text-sm font-medium text-foreground">Journal am Abend</label>
              <Select
                value={formatReminderTime(evening.h, evening.m)}
                onValueChange={(value) => setEvening(parseReminderTime(value))}
              >
                <SelectTrigger id="notification-evening" className="min-h-11 bg-secondary/50" aria-label="Uhrzeit für das Journal am Abend">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENING_REMINDER_OPTIONS.map((option) => (
                    <SelectItem key={formatReminderTime(option.h, option.m)} value={formatReminderTime(option.h, option.m)}>
                      {formatReminderTime(option.h, option.m)} Uhr
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-muted-foreground">
              {error} Du kannst ohne Benachrichtigungen fortfahren und sie später in den Einstellungen aktivieren.
            </p>
          )}
          <Button
            onClick={enableNotifications}
            disabled={enabling}
            size="lg"
            className="mt-6 min-h-12 w-full rounded-xl text-base"
          >
            {enabling ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Bell className="h-4 w-4" aria-hidden="true" />}
            {enabling ? "Wird aktiviert…" : "Benachrichtigungen erlauben"}
          </Button>
          <button
            type="button"
            onClick={onContinue}
            className="mt-3 min-h-11 w-full rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Ohne Benachrichtigungen weiter
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-5 py-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.16),transparent_68%)]" />
      <section className="relative w-full max-w-md text-center" aria-labelledby="notification-intro-title">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-[0_20px_60px_-30px_hsl(var(--primary)/0.8)]">
          <Bell className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Nichts Wichtiges verpassen</p>
        <h1 id="notification-intro-title" className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Möchtest du erinnert werden?
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Erinnerungen helfen dir beim Programmstart, beim Check-in, bei deiner mentalen Vorbereitung und beim Journal. Du entscheidest – und kannst alles später ändern.
        </p>

        {push.supported ? (
          <Button onClick={() => setStep("times")} size="lg" className="mt-8 min-h-12 w-full rounded-xl text-base">
            Zeiten auswählen
          </Button>
        ) : (
          <div className="mt-7 rounded-2xl border border-border/70 bg-card/70 p-5 text-left text-sm leading-relaxed text-muted-foreground">
            Benachrichtigungen sind in dieser Umgebung gerade nicht verfügbar. Du kannst sie später auf einem unterstützten Gerät in den Einstellungen aktivieren.
          </div>
        )}
        <button
          type="button"
          onClick={onContinue}
          className="mt-3 min-h-11 w-full rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Jetzt nicht
        </button>
      </section>
    </main>
  );
};

export default QuestionnaireNotificationOnboarding;
