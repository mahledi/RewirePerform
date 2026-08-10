import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  Loader2,
  ShieldCheck,
  UsersRound,
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
  teamName: string;
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
  teamName: "",
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
] as const;

const teamSupportOptions = supportOptions.slice(0, 2);
const ORGANIZATION_INQUIRY_PRIVACY_VERSION = "organization-inquiry-v1.1-2026-08-10";

type InquiryPath = "single_team" | "organization";

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

const InquirySelect = ({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-md border border-input bg-background px-3 pr-10 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" aria-hidden="true" />
    </div>
  </div>
);

const OrganizationAccess = () => {
  const [searchParams] = useSearchParams();
  const requestedScope = searchParams.get("scope");
  const initialPath: InquiryPath | null = requestedScope === "single_team"
    ? "single_team"
    : requestedScope === "organization"
      ? "organization"
      : null;
  const [inquiryPath, setInquiryPath] = useState<InquiryPath | null>(initialPath);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<InquiryForm>(() => initialPath === "single_team"
    ? { ...initialForm, teamCountBand: "1", rolloutScope: "single_team" }
    : initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceCode, setReferenceCode] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousStepRef = useRef(step);

  const source = searchParams.get("source") === "ios" || window.location.protocol === "capacitor:" ? "ios" : "web";
  const publicSubmissionEnabled = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);
  const totalSteps = inquiryPath === "single_team" ? 2 : 3;
  const finalStep = totalSteps - 1;
  const journeyOverview = inquiryPath === "single_team"
    ? [
        ["01", "Einordnen", "Wir verstehen Team, Sportart und Ansprechpartner."],
        ["02", "Vorbereiten", "Wir klären Ziel, Start und passende Begleitung."],
      ]
    : [
        ["01", "Einordnen", "Wir verstehen Struktur, Ziel und geplanten Umfang."],
        ["02", "Vorbereiten", "Wir klären den sinnvollsten Start und offene Fragen."],
        ["03", "Freigeben", "Rollen und Datenräume werden bewusst eingerichtet."],
      ];

  useEffect(() => {
    if (previousStepRef.current === step) return;
    previousStepRef.current = step;

    const frame = window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView?.({ behavior: "auto", block: "start" });
      stepHeadingRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [inquiryPath, step]);

  const canContinue = useMemo(() => {
    if (step === 0) {
      return form.contactName.trim().length >= 2
        && form.workEmail.includes("@")
        && (form.preferredContact !== "phone" || form.phone.trim().length >= 5)
        && form.jobTitle.trim().length >= 2
        && form.organizationName.trim().length >= 2
        && Boolean(form.organizationType)
        && form.sports.trim().length >= 2
        && (inquiryPath !== "single_team" || form.teamName.trim().length >= 2);
    }
    if (step === 1) {
      return form.goals.length > 0 && form.supportNeeds.length > 0;
    }
    return true;
  }, [form, inquiryPath, step]);

  const choosePath = (path: InquiryPath) => {
    setInquiryPath(path);
    setStep(0);
    setError(null);
    setTurnstileToken("");
    setForm(path === "single_team"
      ? { ...initialForm, teamCountBand: "1", rolloutScope: "single_team" }
      : initialForm);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  };

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
    if (!inquiryPath || submitting || !canContinue) return;
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
        team_name: inquiryPath === "single_team" ? form.teamName.trim() : null,
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
        privacy_version: ORGANIZATION_INQUIRY_PRIVACY_VERSION,
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
            <h1 className="relative mt-3 font-heading text-3xl font-bold sm:text-4xl">
              {inquiryPath === "single_team" ? "Eure Teamanfrage ist eingegangen." : "Der erste Schritt ist gesetzt."}
            </h1>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              {inquiryPath === "single_team"
                ? "Wir prüfen euren geplanten Teamstart persönlich und melden uns mit einem klaren nächsten Schritt. Es wurde noch kein Teamzugang und kein Vertrag angelegt."
                : "Wir prüfen eure Struktur und euer Ziel persönlich und melden uns mit einem klaren nächsten Schritt. Es wurde noch kein Organisationszugang und kein Vertrag angelegt."}
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

  if (!inquiryPath) {
    return (
      <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Zurück
            </Link>
            <BrandLockup symbolSize={26} textClassName="hidden text-sm sm:inline" />
          </div>

          <section className="relative mx-auto mt-10 max-w-4xl overflow-hidden rounded-[2rem] border border-border/70 bg-card/95 p-6 shadow-2xl shadow-black/15 sm:p-10 lg:p-12">
            <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
            <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-primary">Zugang für Teams &amp; Organisationen</p>
            <h1 className="relative mt-4 max-w-3xl font-heading text-4xl font-bold leading-[1.06] sm:text-5xl">
              Wie möchtet ihr RewirePerform einführen?
            </h1>
            <p className="relative mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Wählt den Weg, der zu eurem tatsächlichen Start passt. Jede Anfrage wird persönlich geprüft – ohne automatische Freigabe und ohne vorgegebenes Preismodell.
            </p>

            <div className="relative mt-9 grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => choosePath("single_team")}
                className="group min-h-56 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/12 via-primary/[0.05] to-background/60 p-6 text-left transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/5 active:translate-y-0"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><UsersRound className="h-6 w-6" aria-hidden="true" /></span>
                <span className="mt-6 block font-heading text-2xl font-semibold">Ein Team starten</span>
                <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">Für Trainer und Verantwortliche, die zunächst ein konkretes Team sicher und persönlich einführen möchten.</span>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">Kurze Anfrage <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
              </button>

              <button
                type="button"
                onClick={() => choosePath("organization")}
                className="group min-h-56 rounded-2xl border border-border/70 bg-background/50 p-6 text-left transition-all hover:-translate-y-0.5 hover:border-primary/45 hover:bg-primary/[0.035] active:translate-y-0"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/70 bg-secondary/60 text-primary"><Building2 className="h-6 w-6" aria-hidden="true" /></span>
                <span className="mt-6 block font-heading text-2xl font-semibold">Verein oder Organisation einführen</span>
                <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">Für mehrere Teams, Akademien, Leistungszentren, Schulen, Hochschulen und Verbände.</span>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">Struktur einordnen <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
              </button>
            </div>

            <p className="relative mt-7 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              Bitte keine Namen oder persönlichen Daten von Athleten eingeben. Rollen und Datenräume entstehen erst nach persönlicher Prüfung.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Link>
          <BrandLockup symbolSize={26} textClassName="hidden text-sm sm:inline" />
        </div>
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl min-w-0 gap-8 overflow-hidden px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-12 lg:py-16">
        <div className="pointer-events-none absolute -left-36 top-12 h-80 w-80 rounded-full bg-primary/[0.08] blur-3xl" />
        <aside className="min-w-0 lg:sticky lg:top-8 lg:self-start">
          <div className="relative inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            {inquiryPath === "single_team" ? "Teamstart" : "Organisationsstart"}
          </div>
          <h1 className="relative mt-6 font-heading text-4xl font-bold leading-[1.04] sm:text-5xl lg:text-[3.5rem]">
            {inquiryPath === "single_team" ? "Bringt RewirePerform in euer Team." : "Mentales Training wird Teil eures Systems."}
          </h1>
          <p className="relative mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {inquiryPath === "single_team"
              ? "Ein klarer mentaler Trainingsrhythmus für eure Athleten und den sportlichen Alltag. Wir bereiten jeden Teamstart persönlich vor."
              : "Nicht als weitere Content-Bibliothek, sondern als klarer Ablauf für Athleten, Coaches und den sportlichen Alltag. Wir bereiten jeden Organisationsstart persönlich vor."}
          </p>
          <div className="relative mt-9 overflow-hidden rounded-2xl border border-border/70 bg-card/70 backdrop-blur-sm">
            {journeyOverview.map(([number, title, text], index) => (
              <div key={String(number)} className={`flex gap-4 p-4 ${index < journeyOverview.length - 1 ? "border-b border-border/60" : ""}`}>
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
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Schritt {step + 1} von {totalSteps}</p>
              <h2 ref={stepHeadingRef} tabIndex={-1} className="mt-2 font-heading text-2xl font-semibold outline-none sm:text-3xl">
                {step === 0
                  ? inquiryPath === "single_team" ? "Wer startet mit welchem Team?" : "Wir möchten euch verstehen."
                  : step === finalStep
                    ? inquiryPath === "single_team" ? "Was braucht euer Team zum Start?" : "Bereit für den nächsten Schritt."
                    : "Welcher Start passt zu euch?"}
              </h2>
            </div>
            <div className="flex gap-1.5" aria-hidden="true">
              {Array.from({ length: totalSteps }, (_, item) => (
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
              <div className={`grid gap-4 ${inquiryPath === "organization" ? "sm:grid-cols-2" : ""}`}>
                <div className="space-y-2">
                  <Label htmlFor="inquiry-email">{inquiryPath === "single_team" ? "E-Mail für die Anfrage" : "Geschäftliche E-Mail"}</Label>
                  <Input id="inquiry-email" type="email" autoComplete="email" value={form.workEmail} onChange={(e) => setField("workEmail", e.target.value)} />
                </div>
                {inquiryPath === "organization" && (
                  <div className="space-y-2">
                    <Label htmlFor="inquiry-phone">Telefon{form.preferredContact === "phone" ? "" : ", optional"}</Label>
                    <Input id="inquiry-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
                  </div>
                )}
              </div>
              {inquiryPath === "organization" && (
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
              )}
              <div className="space-y-2">
                <Label htmlFor="inquiry-org">{inquiryPath === "single_team" ? "Verein / Organisation" : "Organisation"}</Label>
                <Input id="inquiry-org" autoComplete="organization" value={form.organizationName} onChange={(e) => setField("organizationName", e.target.value)} placeholder={inquiryPath === "single_team" ? "z. B. SV Beispiel" : undefined} />
              </div>
              {inquiryPath === "single_team" && (
                <div className="space-y-2">
                  <Label htmlFor="inquiry-team">Team / Altersklasse</Label>
                  <Input id="inquiry-team" value={form.teamName} onChange={(e) => setField("teamName", e.target.value)} placeholder="z. B. U17, 1. Mannschaft" />
                </div>
              )}
              {inquiryPath === "single_team" ? (
                <InquirySelect id="inquiry-organization-type" label="Umfeld" value={form.organizationType} onChange={(value) => setField("organizationType", value)}>
                  <option value="">Bitte auswählen</option>
                  <option value="local_club">Verein</option>
                  <option value="academy">Akademie</option>
                  <option value="performance_center">Leistungszentrum / NLZ</option>
                  <option value="school">Schule</option>
                  <option value="university">Universität / Hochschule</option>
                  <option value="private_provider">Privater Sportanbieter</option>
                  <option value="other">Anderes Umfeld</option>
                </InquirySelect>
              ) : (
                <div className="space-y-2">
                  <Label>Organisationstyp</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {organizationTypes.map(([value, label]) => (
                      <ChoiceButton key={value} active={form.organizationType === value} onClick={() => setField("organizationType", value)}>{label}</ChoiceButton>
                    ))}
                  </div>
                </div>
              )}
              <div className={`grid gap-4 ${inquiryPath === "organization" ? "sm:grid-cols-2" : ""}`}>
                <div className="space-y-2">
                  <Label htmlFor="inquiry-sport">Sportart(en)</Label>
                  <Input id="inquiry-sport" value={form.sports} onChange={(e) => setField("sports", e.target.value)} placeholder="z. B. Fußball, Leichtathletik" />
                </div>
                {inquiryPath === "organization" && (
                  <div className="space-y-2">
                    <Label htmlFor="inquiry-website">Website, optional</Label>
                    <Input id="inquiry-website" type="url" autoComplete="url" value={form.website} onChange={(e) => setField("website", e.target.value)} placeholder="https://" />
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {inquiryPath === "single_team"
                  ? "Nur noch das, was wir für einen passenden Teamstart wirklich wissen müssen."
                  : "Es geht nicht um ein Budgetformular. Wir wollen verstehen, was im Alltag funktionieren muss und welche Begleitung sinnvoll ist."}
              </p>
              <div className="space-y-2">
                <Label>{inquiryPath === "single_team" ? "Was ist euer wichtigstes Ziel?" : "Was soll RewirePerform unterstützen?"}</Label>
                <div className="grid gap-2">
                  {goalOptions.map(([value, label]) => (
                    <ChoiceButton
                      key={value}
                      active={form.goals.includes(value)}
                      onClick={() => inquiryPath === "single_team" ? setField("goals", [value]) : toggleArray("goals", value)}
                    >
                      {label}
                    </ChoiceButton>
                  ))}
                </div>
              </div>
              {inquiryPath === "single_team" ? (
                <InquirySelect id="inquiry-athlete-count" label="Spieler / Athleten im Team" value={form.athleteCountBand} onChange={(value) => setField("athleteCountBand", value)}>
                  <option value="unknown">Noch offen</option>
                  <option value="under_25">unter 25</option>
                  <option value="25_99">25–99</option>
                  <option value="100_499">100–499</option>
                  <option value="500_plus">500+</option>
                </InquirySelect>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      ["teamCountBand", "Teams", [["1", "1"], ["2_5", "2–5"], ["6_15", "6–15"], ["16_plus", "16+"]]],
                      ["athleteCountBand", "Athleten", [["under_25", "unter 25"], ["25_99", "25–99"], ["100_499", "100–499"], ["500_plus", "500+"]]],
                      ["coachCountBand", "Coaches", [["1", "1"], ["2_5", "2–5"], ["6_20", "6–20"], ["21_plus", "21+"]]],
                    ].map(([key, label, options]) => (
                      <InquirySelect key={key as string} id={`inquiry-${key as string}`} label={label as string} value={form[key as keyof InquiryForm] as string} onChange={(value) => setField(key as keyof InquiryForm, value as never)}>
                        <option value="unknown">Noch offen</option>
                        {(options as string[][]).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                      </InquirySelect>
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
                </>
              )}
              <div className={`grid gap-4 ${inquiryPath === "organization" ? "sm:grid-cols-2" : ""}`}>
                {inquiryPath === "organization" && (
                  <InquirySelect id="rollout-scope" label="Geplanter Umfang" value={form.rolloutScope} onChange={(value) => setField("rolloutScope", value)}>
                    <option value="exploring">Wir orientieren uns</option>
                    <option value="pilot">Kontrollierter Pilot</option>
                    <option value="multi_team">Mehrere Teams</option>
                    <option value="organization_wide">Gesamte Organisation</option>
                  </InquirySelect>
                )}
                <InquirySelect id="desired-start" label="Gewünschter Start" value={form.desiredStart} onChange={(value) => setField("desiredStart", value)}>
                  <option value="unknown">Noch offen</option>
                  <option value="asap">So bald wie möglich</option>
                  <option value="next_4_weeks">In den nächsten 4 Wochen</option>
                  <option value="next_3_months">In den nächsten 3 Monaten</option>
                  <option value="later">Später</option>
                </InquirySelect>
              </div>
              <div className="space-y-2">
                <Label>Gewünschte Begleitung</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(inquiryPath === "single_team" ? teamSupportOptions : supportOptions).map(([value, label]) => (
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

          {step === finalStep && (
            <div className="space-y-5">
              <div className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-secondary/25 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Kontakt</p>
                <p className="mt-2 break-words font-semibold">{form.contactName}</p>
                <p className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">{form.jobTitle} · {form.workEmail}</p>
              </div>
              <div className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-secondary/25 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{inquiryPath === "single_team" ? "Team" : "Organisation"}</p>
                <p className="mt-2 break-words font-semibold">{form.organizationName}</p>
                <p className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  {inquiryPath === "single_team" ? `${form.teamName} · ${form.sports}` : form.sports}
                </p>
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
                    <p className="mt-1">Wir nutzen deine Angaben zur Bearbeitung der Anfrage und können öffentlich verfügbare Informationen über das Team oder die Organisation zur Vorbereitung prüfen. Es werden weder automatisch ein Zugang noch ein Preis oder Vertrag festgelegt.</p>
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
                            Die Angaben werden ausschließlich für die persönliche Prüfung und die Kontaktaufnahme zu dieser Team- oder Organisationsanfrage verwendet.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                          <p>Verarbeitet werden die eingetragenen Kontakt-, Team-, Organisations- und Projektangaben. Bitte trage keine Namen oder persönlichen Daten von Athleten ein.</p>
                          <p>Zur Vorbereitung können wir öffentlich verfügbare Informationen über das angegebene Team oder die Organisation prüfen. Daraus entstehen weder automatisch ein Zugang noch ein Preis oder Vertrag.</p>
                          <p>Vor dem Absenden bleiben deine Angaben nur im aktuell geöffneten Formular. Nach erfolgreicher Übermittlung melden wir uns über den von dir gewählten Kontaktweg.</p>
                          <p>Wird eine echte Anfrage abgelehnt, zurückgezogen oder nicht weiterverfolgt, löschen wir die Anfrage spätestens zwölf Monate nach Abschluss. Offensichtliche Fake- oder Spam-Anfragen können nach Prüfung sofort vollständig gelöscht werden. Bei einer Zusammenarbeit werden die erforderlichen Angaben in die getrennte Organisations- und Vertragsverwaltung übernommen.</p>
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
              {publicSubmissionEnabled && <TurnstileVerification onToken={setTurnstileToken} />}
              {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            </div>
          )}

          <div className="mt-8 grid min-w-0 grid-cols-1 gap-3 border-t border-border/60 pt-5 min-[360px]:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
            <Button type="button" variant="outline" className="min-h-11 min-w-0 px-3" onClick={() => {
              setError(null);
              if (step > 0) setStep((current) => current - 1);
              else setInquiryPath(null);
            }}>
              <ChevronLeft className="h-4 w-4" /> {step > 0 ? "Zurück" : "Auswahl"}
            </Button>
            {step < finalStep ? (
              <Button type="button" className="min-h-11 min-w-0 px-3" disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>
                Weiter <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" className="min-h-11 min-w-0 px-3" disabled={!canContinue || submitting || !publicSubmissionEnabled || !turnstileToken}>
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
