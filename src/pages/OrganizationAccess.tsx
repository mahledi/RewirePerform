import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { BrandLockup } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/config/contact";
import { supabase } from "@/integrations/supabase/client";

type InquiryForm = {
  contactName: string;
  workEmail: string;
  phone: string;
  jobTitle: string;
  preferredContact: "email" | "phone" | "video_call";
  organizationName: string;
  organizationType: string;
  countryCode: string;
  website: string;
  sports: string;
  ageGroups: string;
  performanceLevels: string;
  teamCountBand: string;
  athleteCountBand: string;
  coachCountBand: string;
  rolloutScope: string;
  desiredStart: string;
  goals: string[];
  supportNeeds: string[];
  contextNote: string;
};

const initialForm: InquiryForm = {
  contactName: "",
  workEmail: "",
  phone: "",
  jobTitle: "",
  preferredContact: "email",
  organizationName: "",
  organizationType: "",
  countryCode: "DE",
  website: "",
  sports: "",
  ageGroups: "",
  performanceLevels: "",
  teamCountBand: "unknown",
  athleteCountBand: "unknown",
  coachCountBand: "unknown",
  rolloutScope: "exploring",
  desiredStart: "unknown",
  goals: [],
  supportNeeds: [],
  contextNote: "",
};

const organizationTypes = [
  ["local_club", "Verein"],
  ["academy", "Akademie"],
  ["performance_center", "Leistungszentrum / NLZ"],
  ["school", "Schule"],
  ["university", "Universität / Hochschule"],
  ["association", "Verband"],
  ["federation", "Föderation / Dachverband"],
  ["private_provider", "Privater Sportanbieter"],
  ["other", "Andere Organisation"],
] as const;

const goalOptions = [
  ["mental_routines", "Mentale Routinen im Alltag verankern"],
  ["coach_transfer", "Trainer und Athleten enger verbinden"],
  ["reflection", "Reflexion und Selbststeuerung strukturieren"],
  ["team_overview", "Teamzustand aggregiert verstehen"],
  ["pilot", "Einen kontrollierten Pilot starten"],
] as const;

const supportOptions = [
  ["standard", "Standardzugang"],
  ["onboarding", "Persönliche Einführung"],
  ["customization", "Anpassung an die Organisation"],
  ["reporting", "Reporting und Auswertung"],
  ["integration", "Technische Integration"],
] as const;

const goalLabels = Object.fromEntries(goalOptions) as Record<string, string>;
const supportLabels = Object.fromEntries(supportOptions) as Record<string, string>;

const splitList = (value: string) => value
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean)
  .slice(0, 12);

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: {
        sitekey: string;
        theme: "dark";
        action: "organization_access_request";
        callback: (token: string) => void;
        "expired-callback": () => void;
        "error-callback": () => void;
      }) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const TurnstileVerification = ({ onToken }: { onToken: (token: string) => void }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

  useEffect(() => {
    if (!siteKey || !elementRef.current) return;
    let widgetId: string | null = null;
    let cancelled = false;

    const render = () => {
      if (cancelled || !elementRef.current || !window.turnstile || widgetId) return;
      widgetId = window.turnstile.render(elementRef.current, {
        sitekey: siteKey,
        theme: "dark",
        action: "organization_access_request",
        callback: onToken,
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    };

    const existing = document.querySelector<HTMLScriptElement>('script[data-rewire-turnstile="true"]');
    if (existing) {
      if (window.turnstile) render();
      else existing.addEventListener("load", render, { once: true });
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.rewireTurnstile = "true";
      script.addEventListener("load", render, { once: true });
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
      onToken("");
    };
  }, [onToken, siteKey]);

  if (!siteKey) return null;
  return <div ref={elementRef} className="min-h-[65px]" aria-label="Sicherheitsprüfung" />;
};

const ChoiceButton = ({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={`min-h-11 rounded-xl border px-3 py-2.5 text-left text-sm transition-all duration-200 active:scale-[0.99] ${
      active
        ? "border-primary/70 bg-primary/10 text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.08)]"
        : "border-border/70 bg-background/40 text-muted-foreground hover:border-primary/40 hover:bg-primary/[0.04] hover:text-foreground"
    }`}
  >
    <span className="flex items-center justify-between gap-2">
      {children}
      {active && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
    </span>
  </button>
);

const OrganizationAccess = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<InquiryForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceCode, setReferenceCode] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousStepRef = useRef(step);

  const source = window.location.protocol === "capacitor:" ? "ios" : "web";
  const publicSubmissionEnabled = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);

  useEffect(() => {
    if (previousStepRef.current === step) return;
    previousStepRef.current = step;

    const frame = window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView?.({ behavior: "auto", block: "start" });
      stepHeadingRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  const canContinue = useMemo(() => {
    if (step === 0) {
      return form.contactName.trim().length >= 2
        && form.workEmail.includes("@")
        && (form.preferredContact !== "phone" || form.phone.trim().length >= 5)
        && form.jobTitle.trim().length >= 2
        && form.organizationName.trim().length >= 2
        && Boolean(form.organizationType)
        && form.sports.trim().length >= 2;
    }
    if (step === 1) {
      return form.goals.length > 0 && form.supportNeeds.length > 0;
    }
    return true;
  }, [form, step]);

  const setField = <K extends keyof InquiryForm>(key: K, value: InquiryForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleArray = (key: "goals" | "supportNeeds", value: string) => {
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting || !canContinue) return;
    if (!publicSubmissionEnabled) {
      setError("Die sichere Anfrageannahme ist in diesem lokalen Entwurf noch nicht extern aktiviert.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const { data, error: invokeError } = await supabase.functions.invoke("submit-organization-access-request", {
      body: {
        contact_name: form.contactName.trim(),
        work_email: form.workEmail.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        job_title: form.jobTitle.trim(),
        preferred_contact: form.preferredContact,
        organization_name: form.organizationName.trim(),
        organization_type: form.organizationType,
        country_code: form.countryCode,
        website: form.website.trim() || null,
        sports: splitList(form.sports),
        athlete_age_groups: splitList(form.ageGroups),
        performance_levels: splitList(form.performanceLevels),
        team_count_band: form.teamCountBand,
        athlete_count_band: form.athleteCountBand,
        coach_count_band: form.coachCountBand,
        rollout_scope: form.rolloutScope,
        desired_start: form.desiredStart,
        goals: form.goals,
        support_needs: form.supportNeeds,
        context_note: form.contextNote.trim() || null,
        source,
        locale: navigator.language || "de-DE",
        privacy_version: "organization-inquiry-v1.1-2026-08-07",
        public_research_notice_acknowledged: true,
        turnstile_token: turnstileToken,
        website_field: "",
      },
    });
    setSubmitting(false);

    if (invokeError || !data?.reference_code) {
      setError("Die Anfrage konnte gerade nicht sicher übermittelt werden. Bitte versuche es später erneut.");
      return;
    }
    setReferenceCode(String(data.reference_code));
  };

  if (referenceCode) {
    return (
      <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8">
        <div className="mx-auto flex min-h-[80vh] max-w-2xl items-center">
          <section className="relative w-full overflow-hidden rounded-[2rem] border border-primary/20 bg-card p-6 shadow-2xl shadow-black/20 sm:p-10">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Check className="h-7 w-7" />
            </div>
            <p className="relative text-xs font-semibold uppercase tracking-[0.22em] text-primary">Sicher eingegangen</p>
            <h1 className="relative mt-3 font-heading text-3xl font-bold sm:text-4xl">Der erste Schritt ist gesetzt.</h1>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Wir prüfen eure Struktur und euer Ziel persönlich und melden uns mit einem klaren nächsten Schritt. Es wurde noch kein Coach-Zugang und kein Vertrag angelegt.
            </p>
            <div className="mt-6 rounded-2xl border border-border/70 bg-secondary/30 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Referenz</p>
              <p className="mt-1 font-mono text-lg font-semibold text-foreground">{referenceCode}</p>
            </div>
            <Link to="/" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Zurück zu RewirePerform <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/support" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Link>
          <BrandLockup symbolSize={26} textClassName="hidden text-sm sm:inline" />
        </div>
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl min-w-0 gap-8 overflow-hidden px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-12 lg:py-16">
        <div className="pointer-events-none absolute -left-36 top-12 h-80 w-80 rounded-full bg-primary/[0.08] blur-3xl" />
        <aside className="min-w-0 lg:sticky lg:top-8 lg:self-start">
          <div className="relative inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Organization Access
          </div>
          <h1 className="relative mt-6 font-heading text-4xl font-bold leading-[1.04] sm:text-5xl lg:text-[3.5rem]">
            Mentales Training wird Teil eures Systems.
          </h1>
          <p className="relative mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Nicht als weitere Content-Bibliothek, sondern als klarer Ablauf für Athleten, Coaches und den sportlichen Alltag. Wir bereiten jeden Organisationsstart persönlich vor.
          </p>
          <div className="relative mt-9 overflow-hidden rounded-2xl border border-border/70 bg-card/70 backdrop-blur-sm">
            {[
              ["01", "Einordnen", "Wir verstehen Struktur, Ziel und geplanten Umfang."],
              ["02", "Vorbereiten", "Wir klären den sinnvollsten Start und offene Fragen."],
              ["03", "Freigeben", "Rollen und Datenräume werden bewusst eingerichtet."],
            ].map(([number, title, text], index) => (
              <div key={String(number)} className={`flex gap-4 p-4 ${index < 2 ? "border-b border-border/60" : ""}`}>
                <span className="pt-0.5 font-mono text-[11px] font-semibold text-primary">{number}</span>
                <div><p className="text-sm font-semibold text-foreground">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p></div>
              </div>
            ))}
          </div>
          <p className="relative mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Jede Freigabe wird persönlich geprüft. Keine automatische Team-Erstellung, keine pauschale Preisentscheidung.</p>
        </aside>

        <form ref={formRef} onSubmit={submit} className="relative w-full min-w-0 max-w-full scroll-mt-24 rounded-[2rem] border border-border/70 bg-card/95 p-5 shadow-2xl shadow-black/15 backdrop-blur-sm sm:p-8">
          <div className="mb-7 flex min-w-0 items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Schritt {step + 1} von 3</p>
              <h2 ref={stepHeadingRef} tabIndex={-1} className="mt-2 font-heading text-2xl font-semibold outline-none sm:text-3xl">
                {step === 0 ? "Wir möchten euch verstehen." : step === 1 ? "Welcher Start passt zu euch?" : "Bereit für den nächsten Schritt."}
              </h2>
            </div>
            <div className="flex gap-1.5" aria-hidden="true">
              {[0, 1, 2].map((item) => (
                <span key={item} className={`h-1.5 w-8 rounded-full ${item <= step ? "bg-primary" : "bg-secondary"}`} />
              ))}
            </div>
          </div>

          {step === 0 && (
            <div className="space-y-5">
              <p className="text-sm leading-relaxed text-muted-foreground">Nur die Informationen, die wir für ein fokussiertes Erstgespräch und eine saubere Einordnung benötigen.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="inquiry-name">Name</Label>
                  <Input id="inquiry-name" autoComplete="name" value={form.contactName} onChange={(e) => setField("contactName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inquiry-role">Funktion / Position</Label>
                  <Input id="inquiry-role" autoComplete="organization-title" value={form.jobTitle} onChange={(e) => setField("jobTitle", e.target.value)} placeholder="z. B. Sportdirektor, Trainerin" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="inquiry-email">Geschäftliche E-Mail</Label>
                  <Input id="inquiry-email" type="email" autoComplete="email" value={form.workEmail} onChange={(e) => setField("workEmail", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inquiry-phone">Telefon{form.preferredContact === "phone" ? "" : ", optional"}</Label>
                  <Input id="inquiry-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Wie dürfen wir uns am besten melden?</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    ["email", "E-Mail"],
                    ["phone", "Telefon"],
                    ["video_call", "Videogespräch"],
                  ].map(([value, label]) => (
                    <ChoiceButton key={value} active={form.preferredContact === value} onClick={() => setField("preferredContact", value as InquiryForm["preferredContact"])}>{label}</ChoiceButton>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inquiry-org">Organisation</Label>
                <Input id="inquiry-org" autoComplete="organization" value={form.organizationName} onChange={(e) => setField("organizationName", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Organisationstyp</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {organizationTypes.map(([value, label]) => (
                    <ChoiceButton key={value} active={form.organizationType === value} onClick={() => setField("organizationType", value)}>{label}</ChoiceButton>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="inquiry-sport">Sportart(en)</Label>
                  <Input id="inquiry-sport" value={form.sports} onChange={(e) => setField("sports", e.target.value)} placeholder="z. B. Fußball, Leichtathletik" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inquiry-website">Website, optional</Label>
                  <Input id="inquiry-website" type="url" autoComplete="url" value={form.website} onChange={(e) => setField("website", e.target.value)} placeholder="https://" />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <p className="text-sm leading-relaxed text-muted-foreground">Es geht nicht um ein Budgetformular. Wir wollen verstehen, was im Alltag funktionieren muss und welche Begleitung sinnvoll ist.</p>
              <div className="space-y-2">
                <Label>Was soll RewirePerform unterstützen?</Label>
                <div className="grid gap-2">
                  {goalOptions.map(([value, label]) => (
                    <ChoiceButton key={value} active={form.goals.includes(value)} onClick={() => toggleArray("goals", value)}>{label}</ChoiceButton>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["teamCountBand", "Teams", [["1", "1"], ["2_5", "2–5"], ["6_15", "6–15"], ["16_plus", "16+"]]],
                  ["athleteCountBand", "Athleten", [["under_25", "unter 25"], ["25_99", "25–99"], ["100_499", "100–499"], ["500_plus", "500+"]]],
                  ["coachCountBand", "Coaches", [["1", "1"], ["2_5", "2–5"], ["6_20", "6–20"], ["21_plus", "21+"]]],
                ].map(([key, label, options]) => (
                  <div key={key as string} className="space-y-2">
                    <Label>{label as string}</Label>
                    <select
                      value={form[key as keyof InquiryForm] as string}
                      onChange={(e) => setField(key as keyof InquiryForm, e.target.value as never)}
                      className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="unknown">Noch offen</option>
                      {(options as string[][]).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="inquiry-age-groups">Altersbereiche, optional</Label>
                  <Input id="inquiry-age-groups" value={form.ageGroups} onChange={(e) => setField("ageGroups", e.target.value)} placeholder="z. B. U15, U17, Erwachsene" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inquiry-levels">Leistungsbereiche, optional</Label>
                  <Input id="inquiry-levels" value={form.performanceLevels} onChange={(e) => setField("performanceLevels", e.target.value)} placeholder="z. B. Breitensport, Nachwuchsleistung" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rollout-scope">Geplanter Umfang</Label>
                  <select id="rollout-scope" value={form.rolloutScope} onChange={(e) => setField("rolloutScope", e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="exploring">Wir orientieren uns</option>
                    <option value="single_team">Ein Team</option>
                    <option value="pilot">Kontrollierter Pilot</option>
                    <option value="multi_team">Mehrere Teams</option>
                    <option value="organization_wide">Gesamte Organisation</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desired-start">Gewünschter Start</Label>
                  <select id="desired-start" value={form.desiredStart} onChange={(e) => setField("desiredStart", e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="unknown">Noch offen</option>
                    <option value="asap">So bald wie möglich</option>
                    <option value="next_4_weeks">In den nächsten 4 Wochen</option>
                    <option value="next_3_months">In den nächsten 3 Monaten</option>
                    <option value="later">Später</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Gewünschte Begleitung</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {supportOptions.map(([value, label]) => (
                    <ChoiceButton key={value} active={form.supportNeeds.includes(value)} onClick={() => toggleArray("supportNeeds", value)}>{label}</ChoiceButton>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inquiry-context">Was sollten wir vor dem Gespräch wissen? Optional</Label>
                <Textarea id="inquiry-context" maxLength={1600} value={form.contextNote} onChange={(e) => setField("contextNote", e.target.value)} className="min-h-28" />
                <p className="text-xs text-muted-foreground">Bitte keine Namen oder persönlichen Daten von Athleten eintragen.</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-secondary/25 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Kontakt</p>
                <p className="mt-2 break-words font-semibold">{form.contactName}</p>
                <p className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">{form.jobTitle} · {form.workEmail}</p>
              </div>
              <div className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-secondary/25 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Organisation</p>
                <p className="mt-2 break-words font-semibold">{form.organizationName}</p>
                <p className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">{form.sports}</p>
              </div>
              <div className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-secondary/25 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Worum es geht</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.goals.map((goal) => <span key={goal} className="max-w-full break-words rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs text-foreground">{goalLabels[goal] ?? goal}</span>)}
                  {form.supportNeeds.map((need) => <span key={need} className="max-w-full break-words rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1.5 text-xs text-primary">{supportLabels[need] ?? need}</span>)}
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-primary/5 p-5 text-sm leading-relaxed text-muted-foreground">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">Persönliche Prüfung statt automatische Freigabe</p>
                    <p className="mt-1">Wir nutzen deine Angaben zur Bearbeitung der Anfrage und können öffentlich verfügbare Informationen über die Organisation zur Vorbereitung prüfen. Es werden weder automatisch ein Zugang noch ein Preis oder Vertrag festgelegt.</p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button type="button" className="mt-2 inline-flex min-h-11 items-center text-left font-medium text-primary hover:underline">
                          Datenschutz zur Anfrage ansehen
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border-border/70 sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Datenschutz bei eurer Anfrage</DialogTitle>
                          <DialogDescription>
                            Die Angaben werden ausschließlich für die persönliche Prüfung und die Kontaktaufnahme zu dieser Organisationsanfrage verwendet.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                          <p>Verarbeitet werden die eingetragenen Kontakt-, Organisations- und Projektangaben. Bitte trage keine Namen oder persönlichen Daten von Athleten ein.</p>
                          <p>Zur Vorbereitung können wir öffentlich verfügbare Informationen über die angegebene Organisation prüfen. Daraus entstehen weder automatisch ein Zugang noch ein Preis oder Vertrag.</p>
                          <p>Vor dem Absenden bleiben deine Angaben nur im aktuell geöffneten Formular. Nach erfolgreicher Übermittlung melden wir uns über den von dir gewählten Kontaktweg.</p>
                          <p>
                            Fragen oder Datenschutzanliegen: <a href={SUPPORT_MAILTO} className="font-medium text-primary hover:underline">{SUPPORT_EMAIL}</a>
                          </p>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button type="button">Verstanden</Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
              {!publicSubmissionEnabled && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-foreground">
                  Teststand: Die sichere Übermittlung ist noch nicht aktiviert. Deine Angaben wurden nicht versendet.
                </div>
              )}
              {publicSubmissionEnabled && <TurnstileVerification onToken={setTurnstileToken} />}
              {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            </div>
          )}

          <div className="mt-8 grid min-w-0 grid-cols-1 gap-3 border-t border-border/60 pt-5 min-[360px]:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
            {step > 0 && (
              <Button type="button" variant="outline" className="min-h-11 min-w-0 px-3" onClick={() => { setError(null); setStep((current) => current - 1); }}>
                <ChevronLeft className="h-4 w-4" /> Zurück
              </Button>
            )}
            {step < 2 ? (
              <Button type="button" className={`${step === 0 ? "min-[360px]:col-span-2" : ""} min-h-11 min-w-0 px-3`} disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>
                Weiter <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" className="min-h-11 min-w-0 px-3" disabled={submitting || !publicSubmissionEnabled || !turnstileToken}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Anfrage absenden
              </Button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
};

export default OrganizationAccess;
