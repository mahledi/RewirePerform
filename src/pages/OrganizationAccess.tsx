import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronLeft,
  Loader2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { BrandLockup } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    className={`min-h-11 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
      active
        ? "border-primary bg-primary/10 text-foreground"
        : "border-border/70 bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
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

  const source = window.location.protocol === "capacitor:" ? "ios" : "web";
  const publicSubmissionEnabled = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);

  const canContinue = useMemo(() => {
    if (step === 0) {
      return form.contactName.trim().length >= 2
        && form.workEmail.includes("@")
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
          <section className="w-full rounded-3xl border border-primary/20 bg-card p-6 shadow-2xl shadow-black/20 sm:p-10">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Check className="h-7 w-7" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Anfrage eingegangen</p>
            <h1 className="mt-3 font-heading text-3xl font-bold sm:text-4xl">Wir bereiten das Gespräch vor.</h1>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Deine Angaben werden persönlich geprüft. Es wurde noch kein Coach-Zugang und kein Vertrag angelegt.
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
      <div className="border-b border-border/60 bg-card/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/support" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Link>
          <BrandLockup symbolSize={26} textClassName="hidden text-sm sm:inline" />
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-14">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Für Teams und Organisationen
          </div>
          <h1 className="mt-5 font-heading text-4xl font-bold leading-tight sm:text-5xl">
            Ein professioneller Einstieg. Ohne Umwege.
          </h1>
          <p className="mt-5 max-w-xl leading-relaxed text-muted-foreground">
            Wir prüfen jede Organisation persönlich und bereiten den passenden Einsatz von RewirePerform gemeinsam vor.
          </p>
          <div className="mt-8 space-y-4 text-sm text-muted-foreground">
            {[
              [ShieldCheck, "Kein automatischer Coach-Zugang"],
              [Users, "Für jede Sportart und Organisationsgröße"],
              [Building2, "Persönliche Freigabe und klarer nächster Schritt"],
            ].map(([Icon, label]) => (
              <div key={String(label)} className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                {label as string}
              </div>
            ))}
          </div>
        </aside>

        <form onSubmit={submit} className="rounded-3xl border border-border/70 bg-card p-5 shadow-2xl shadow-black/15 sm:p-8">
          <div className="mb-7 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Schritt {step + 1} von 3</p>
              <h2 className="mt-2 font-heading text-2xl font-semibold">
                {step === 0 ? "Wer fragt an?" : step === 1 ? "Was soll entstehen?" : "Anfrage prüfen"}
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
                  <Label htmlFor="inquiry-phone">Telefon, optional</Label>
                  <Input id="inquiry-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
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
              <div className="rounded-2xl border border-border/70 bg-secondary/25 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Kontakt</p>
                <p className="mt-2 font-semibold">{form.contactName}</p>
                <p className="text-sm text-muted-foreground">{form.jobTitle} · {form.workEmail}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-secondary/25 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Organisation</p>
                <p className="mt-2 font-semibold">{form.organizationName}</p>
                <p className="text-sm text-muted-foreground">{form.sports}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-primary/5 p-5 text-sm leading-relaxed text-muted-foreground">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">Persönliche Prüfung statt automatische Freigabe</p>
                    <p className="mt-1">Wir nutzen deine Angaben zur Bearbeitung der Anfrage und können öffentlich verfügbare Informationen über die Organisation zur Vorbereitung prüfen. Es werden weder automatisch ein Zugang noch ein Preis oder Vertrag festgelegt.</p>
                    <Link to="/privacy" target="_blank" className="mt-2 inline-flex text-primary hover:underline">Datenschutz öffnen</Link>
                  </div>
                </div>
              </div>
              {!publicSubmissionEnabled && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-foreground">
                  Lokaler Entwurf: Die externe Anfrageannahme bleibt bis zur separaten Aktivierung geschlossen.
                </div>
              )}
              {publicSubmissionEnabled && <TurnstileVerification onToken={setTurnstileToken} />}
              {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            </div>
          )}

          <div className="mt-8 flex gap-3 border-t border-border/60 pt-5">
            {step > 0 && (
              <Button type="button" variant="outline" className="min-h-11" onClick={() => { setError(null); setStep((current) => current - 1); }}>
                <ChevronLeft className="h-4 w-4" /> Zurück
              </Button>
            )}
            {step < 2 ? (
              <Button type="button" className="min-h-11 flex-1" disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>
                Weiter <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" className="min-h-11 flex-1" disabled={submitting || !publicSubmissionEnabled || !turnstileToken}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Anfrage sicher absenden
              </Button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
};

export default OrganizationAccess;
