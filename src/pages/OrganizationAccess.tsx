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
import { usePublicLanguage } from "@/contexts/PublicLanguageContext";
import { PublicLanguageSwitch } from "@/components/public/PublicLanguageSwitch";

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
const organizationTypeLabelsEn: Record<string, string> = {
  local_club: "Club", academy: "Academy", performance_center: "Performance center / youth academy",
  school: "School", university: "University / college", association: "Association",
  federation: "Federation / umbrella organization", private_provider: "Private sports provider", other: "Other organization",
};
const goalLabelsEn: Record<string, string> = {
  mental_routines: "Build mental routines into daily life", coach_transfer: "Connect coaches and athletes more closely",
  reflection: "Structure reflection and self-regulation", team_overview: "Understand the team's aggregate state",
  pilot: "Start a controlled pilot",
};
const supportLabelsEn: Record<string, string> = {
  standard: "Standard access", onboarding: "Personal introduction", customization: "Adaptation for the organization",
  reporting: "Reporting and evaluation",
};

const splitList = (value: string) => value
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean)
  .slice(0, 12);

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
  const { tr, language } = usePublicLanguage();
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
  const formRef = useRef<HTMLFormElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousStepRef = useRef(step);

  const source = searchParams.get("source") === "ios" || window.location.protocol === "capacitor:" ? "ios" : "web";
  const totalSteps = inquiryPath === "single_team" ? 2 : 3;
  const finalStep = totalSteps - 1;
  const journeyOverview = inquiryPath === "single_team"
    ? [
        ["01", tr("Einordnen", "Understand"), tr("Wir verstehen Team, Sportart und Ansprechpartner.", "We learn about the team, sport and contact person.")],
        ["02", tr("Vorbereiten", "Prepare"), tr("Wir klären Ziel, Start und passende Begleitung.", "We clarify the goal, start and appropriate support.")],
      ]
    : [
        ["01", tr("Einordnen", "Understand"), tr("Wir verstehen Struktur, Ziel und geplanten Umfang.", "We learn about your structure, goal and intended scope.")],
        ["02", tr("Vorbereiten", "Prepare"), tr("Wir klären den sinnvollsten Start und offene Fragen.", "We clarify the right starting point and open questions.")],
        ["03", tr("Freigeben", "Approve"), tr("Rollen und Datenräume werden bewusst eingerichtet.", "Roles and data access are set up deliberately.")],
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
        locale: language === "en" ? "en-DE" : navigator.language || "de-DE",
        privacy_version: ORGANIZATION_INQUIRY_PRIVACY_VERSION,
        public_research_notice_acknowledged: true,
        website_field: "",
      },
    });
    setSubmitting(false);

    if (invokeError || !data?.reference_code) {
      setError(tr("Die Anfrage konnte gerade nicht sicher übermittelt werden. Bitte versuche es später erneut.", "The inquiry could not be submitted securely right now. Please try again later."));
      return;
    }
    setReferenceCode(String(data.reference_code));
  };

  if (referenceCode) {
    return (
      <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8">
        <PublicLanguageSwitch className="absolute right-4 top-4 z-20" />
        <div className="mx-auto flex min-h-[80vh] max-w-2xl items-center">
          <section className="relative w-full overflow-hidden rounded-[2rem] border border-primary/20 bg-card p-6 shadow-2xl shadow-black/20 sm:p-10">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Check className="h-7 w-7" />
            </div>
            <p className="relative text-xs font-semibold uppercase tracking-[0.22em] text-primary">{tr("Sicher eingegangen", "Received securely")}</p>
            <h1 className="relative mt-3 font-heading text-3xl font-bold sm:text-4xl">
              {inquiryPath === "single_team" ? tr("Eure Teamanfrage ist eingegangen.", "Your team inquiry has been received.") : tr("Der erste Schritt ist gesetzt.", "The first step is done.")}
            </h1>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              {inquiryPath === "single_team"
                ? tr("Wir prüfen euren geplanten Teamstart persönlich und melden uns mit einem klaren nächsten Schritt. Es wurde noch kein Teamzugang und kein Vertrag angelegt.", "We will personally review your planned team start and get back to you with a clear next step. No team access or contract has been created yet.")
                : tr("Wir prüfen eure Struktur und euer Ziel persönlich und melden uns mit einem klaren nächsten Schritt. Es wurde noch kein Organisationszugang und kein Vertrag angelegt.", "We will personally review your structure and goal and get back to you with a clear next step. No organization access or contract has been created yet.")}
            </p>
            <div className="mt-6 rounded-2xl border border-border/70 bg-secondary/30 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{tr("Referenz", "Reference")}</p>
              <p className="mt-1 font-mono text-lg font-semibold text-foreground">{referenceCode}</p>
            </div>
            <Link to="/" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              {tr("Zurück zu RewirePerform", "Back to RewirePerform")} <ArrowRight className="h-4 w-4" />
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
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {tr("Zurück", "Back")}
            </Link>
            <div className="flex items-center gap-3"><BrandLockup className="hidden sm:inline-flex" symbolSize={26} textClassName="text-sm" /><PublicLanguageSwitch /></div>
          </div>

          <section className="relative mx-auto mt-10 max-w-4xl overflow-hidden rounded-[2rem] border border-border/70 bg-card/95 p-6 shadow-2xl shadow-black/15 sm:p-10 lg:p-12">
            <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
            <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-primary">{tr("Zugang für Teams & Organisationen", "Access for teams & organizations")}</p>
            <h1 className="relative mt-4 max-w-3xl font-heading text-4xl font-bold leading-[1.06] sm:text-5xl">
              {tr("Wie möchtet ihr RewirePerform einführen?", "How would you like to introduce RewirePerform?")}
            </h1>
            <p className="relative mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {tr("Wählt den Weg, der zu eurem tatsächlichen Start passt. Jede Anfrage wird persönlich geprüft – ohne automatische Freigabe und ohne vorgegebenes Preismodell.", "Choose the path that fits how you actually plan to start. Every inquiry is reviewed personally — without automatic approval or a predefined pricing model.")}
            </p>

            <div className="relative mt-9 grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => choosePath("single_team")}
                className="group min-h-56 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/12 via-primary/[0.05] to-background/60 p-6 text-left transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/5 active:translate-y-0"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><UsersRound className="h-6 w-6" aria-hidden="true" /></span>
                <span className="mt-6 block font-heading text-2xl font-semibold">{tr("Ein Team starten", "Start with one team")}</span>
                <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">{tr("Für Trainer und Verantwortliche, die zunächst ein konkretes Team sicher und persönlich einführen möchten.", "For coaches and decision-makers who want to introduce one specific team safely and personally first.")}</span>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">{tr("Kurze Anfrage", "Short inquiry")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
              </button>

              <button
                type="button"
                onClick={() => choosePath("organization")}
                className="group min-h-56 rounded-2xl border border-border/70 bg-background/50 p-6 text-left transition-all hover:-translate-y-0.5 hover:border-primary/45 hover:bg-primary/[0.035] active:translate-y-0"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/70 bg-secondary/60 text-primary"><Building2 className="h-6 w-6" aria-hidden="true" /></span>
                <span className="mt-6 block font-heading text-2xl font-semibold">{tr("Verein oder Organisation einführen", "Introduce a club or organization")}</span>
                <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">{tr("Für mehrere Teams, Akademien, Leistungszentren, Schulen, Hochschulen und Verbände.", "For multiple teams, academies, performance centers, schools, universities and associations.")}</span>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">{tr("Struktur einordnen", "Discuss your structure")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
              </button>
            </div>

            <p className="relative mt-7 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {tr("Bitte keine Namen oder persönlichen Daten von Athleten eingeben. Rollen und Datenräume entstehen erst nach persönlicher Prüfung.", "Please do not enter athletes' names or personal data. Roles and data access are created only after personal review.")}
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
            <ArrowLeft className="h-4 w-4" /> {tr("Zurück", "Back")}
          </Link>
          <PublicLanguageSwitch />
          <BrandLockup symbolSize={26} textClassName="hidden text-sm sm:inline" />
        </div>
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl min-w-0 gap-8 overflow-hidden px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-12 lg:py-16">
        <div className="pointer-events-none absolute -left-36 top-12 h-80 w-80 rounded-full bg-primary/[0.08] blur-3xl" />
        <aside className="min-w-0 lg:sticky lg:top-8 lg:self-start">
          <div className="relative inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            {inquiryPath === "single_team" ? tr("Teamstart", "Team start") : tr("Organisationsstart", "Organization start")}
          </div>
          <h1 className="relative mt-6 font-heading text-4xl font-bold leading-[1.04] sm:text-5xl lg:text-[3.5rem]">
            {inquiryPath === "single_team" ? tr("Bringt RewirePerform in euer Team.", "Bring RewirePerform to your team.") : tr("Mentales Training wird Teil eures Systems.", "Make mental training part of your system.")}
          </h1>
          <p className="relative mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {inquiryPath === "single_team"
              ? tr("Ein klarer mentaler Trainingsrhythmus für eure Athleten und den sportlichen Alltag. Wir bereiten jeden Teamstart persönlich vor.", "A clear mental-training rhythm for your athletes and everyday sport. We prepare every team start personally.")
              : tr("Nicht als weitere Content-Bibliothek, sondern als klarer Ablauf für Athleten, Coaches und den sportlichen Alltag. Wir bereiten jeden Organisationsstart persönlich vor.", "Not another content library, but a clear process for athletes, coaches and everyday sport. We prepare every organization start personally.")}
          </p>
          <div className="relative mt-9 overflow-hidden rounded-2xl border border-border/70 bg-card/70 backdrop-blur-sm">
            {journeyOverview.map(([number, title, text], index) => (
              <div key={String(number)} className={`flex gap-4 p-4 ${index < journeyOverview.length - 1 ? "border-b border-border/60" : ""}`}>
                <span className="pt-0.5 font-mono text-[11px] font-semibold text-primary">{number}</span>
                <div><p className="text-sm font-semibold text-foreground">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p></div>
              </div>
            ))}
          </div>
          <p className="relative mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{tr("Jede Freigabe wird persönlich geprüft. Keine automatische Team-Erstellung, keine pauschale Preisentscheidung.", "Every approval is reviewed personally. No automatic team creation or blanket pricing decision.")}</p>
        </aside>

        <form ref={formRef} onSubmit={submit} className="relative w-full min-w-0 max-w-full scroll-mt-24 rounded-[2rem] border border-border/70 bg-card/95 p-5 shadow-2xl shadow-black/15 backdrop-blur-sm sm:p-8">
          <div className="mb-7 flex min-w-0 items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{tr("Schritt", "Step")} {step + 1} {tr("von", "of")} {totalSteps}</p>
              <h2 ref={stepHeadingRef} tabIndex={-1} className="mt-2 font-heading text-2xl font-semibold outline-none sm:text-3xl">
                {step === 0
                  ? inquiryPath === "single_team" ? tr("Wer startet mit welchem Team?", "Who is starting with which team?") : tr("Wir möchten euch verstehen.", "Help us understand your organization.")
                  : step === finalStep
                    ? inquiryPath === "single_team" ? tr("Was braucht euer Team zum Start?", "What does your team need to start?") : tr("Bereit für den nächsten Schritt.", "Ready for the next step.")
                    : tr("Welcher Start passt zu euch?", "What kind of start fits you?")}
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
              <p className="text-sm leading-relaxed text-muted-foreground">{tr("Nur die Informationen, die wir für ein fokussiertes Erstgespräch und eine saubere Einordnung benötigen.", "Only the information we need for a focused first conversation and a clear assessment.")}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="inquiry-name">Name</Label>
                  <Input id="inquiry-name" autoComplete="name" value={form.contactName} onChange={(e) => setField("contactName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inquiry-role">{tr("Funktion / Position", "Role / position")}</Label>
                  <Input id="inquiry-role" autoComplete="organization-title" value={form.jobTitle} onChange={(e) => setField("jobTitle", e.target.value)} placeholder={tr("z. B. Sportdirektor, Trainerin", "e.g. sporting director, coach")} />
                </div>
              </div>
              <div className={`grid gap-4 ${inquiryPath === "organization" ? "sm:grid-cols-2" : ""}`}>
                <div className="space-y-2">
                  <Label htmlFor="inquiry-email">{inquiryPath === "single_team" ? tr("E-Mail für die Anfrage", "Email for this inquiry") : tr("Geschäftliche E-Mail", "Business email")}</Label>
                  <Input id="inquiry-email" type="email" autoComplete="email" value={form.workEmail} onChange={(e) => setField("workEmail", e.target.value)} />
                </div>
                {inquiryPath === "organization" && (
                  <div className="space-y-2">
                    <Label htmlFor="inquiry-phone">{tr("Telefon", "Phone")}{form.preferredContact === "phone" ? "" : tr(", optional", ", optional")}</Label>
                    <Input id="inquiry-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
                  </div>
                )}
              </div>
              {inquiryPath === "organization" && (
                <div className="space-y-2">
                  <Label>{tr("Wie dürfen wir uns am besten melden?", "How should we contact you?")}</Label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      ["email", "E-Mail"],
                      ["phone", tr("Telefon", "Phone")],
                      ["video_call", tr("Videogespräch", "Video call")],
                    ].map(([value, label]) => (
                      <ChoiceButton key={value} active={form.preferredContact === value} onClick={() => setField("preferredContact", value as InquiryForm["preferredContact"])}>{label}</ChoiceButton>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="inquiry-org">{inquiryPath === "single_team" ? tr("Verein / Organisation", "Club / organization") : tr("Organisation", "Organization")}</Label>
                <Input id="inquiry-org" autoComplete="organization" value={form.organizationName} onChange={(e) => setField("organizationName", e.target.value)} placeholder={inquiryPath === "single_team" ? tr("z. B. SV Beispiel", "e.g. Example FC") : undefined} />
              </div>
              {inquiryPath === "single_team" && (
                <div className="space-y-2">
                  <Label htmlFor="inquiry-team">{tr("Team / Altersklasse", "Team / age group")}</Label>
                  <Input id="inquiry-team" value={form.teamName} onChange={(e) => setField("teamName", e.target.value)} placeholder={tr("z. B. U17, 1. Mannschaft", "e.g. U17, first team")} />
                </div>
              )}
              {inquiryPath === "single_team" ? (
                <InquirySelect id="inquiry-organization-type" label={tr("Umfeld", "Environment")} value={form.organizationType} onChange={(value) => setField("organizationType", value)}>
                  <option value="">{tr("Bitte auswählen", "Please select")}</option>
                  <option value="local_club">{tr("Verein", "Club")}</option>
                  <option value="academy">{tr("Akademie", "Academy")}</option>
                  <option value="performance_center">{tr("Leistungszentrum / NLZ", "Performance center / youth academy")}</option>
                  <option value="school">{tr("Schule", "School")}</option>
                  <option value="university">{tr("Universität / Hochschule", "University / college")}</option>
                  <option value="private_provider">{tr("Privater Sportanbieter", "Private sports provider")}</option>
                  <option value="other">{tr("Anderes Umfeld", "Other environment")}</option>
                </InquirySelect>
              ) : (
                <div className="space-y-2">
                  <Label>{tr("Organisationstyp", "Organization type")}</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {organizationTypes.map(([value, label]) => (
                      <ChoiceButton key={value} active={form.organizationType === value} onClick={() => setField("organizationType", value)}>{language === "en" ? organizationTypeLabelsEn[value] : label}</ChoiceButton>
                    ))}
                  </div>
                </div>
              )}
              <div className={`grid gap-4 ${inquiryPath === "organization" ? "sm:grid-cols-2" : ""}`}>
                <div className="space-y-2">
                  <Label htmlFor="inquiry-sport">{tr("Sportart(en)", "Sport(s)")}</Label>
                  <Input id="inquiry-sport" value={form.sports} onChange={(e) => setField("sports", e.target.value)} placeholder={tr("z. B. Fußball, Leichtathletik", "e.g. football, athletics")} />
                </div>
                {inquiryPath === "organization" && (
                  <div className="space-y-2">
                    <Label htmlFor="inquiry-website">{tr("Website, optional", "Website, optional")}</Label>
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
                  ? tr("Nur noch das, was wir für einen passenden Teamstart wirklich wissen müssen.", "Just what we really need to know for a suitable team start.")
                  : tr("Es geht nicht um ein Budgetformular. Wir wollen verstehen, was im Alltag funktionieren muss und welche Begleitung sinnvoll ist.", "This is not a budget form. We want to understand what must work in daily life and which support makes sense.")}
              </p>
              <div className="space-y-2">
                <Label>{inquiryPath === "single_team" ? tr("Was ist euer wichtigstes Ziel?", "What is your most important goal?") : tr("Was soll RewirePerform unterstützen?", "What should RewirePerform support?")}</Label>
                <div className="grid gap-2">
                  {goalOptions.map(([value, label]) => (
                    <ChoiceButton
                      key={value}
                      active={form.goals.includes(value)}
                      onClick={() => inquiryPath === "single_team" ? setField("goals", [value]) : toggleArray("goals", value)}
                    >
                      {language === "en" ? goalLabelsEn[value] : label}
                    </ChoiceButton>
                  ))}
                </div>
              </div>
              {inquiryPath === "single_team" ? (
                <InquirySelect id="inquiry-athlete-count" label={tr("Spieler / Athleten im Team", "Players / athletes on the team")} value={form.athleteCountBand} onChange={(value) => setField("athleteCountBand", value)}>
                  <option value="unknown">{tr("Noch offen", "Not decided yet")}</option>
                  <option value="under_25">{tr("unter 25", "under 25")}</option>
                  <option value="25_99">25–99</option>
                  <option value="100_499">100–499</option>
                  <option value="500_plus">500+</option>
                </InquirySelect>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      ["teamCountBand", "Teams", [["1", "1"], ["2_5", "2–5"], ["6_15", "6–15"], ["16_plus", "16+"]]],
                      ["athleteCountBand", tr("Athleten", "Athletes"), [["under_25", tr("unter 25", "under 25")], ["25_99", "25–99"], ["100_499", "100–499"], ["500_plus", "500+"]]],
                      ["coachCountBand", "Coaches", [["1", "1"], ["2_5", "2–5"], ["6_20", "6–20"], ["21_plus", "21+"]]],
                    ].map(([key, label, options]) => (
                      <InquirySelect key={key as string} id={`inquiry-${key as string}`} label={label as string} value={form[key as keyof InquiryForm] as string} onChange={(value) => setField(key as keyof InquiryForm, value as never)}>
                        <option value="unknown">{tr("Noch offen", "Not decided yet")}</option>
                        {(options as string[][]).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                      </InquirySelect>
                    ))}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="inquiry-age-groups">{tr("Altersbereiche, optional", "Age groups, optional")}</Label>
                      <Input id="inquiry-age-groups" value={form.ageGroups} onChange={(e) => setField("ageGroups", e.target.value)} placeholder={tr("z. B. U15, U17, Erwachsene", "e.g. U15, U17, adults")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inquiry-levels">{tr("Leistungsbereiche, optional", "Performance levels, optional")}</Label>
                      <Input id="inquiry-levels" value={form.performanceLevels} onChange={(e) => setField("performanceLevels", e.target.value)} placeholder={tr("z. B. Breitensport, Nachwuchsleistung", "e.g. grassroots, youth performance")} />
                    </div>
                  </div>
                </>
              )}
              <div className={`grid gap-4 ${inquiryPath === "organization" ? "sm:grid-cols-2" : ""}`}>
                {inquiryPath === "organization" && (
                  <InquirySelect id="rollout-scope" label={tr("Geplanter Umfang", "Planned scope")} value={form.rolloutScope} onChange={(value) => setField("rolloutScope", value)}>
                    <option value="exploring">{tr("Wir orientieren uns", "We are exploring")}</option>
                    <option value="pilot">{tr("Kontrollierter Pilot", "Controlled pilot")}</option>
                    <option value="multi_team">{tr("Mehrere Teams", "Multiple teams")}</option>
                    <option value="organization_wide">{tr("Gesamte Organisation", "Entire organization")}</option>
                  </InquirySelect>
                )}
                <InquirySelect id="desired-start" label={tr("Gewünschter Start", "Preferred start")} value={form.desiredStart} onChange={(value) => setField("desiredStart", value)}>
                  <option value="unknown">{tr("Noch offen", "Not decided yet")}</option>
                  <option value="asap">{tr("So bald wie möglich", "As soon as possible")}</option>
                  <option value="next_4_weeks">{tr("In den nächsten 4 Wochen", "In the next 4 weeks")}</option>
                  <option value="next_3_months">{tr("In den nächsten 3 Monaten", "In the next 3 months")}</option>
                  <option value="later">{tr("Später", "Later")}</option>
                </InquirySelect>
              </div>
              <div className="space-y-2">
                <Label>{tr("Gewünschte Begleitung", "Support needed")}</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(inquiryPath === "single_team" ? teamSupportOptions : supportOptions).map(([value, label]) => (
                    <ChoiceButton key={value} active={form.supportNeeds.includes(value)} onClick={() => toggleArray("supportNeeds", value)}>{language === "en" ? supportLabelsEn[value] : label}</ChoiceButton>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inquiry-context">{tr("Was sollten wir vor dem Gespräch wissen? Optional", "What should we know before we talk? Optional")}</Label>
                <Textarea id="inquiry-context" maxLength={1600} value={form.contextNote} onChange={(e) => setField("contextNote", e.target.value)} className="min-h-28" />
                <p className="text-xs text-muted-foreground">{tr("Bitte keine Namen oder persönlichen Daten von Athleten eintragen.", "Please do not enter athletes' names or personal data.")}</p>
              </div>
            </div>
          )}

          {step === finalStep && (
            <div className="space-y-5">
              <div className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-secondary/25 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{tr("Kontakt", "Contact")}</p>
                <p className="mt-2 break-words font-semibold">{form.contactName}</p>
                <p className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">{form.jobTitle} · {form.workEmail}</p>
              </div>
              <div className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-secondary/25 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{inquiryPath === "single_team" ? "Team" : tr("Organisation", "Organization")}</p>
                <p className="mt-2 break-words font-semibold">{form.organizationName}</p>
                <p className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  {inquiryPath === "single_team" ? `${form.teamName} · ${form.sports}` : form.sports}
                </p>
              </div>
              <div className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-secondary/25 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{tr("Worum es geht", "What this is about")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.goals.map((goal) => <span key={goal} className="max-w-full break-words rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs text-foreground">{language === "en" ? goalLabelsEn[goal] ?? goal : goalLabels[goal] ?? goal}</span>)}
                  {form.supportNeeds.map((need) => <span key={need} className="max-w-full break-words rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1.5 text-xs text-primary">{language === "en" ? supportLabelsEn[need] ?? need : supportLabels[need] ?? need}</span>)}
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-primary/5 p-5 text-sm leading-relaxed text-muted-foreground">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">{tr("Persönliche Prüfung statt automatische Freigabe", "Personal review, not automatic approval")}</p>
                    <p className="mt-1">{tr("Wir nutzen deine Angaben zur Bearbeitung der Anfrage und können öffentlich verfügbare Informationen über das Team oder die Organisation zur Vorbereitung prüfen. Es werden weder automatisch ein Zugang noch ein Preis oder Vertrag festgelegt.", "We use your information to handle the inquiry and may review publicly available information about the team or organization to prepare. No access, price or contract is set automatically.")}</p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button type="button" className="mt-2 inline-flex min-h-11 items-center text-left font-medium text-primary hover:underline">
                          {tr("Datenschutz zur Anfrage ansehen", "View privacy information for this inquiry")}
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border-border/70 sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>{tr("Datenschutz bei eurer Anfrage", "Privacy for your inquiry")}</DialogTitle>
                          <DialogDescription>
                            {tr("Die Angaben werden ausschließlich für die persönliche Prüfung und die Kontaktaufnahme zu dieser Team- oder Organisationsanfrage verwendet.", "The information is used only to review this team or organization inquiry personally and to contact you about it.")}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                          <p>{tr("Verarbeitet werden die eingetragenen Kontakt-, Team-, Organisations- und Projektangaben. Bitte trage keine Namen oder persönlichen Daten von Athleten ein.", "We process the contact, team, organization and project information you enter. Please do not enter athletes' names or personal data.")}</p>
                          <p>{tr("Zur Vorbereitung können wir öffentlich verfügbare Informationen über das angegebene Team oder die Organisation prüfen. Daraus entstehen weder automatisch ein Zugang noch ein Preis oder Vertrag.", "To prepare, we may review publicly available information about the stated team or organization. This does not automatically create access, a price or a contract.")}</p>
                          <p>{tr("Vor dem Absenden bleiben deine Angaben nur im aktuell geöffneten Formular. Nach erfolgreicher Übermittlung melden wir uns über den von dir gewählten Kontaktweg.", "Before submission, your information remains only in the currently open form. After successful submission, we will contact you through your chosen channel.")}</p>
                          <p>{tr("Wird eine echte Anfrage abgelehnt, zurückgezogen oder nicht weiterverfolgt, löschen wir die Anfrage spätestens zwölf Monate nach Abschluss. Offensichtliche Fake- oder Spam-Anfragen können nach Prüfung sofort vollständig gelöscht werden. Bei einer Zusammenarbeit werden die erforderlichen Angaben in die getrennte Organisations- und Vertragsverwaltung übernommen.", "If a genuine inquiry is rejected, withdrawn or not pursued, we delete it no later than twelve months after closure. Obvious fake or spam inquiries may be deleted immediately and completely after review. If we work together, the required information moves into separate organization and contract management.")}</p>
                          <p>
                            {tr("Fragen oder Datenschutzanliegen:", "Questions or privacy concerns:")} <a href={SUPPORT_MAILTO} className="font-medium text-primary hover:underline">{SUPPORT_EMAIL}</a>
                          </p>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button type="button">{tr("Verstanden", "Understood")}</Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
              {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            </div>
          )}

          <div className="mt-8 grid min-w-0 grid-cols-1 gap-3 border-t border-border/60 pt-5 min-[360px]:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
            <Button type="button" variant="outline" className="min-h-11 min-w-0 px-3" onClick={() => {
              setError(null);
              if (step > 0) setStep((current) => current - 1);
              else setInquiryPath(null);
            }}>
              <ChevronLeft className="h-4 w-4" /> {step > 0 ? tr("Zurück", "Back") : tr("Auswahl", "Selection")}
            </Button>
            {step < finalStep ? (
              <Button type="button" className="min-h-11 min-w-0 px-3" disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>
                {tr("Weiter", "Continue")} <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" className="min-h-11 min-w-0 px-3" disabled={!canContinue || submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {tr("Anfrage absenden", "Submit inquiry")}
              </Button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
};

export default OrganizationAccess;
