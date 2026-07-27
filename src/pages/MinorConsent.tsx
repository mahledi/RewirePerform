import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  LockKeyhole,
  Mail,
  PencilLine,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMinorAuthorization } from "@/hooks/useMinorAuthorization";
import {
  resendGuardianAuthorization,
  restartMinorAuthorization,
  saveAthleteAssent,
  setMinorAgeBand,
  startGuardianAuthorization,
  type MinorAgeBand,
  type MinorAuthorizationStatus,
} from "@/lib/minorAuthorization";
import { athletePolicyCopy, minorProductSummary } from "@/content/minorPolicy";
import AppLoadingShell from "@/components/AppLoadingShell";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { safeInternalRoute } from "@/lib/internalRoute";

const safeNextRoute = (value: string | null) =>
  safeInternalRoute(value, { blockedPathPrefixes: ["/minor-consent"] }) ?? "/dashboard";

const Shell = ({ children }: { children: React.ReactNode }) => (
  <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 sm:py-10">
    <div className="mx-auto w-full max-w-xl overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex min-h-16 items-center gap-3 border-b border-border px-5 py-4 sm:px-7">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-heading text-sm font-semibold">RewirePerform</p>
          <p className="text-xs text-muted-foreground">Sicherer Zugang</p>
        </div>
      </header>
      <div className="px-5 py-7 sm:px-8 sm:py-9">{children}</div>
      <footer className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border px-5 py-4 text-xs text-muted-foreground sm:px-8">
        <Link to="/privacy" className="hover:text-foreground">Datenschutz</Link>
        <Link to="/imprint" className="hover:text-foreground">Impressum</Link>
        <Link to="/support" className="hover:text-foreground">Support</Link>
      </footer>
    </div>
  </main>
);

const Intro = ({ icon: Icon, title, children }: {
  icon: typeof ShieldCheck;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="mb-7">
    <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <h1 className="font-heading text-2xl font-semibold leading-tight sm:text-3xl">{title}</h1>
    <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">{children}</div>
  </div>
);

const ProductFacts = () => (
  <div className="space-y-3 rounded-md border border-border bg-secondary/30 p-4 text-sm leading-6 text-muted-foreground">
    <p>{minorProductSummary.productTracking}</p>
    <p>{minorProductSummary.privateContent}</p>
    <p>{minorProductSummary.coachVisibility}</p>
    <p>{minorProductSummary.noMedicalUse}</p>
  </div>
);

const MinorConsent = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { status, loading, error, refresh, setStatus } = useMinorAuthorization();
  const { user } = useAuth();
  const nextRoute = useMemo(() => safeNextRoute(searchParams.get("next")), [searchParams]);
  const [ageBand, setAgeBand] = useState<MinorAgeBand | "">("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [productAccepted, setProductAccepted] = useState(false);
  const [contributionAccepted, setContributionAccepted] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [editingGuardianEmail, setEditingGuardianEmail] = useState(false);
  const normalizedGuardianEmail = guardianEmail.trim().toLowerCase();
  const normalizedAthleteEmail = user?.email?.trim().toLowerCase() ?? "";
  const guardianMatchesAthlete = Boolean(
    normalizedGuardianEmail
    && normalizedAthleteEmail
    && normalizedGuardianEmail === normalizedAthleteEmail,
  );
  const validGuardianEmail = /^\S+@\S+\.\S+$/u.test(normalizedGuardianEmail)
    && !guardianMatchesAthlete;

  useEffect(() => {
    if (status?.product_status === "authorized") navigate(nextRoute, { replace: true });
  }, [navigate, nextRoute, status?.product_status]);

  useEffect(() => {
    if (status?.state !== "guardian_pending") return;
    const timer = window.setInterval(() => void refresh(), 15_000);
    return () => window.clearInterval(timer);
  }, [refresh, status?.state]);

  const run = async (key: string, task: () => Promise<MinorAuthorizationStatus>) => {
    setBusy(key);
    try {
      const next = await task();
      setStatus(next);
      return next;
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "service_unavailable";
      const message = code === "rate_limit_reached"
        ? "Zu viele E-Mails in kurzer Zeit. Bitte versuche es später erneut."
        : code === "invalid_email"
          ? "Bitte prüfe die E-Mail-Adresse."
          : code === "guardian_email_matches_athlete"
            ? "Diese Adresse gehört bereits zu deinem Athletenkonto. Bitte gib die E-Mail einer sorgeberechtigten Person ein."
          : "Die Entscheidung konnte gerade nicht sicher gespeichert werden.";
      toast.error(message);
      return null;
    } finally {
      setBusy(null);
    }
  };

  const checkStatus = async () => {
    setCheckingStatus(true);
    try {
      await refresh();
    } finally {
      setCheckingStatus(false);
    }
  };

  const replaceGuardianEmail = async () => {
    const next = await run(
      "change-email",
      () => startGuardianAuthorization(normalizedGuardianEmail),
    );
    if (next) {
      setGuardianEmail("");
      setEditingGuardianEmail(false);
    }
  };

  if (!status && (loading || !error)) return <AppLoadingShell subtitle="Öffne deinen sicheren Zugang..." />;
  if (!status) {
    return (
      <Shell>
        <Intro icon={AlertCircle} title="Zugang konnte nicht geprüft werden">
          <p>Es wurde nichts freigeschaltet. Prüfe deine Verbindung und versuche es erneut.</p>
        </Intro>
        <Button className="w-full" onClick={() => void refresh()}>
          <RefreshCw className="h-4 w-4" /> Erneut prüfen
        </Button>
      </Shell>
    );
  }

  if (status.state === "unknown_age") {
    const submitAge = async () => {
      if (!ageBand) return;
      await run("age", () => setMinorAgeBand(ageBand));
    };
    return (
      <Shell>
        <Intro icon={UserRoundCheck} title="Welche Altersgruppe trifft auf dich zu?">
          <p>Wir speichern nur die Altersgruppe. Ein Geburtsdatum oder Ausweis ist nicht erforderlich.</p>
        </Intro>
        <RadioGroup value={ageBand} onValueChange={(value) => setAgeBand(value as MinorAgeBand)} className="gap-3">
          {([
            ["under_16", "Unter 16", "Eine sorgeberechtigte Person und du müssen zustimmen."],
            ["age_16_17", "16 oder 17", "Du erhältst eine eigene verständliche Entscheidung."],
            ["adult", "18 oder älter", "Für dich ist keine Freigabe durch eine sorgeberechtigte Person erforderlich."],
          ] as const).map(([value, label, detail]) => (
            <Label key={value} htmlFor={`age-${value}`} className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-4 hover:border-primary/50">
              <RadioGroupItem id={`age-${value}`} value={value} className="mt-0.5" />
              <span><span className="block text-sm font-semibold">{label}</span><span className="mt-1 block text-sm font-normal leading-5 text-muted-foreground">{detail}</span></span>
            </Label>
          ))}
        </RadioGroup>
        <Button className="mt-7 w-full" size="lg" disabled={!ageBand || busy === "age"} onClick={() => void submitAge()}>
          {busy === "age" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
          Weiter
        </Button>
      </Shell>
    );
  }

  if (status.state === "guardian_contact_required" || status.state === "guardian_expired" || status.state === "guardian_declined") {
    return (
      <Shell>
        <Intro icon={Mail} title={status.state === "guardian_declined" ? "Die Freigabe wurde nicht erteilt" : "E-Mail einer sorgeberechtigten Person"}>
          <p>Trage die Adresse eines Elternteils oder einer anderen sorgeberechtigten Person ein. Die Person erhält einen persönlichen Link und entscheidet direkt.</p>
          {status.state === "guardian_expired" && <p>Der vorherige Link ist abgelaufen. Du kannst einen neuen senden.</p>}
          {status.state === "guardian_declined" && <p>Du kannst die Entscheidung respektieren oder nach Rücksprache einen neuen Link senden.</p>}
        </Intro>
        <div className="space-y-2">
          <Label htmlFor="guardian-email">E-Mail der sorgeberechtigten Person</Label>
          <Input
            id="guardian-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={guardianEmail}
            onChange={(event) => setGuardianEmail(event.target.value)}
            placeholder="elternteil@beispiel.de"
            className="h-12"
            aria-invalid={guardianMatchesAthlete}
            aria-describedby={guardianMatchesAthlete ? "guardian-email-error" : undefined}
          />
          {guardianMatchesAthlete && (
            <p id="guardian-email-error" role="alert" className="text-sm leading-5 text-destructive">
              Diese Adresse gehört bereits zu deinem Athletenkonto. Bitte gib die E-Mail einer sorgeberechtigten Person ein.
            </p>
          )}
        </div>
        <div className="mt-4 flex gap-3 rounded-md border border-border bg-secondary/30 p-4 text-sm leading-6 text-muted-foreground">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>Kein Elternkonto, keine Werbung und keine Weitergabe an Trainer oder Verein.</p>
        </div>
        <Button
          className="mt-7 w-full"
          size="lg"
          disabled={!validGuardianEmail || busy === "send"}
          onClick={() => void run("send", () => startGuardianAuthorization(normalizedGuardianEmail))}
        >
          {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Sicheren Link senden
        </Button>
        <Button
          className="mt-3 w-full"
          variant="ghost"
          disabled={busy !== null}
          onClick={() => navigate("/settings")}
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zu den Einstellungen
        </Button>
      </Shell>
    );
  }

  if (status.state === "guardian_pending") {
    return (
      <Shell>
        <Intro icon={Clock3} title="Entscheidung noch offen">
          <p>Der Link wurde an {status.guardian_email_mask ?? "die angegebene Adresse"} gesendet. Sobald die Entscheidung vorliegt, kannst du hier selbst zustimmen.</p>
        </Intro>
        <div className="flex items-center justify-between gap-4 rounded-md border border-amber-400/25 bg-amber-400/10 p-4">
          <div><p className="text-sm font-semibold">Freigabe durch eine sorgeberechtigte Person</p><p className="mt-1 text-xs text-muted-foreground">Noch nicht entschieden</p></div>
          <Clock3 className="h-5 w-5 text-amber-500" />
        </div>
        {editingGuardianEmail && (
          <div className="mt-5 space-y-3 rounded-md border border-border p-4">
            <div className="space-y-2">
              <Label htmlFor="replacement-guardian-email">Andere E-Mail-Adresse</Label>
              <Input
                id="replacement-guardian-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                value={guardianEmail}
                onChange={(event) => setGuardianEmail(event.target.value)}
                placeholder="elternteil@beispiel.de"
                className="h-12"
                aria-invalid={guardianMatchesAthlete}
                aria-describedby={guardianMatchesAthlete ? "replacement-guardian-email-error" : undefined}
              />
              {guardianMatchesAthlete && (
                <p
                  id="replacement-guardian-email-error"
                  role="alert"
                  className="text-sm leading-5 text-destructive"
                >
                  Diese Adresse gehört bereits zu deinem Athletenkonto. Bitte gib die E-Mail einer sorgeberechtigten Person ein.
                </p>
              )}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Der bisherige Link wird ungültig, sobald der neue Link sicher erstellt wurde.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                disabled={!validGuardianEmail || busy === "change-email"}
                onClick={() => void replaceGuardianEmail()}
              >
                {busy === "change-email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Neuen Link senden
              </Button>
              <Button
                variant="ghost"
                disabled={busy !== null}
                onClick={() => {
                  setGuardianEmail("");
                  setEditingGuardianEmail(false);
                }}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        )}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            disabled={busy !== null || checkingStatus}
            onClick={() => void checkStatus()}
          >
            {checkingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Status prüfen
          </Button>
          <Button variant="secondary" disabled={busy !== null} onClick={() => void run("resend", resendGuardianAuthorization)}>
            {busy === "resend" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Erneut senden
          </Button>
        </div>
        <Button
          className="mt-3 w-full"
          variant="outline"
          disabled={busy !== null || checkingStatus}
          onClick={() => setEditingGuardianEmail((current) => !current)}
        >
          <PencilLine className="h-4 w-4" />
          E-Mail-Adresse ändern
        </Button>
        <Button
          className="mt-3 w-full"
          variant="ghost"
          disabled={busy !== null}
          onClick={() => navigate("/settings")}
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zu den Einstellungen
        </Button>
      </Shell>
    );
  }

  if (status.state === "athlete_assent_required") {
    const contributionAvailable = status.age_band !== "under_16" || status.data_contribution_guardian === true;
    return (
      <Shell>
        <Intro icon={ShieldCheck} title={athletePolicyCopy.title}>
          <p>{status.age_band === "under_16" ? athletePolicyCopy.introduction : minorProductSummary.purpose}</p>
        </Intro>
        <ProductFacts />
        <Label htmlFor="athlete-product" className="mt-5 flex cursor-pointer items-start gap-3 rounded-md border border-border p-4">
          <Checkbox id="athlete-product" checked={productAccepted} onCheckedChange={(value) => setProductAccepted(value === true)} className="mt-0.5" />
          <span><span className="block text-sm font-semibold">{athletePolicyCopy.productLabel}</span><span className="mt-1 block text-sm font-normal leading-5 text-muted-foreground">{athletePolicyCopy.productDetail}</span></span>
        </Label>
        <Label htmlFor="athlete-contribution" className="mt-3 flex cursor-pointer items-start gap-3 rounded-md border border-border p-4">
          <Checkbox
            id="athlete-contribution"
            checked={contributionAccepted}
            disabled={!contributionAvailable}
            onCheckedChange={(value) => setContributionAccepted(value === true)}
            className="mt-0.5"
          />
          <span><span className="block text-sm font-semibold">{athletePolicyCopy.contributionLabel}</span><span className="mt-1 block text-sm font-normal leading-5 text-muted-foreground">{contributionAvailable ? athletePolicyCopy.contributionDetail : "Die sorgeberechtigte Person hat die Pilot-Auswertung nicht erlaubt. Dein normales Programm bleibt davon unberührt."}</span></span>
        </Label>
        <Button
          className="mt-7 w-full"
          size="lg"
          disabled={!productAccepted || busy === "assent"}
          onClick={() => void run("assent", () => saveAthleteAssent(true, contributionAvailable && contributionAccepted))}
        >
          {busy === "assent" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Zustimmen und starten
        </Button>
        <Button
          className="mt-3 w-full"
          variant="ghost"
          disabled={busy !== null}
          onClick={() => void run("decline", () => saveAthleteAssent(false, false))}
        >
          Nicht zustimmen
        </Button>
      </Shell>
    );
  }

  if (["declined", "revoked", "policy_refresh_required"].includes(status.state)) {
    return (
      <Shell>
        <Intro icon={AlertCircle} title={status.state === "policy_refresh_required" ? "Aktualisierte Information erforderlich" : "Zugang ist nicht freigeschaltet"}>
          <p>Es werden keine neuen datenabhängigen Programmdaten gespeichert. Du kannst den sicheren Ablauf erneut beginnen.</p>
        </Intro>
        <Button className="w-full" size="lg" disabled={busy === "restart"} onClick={() => void run("restart", restartMinorAuthorization)}>
          {busy === "restart" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Freigabe erneut starten
        </Button>
        <Button
          className="mt-3 w-full"
          variant="ghost"
          disabled={busy !== null}
          onClick={() => navigate("/settings")}
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zu den Einstellungen
        </Button>
      </Shell>
    );
  }

  return <AppLoadingShell subtitle="Aktualisiere deinen Zugang..." />;
};

export default MinorConsent;
