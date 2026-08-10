import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Database,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import { BrandLockup } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  inspectGuardianDecision,
  inspectGuardianManagement,
  revokeGuardianAuthorization,
  submitGuardianDecision,
  setGuardianFeedbackTextAuthorization,
  withdrawGuardianDataContribution,
  type GuardianLinkStatus,
} from "@/lib/minorAuthorization";
import { guardianFeedbackTextPolicyCopy } from "@/content/guardianFeedbackTextPolicy";
import {
  guardianPolicyCopy,
  guardianPolicyDetails,
  MINOR_POLICY_KEY,
  minorProductSummary,
} from "@/content/minorPolicy";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/config/contact";

const GuardianShell = ({ children }: { children: React.ReactNode }) => (
  <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <BrandLockup symbolSize={30} textClassName="text-base" />
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          Sichere Elternfreigabe
        </div>
      </div>
    </header>
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">{children}</div>
    <footer className="mt-10 border-t border-border px-4 py-6 text-xs text-muted-foreground sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-3">
        <Link to="/privacy" className="hover:text-foreground">Datenschutz</Link>
        <Link to="/imprint" className="hover:text-foreground">Impressum</Link>
        <Link to="/support" className="hover:text-foreground">Support</Link>
        <a href={SUPPORT_MAILTO} className="sm:ml-auto hover:text-foreground">{SUPPORT_EMAIL}</a>
      </div>
    </footer>
  </main>
);

const StatusIcon = ({ tone }: { tone: "success" | "warning" | "danger" }) => {
  const styles = tone === "success"
    ? "border-primary/30 bg-primary/10 text-primary"
    : tone === "danger"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : "border-amber-500/30 bg-amber-500/10 text-amber-400";
  const Icon = tone === "success" ? CheckCircle2 : tone === "danger" ? XCircle : AlertCircle;
  return (
    <span className={`flex h-12 w-12 items-center justify-center rounded-lg border ${styles}`}>
      <Icon className="h-6 w-6" aria-hidden="true" />
    </span>
  );
};

const LinkProblem = ({ state }: { state?: string }) => (
  <GuardianShell>
    <section className="mx-auto max-w-xl py-8 text-center sm:py-14">
      <span className="mx-auto block w-fit"><StatusIcon tone="warning" /></span>
      <h1 className="mt-6 font-heading text-2xl font-semibold sm:text-3xl">Dieser Link ist nicht mehr gültig</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {state === "expired"
          ? "Der Link ist abgelaufen. Die minderjährige Person kann einen neuen Link senden."
          : "Der Link wurde bereits verwendet, ersetzt oder widerrufen."}
      </p>
      <p className="mt-5 text-sm text-muted-foreground">
        Bei Fragen erreichst du uns unter <a className="font-medium text-primary hover:underline" href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>.
      </p>
    </section>
  </GuardianShell>
);

const GuardianDecision = () => {
  const location = useLocation();
  const linkParams = useMemo(() => new URLSearchParams(location.hash.replace(/^#/u, "")), [location.hash]);
  const decisionToken = linkParams.get("token") ?? "";
  const managementToken = linkParams.get("manage") ?? "";
  const managementMode = Boolean(managementToken);
  const [status, setStatus] = useState<GuardianLinkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [guardianDeclaration, setGuardianDeclaration] = useState(false);
  const [productAccepted, setProductAccepted] = useState(false);
  const [contribution, setContribution] = useState(false);
  const [feedbackText, setFeedbackText] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [managementMessage, setManagementMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{ state: string; receiptDelivery?: string; manageUrl?: string | null } | null>(null);

  useEffect(() => {
    if (!location.hash) return;
    window.history.replaceState(window.history.state, "", `${location.pathname}${location.search}`);
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const next = managementMode
          ? await inspectGuardianManagement(managementToken)
          : await inspectGuardianDecision(decisionToken);
        if (active) setStatus(next);
      } catch {
        if (active) setStatus({ state: "invalid" });
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [decisionToken, managementMode, managementToken]);

  if (loading) {
    return (
      <GuardianShell>
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Freigabe wird geladen" />
        </div>
      </GuardianShell>
    );
  }
  if (!status || ["invalid", "expired", "revoked", "delivery_failed"].includes(status.state)) {
    return <LinkProblem state={status?.state} />;
  }

  const athleteName = status.athlete_first_name?.trim() || "die minderjährige Person";
  const namedAthlete = status.athlete_first_name?.trim() || null;

  if (result?.state === "revoked") {
    return (
      <GuardianShell>
        <section className="mx-auto max-w-xl py-8 text-center sm:py-14">
          <span className="mx-auto block w-fit"><StatusIcon tone="success" /></span>
          <h1 className="mt-6 font-heading text-2xl font-semibold">Freigabe widerrufen</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Neue datenabhängige Verarbeitung ist gesperrt. {namedAthlete ?? "Die minderjährige Person"} sieht den geänderten Zugangsstatus in der App.
          </p>
        </section>
      </GuardianShell>
    );
  }

  if (managementMode) {
    const withdrawOptional = async () => {
      setBusy(true);
      setActionError(false);
      setManagementMessage(null);
      try {
        const next = await withdrawGuardianDataContribution(managementToken);
        setStatus(next);
        setManagementMessage("Die Pilot-Auswertung ist beendet. Der normale Programmzugang bleibt aktiv.");
      } catch {
        setActionError(true);
      } finally {
        setBusy(false);
      }
    };

    const setOptionalFeedbackText = async (authorized: boolean) => {
      setBusy(true);
      setActionError(false);
      setManagementMessage(null);
      try {
        const next = await setGuardianFeedbackTextAuthorization(managementToken, authorized);
        setStatus((current) => current ? { ...current, ...next } : next);
        setManagementMessage(authorized
          ? "Freiwillige Feedback-Kommentare sind freigegeben. Die minderjährige Person entscheidet an jedem Checkpoint weiterhin selbst."
          : "Die Freigabe für Feedback-Kommentare ist widerrufen. Kommentare und personenbeziehbare Ableitungen werden gelöscht; das Programm bleibt aktiv.");
      } catch {
        setActionError(true);
      } finally {
        setBusy(false);
      }
    };

    const revoke = async () => {
      setBusy(true);
      setActionError(false);
      try {
        setResult(await revokeGuardianAuthorization(managementToken));
      } catch {
        setActionError(true);
      } finally {
        setBusy(false);
      }
    };

    return (
      <GuardianShell>
        <section className="mx-auto max-w-2xl py-4 sm:py-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
            <LockKeyhole className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="mt-6 text-xs font-semibold uppercase text-primary">Persönlicher Verwaltungslink</p>
          <h1 className="mt-2 font-heading text-2xl font-semibold sm:text-3xl">Freigabe verwalten</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Du kannst freiwillige Feedback-Kommentare und die getrennte Pilot-Auswertung unabhängig verwalten oder die gesamte Freigabe für {athleteName} widerrufen.
          </p>

          <div className="mt-8 border-y border-border">
            <div className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div>
                <p className="text-sm font-semibold">Freiwillige Feedback-Kommentare</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Nur ausdrücklich gekennzeichnete Produktfeedback-Kommentare. Journale und private Reflexionen bleiben ausgeschlossen.
                </p>
              </div>
              {status.feedback_text_authorization_state === "granted" ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="h-11 w-full sm:w-auto" disabled={busy}>
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                      Feedback-Kommentare widerrufen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Feedback-Kommentare widerrufen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Vorhandene Kommentare und personenbeziehbare Analyseableitungen werden gelöscht. Strukturierte Antworten und der normale Programmzugang bleiben erhalten.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction onClick={() => void setOptionalFeedbackText(false)}>Jetzt widerrufen</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : status.feedback_text_authorization_available === true ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="h-11 w-full sm:w-auto" disabled={busy}>
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      Freiwillig erlauben
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Freiwillige Feedback-Kommentare erlauben?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {guardianFeedbackTextPolicyCopy.detail} {guardianFeedbackTextPolicyCopy.retention}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Nicht erlauben</AlertDialogCancel>
                      <AlertDialogAction onClick={() => void setOptionalFeedbackText(true)}>Freiwillig erlauben</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <span className="text-sm font-medium text-muted-foreground">Nicht aktiv</span>
              )}
            </div>

            <div className="grid gap-4 border-t border-border py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div>
                <p className="text-sm font-semibold">Pilot-Auswertung</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Das Programm bleibt aktiv; neue Pilotdaten werden nach dem Widerruf nicht mehr erhoben oder ausgewertet.
                </p>
              </div>
              {status.data_contribution_guardian === true ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="h-11 w-full sm:w-auto" disabled={busy}>
                      <Database className="h-4 w-4" aria-hidden="true" />
                      Pilot-Auswertung beenden
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Pilot-Auswertung beenden?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Das normale RewirePerform-Programm bleibt aktiv. Neue Pilotdaten werden nicht mehr erhoben und vorhandene personenbezogene Transferdaten aus der Pilot-Auswertung entfernt.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction onClick={() => void withdrawOptional()}>Pilot-Auswertung beenden</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <span className="text-sm font-medium text-muted-foreground">Nicht aktiv</span>
              )}
            </div>

            <div className="grid gap-4 border-t border-border py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div>
                <p className="text-sm font-semibold">Gesamte Programmfreigabe</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Danach kann {athleteName} keine neuen datenabhängigen Programmaktivitäten speichern.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="h-11 w-full sm:w-auto" disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
                    Freigabe widerrufen
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Freigabe wirklich widerrufen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Damit wird der datenabhängige RewirePerform-Zugang für {athleteName} gesperrt. Diese Entscheidung kann später nur über einen neuen Freigabeprozess ersetzt werden.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void revoke()}>
                      Freigabe widerrufen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {managementMessage && (
            <p role="status" className="mt-5 rounded-md border border-primary/25 bg-primary/10 p-4 text-sm text-foreground">
              {managementMessage}
            </p>
          )}
          {actionError && (
            <p role="alert" className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Der Widerruf konnte gerade nicht sicher gespeichert werden. Bitte versuche es erneut.
            </p>
          )}
        </section>
      </GuardianShell>
    );
  }

  if (status.state !== "pending") return <LinkProblem state={status.state} />;

  if (result) {
    const approved = result.state === "approved";
    return (
      <GuardianShell>
        <section className="mx-auto max-w-xl py-8 text-center sm:py-14">
          <span className="mx-auto block w-fit"><StatusIcon tone={approved ? "success" : "danger"} /></span>
          <h1 className="mt-6 font-heading text-2xl font-semibold">
            {approved ? "Entscheidung gespeichert" : "Freigabe nicht erteilt"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {approved
              ? `${namedAthlete ?? "Die minderjährige Person"} entscheidet jetzt zusätzlich selbst. Erst danach wird der Zugang freigeschaltet.`
              : "Es werden keine datenabhängigen Programmfunktionen freigeschaltet."}
          </p>
          {approved && result.receiptDelivery === "sent" && (
            <p className="mt-4 text-sm text-muted-foreground">
              Du hast zusätzlich eine Bestätigung mit deinem persönlichen Widerrufslink erhalten.
            </p>
          )}
          {approved && result.receiptDelivery === "failed" && (
            <p className="mt-5 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-left text-sm leading-6 text-amber-100">
              Die Bestätigungs-E-Mail konnte nicht sicher zugestellt werden. Nutze den folgenden Verwaltungslink und bewahre ihn geschützt auf.
            </p>
          )}
          {approved && result.manageUrl && (
            <Button asChild variant="outline" className="mt-6 h-11">
              <a href={result.manageUrl}>Freigabe verwalten</a>
            </Button>
          )}
        </section>
      </GuardianShell>
    );
  }

  const decide = async (productAuthorized: boolean) => {
    setBusy(true);
    setActionError(false);
    try {
      setResult(await submitGuardianDecision(
        decisionToken,
        productAuthorized,
        productAuthorized && contribution,
        productAuthorized && feedbackText,
      ));
    } catch {
      setActionError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GuardianShell>
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)] lg:gap-14">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-primary">
            {namedAthlete ? `Freigabe für ${namedAthlete}` : "Persönliche Entscheidung"}
          </p>
          <h1 className="mt-3 max-w-2xl font-heading text-3xl font-semibold leading-tight sm:text-4xl">
            {namedAthlete ? `${namedAthlete} möchte RewirePerform nutzen.` : guardianPolicyCopy.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            {namedAthlete
              ? `${namedAthlete} hat deine E-Mail-Adresse als Kontakt einer sorgeberechtigten Person angegeben. `
              : "Eine minderjährige Person hat deine E-Mail-Adresse selbst angegeben. "}
            {guardianPolicyCopy.introduction}
          </p>

          <div className="mt-8 grid border-y border-border sm:grid-cols-3">
            <div className="flex gap-3 py-4 sm:pr-4">
              <Activity className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div><p className="text-sm font-semibold">56 Tage</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Performance, Fokus und Handeln unter Druck</p></div>
            </div>
            <div className="flex gap-3 border-t border-border py-4 sm:border-l sm:border-t-0 sm:px-4">
              <EyeOff className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div><p className="text-sm font-semibold">Privat bleibt privat</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Keine Journaltexte oder Einzelantworten für Trainer</p></div>
            </div>
            <div className="flex gap-3 border-t border-border py-4 sm:border-l sm:border-t-0 sm:pl-4">
              <UserRoundCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div><p className="text-sm font-semibold">Zwei Entscheidungen</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Unter 16 entscheiden Sorgeberechtigte und Athlet</p></div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="font-heading text-lg font-semibold">Worum es geht</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {minorProductSummary.purpose} {minorProductSummary.productTracking}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{minorProductSummary.noMedicalUse}</p>
          </div>

          <Accordion type="multiple" defaultValue={["data", "visibility"]} className="mt-6 border-y border-border">
            <AccordionItem value="data">
              <AccordionTrigger className="text-left text-sm">Welche Daten werden genutzt?</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                  {guardianPolicyDetails.dataGroups.map((item) => <li key={item}>• {item}</li>)}
                </ul>
                {status.feedback_text_authorization_available === true && (
                  <p className="mt-4 border-l-2 border-primary/50 pl-3 text-sm leading-6 text-muted-foreground">
                    <span className="font-semibold text-foreground">Klare Ausnahme: </span>
                    {guardianFeedbackTextPolicyCopy.privateContentClarification}
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="visibility">
              <AccordionTrigger className="text-left text-sm">Was sehen Trainer?</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                  <p>{minorProductSummary.privateContent}</p>
                  <p>{minorProductSummary.coachVisibility}</p>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="pilot">
              <AccordionTrigger className="text-left text-sm">Was bedeutet die Pilot-Auswertung?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm leading-6 text-muted-foreground">{guardianPolicyDetails.evidenceBoundary}</p>
              </AccordionContent>
            </AccordionItem>
            {status.feedback_text_authorization_available === true && (
              <AccordionItem value="feedback-text">
                <AccordionTrigger className="text-left text-sm">Was bedeutet die Feedback-Kommentar-Freigabe?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                    <p>{guardianFeedbackTextPolicyCopy.purpose}</p>
                    <p>{guardianFeedbackTextPolicyCopy.athleteChoice}</p>
                    <p>{guardianFeedbackTextPolicyCopy.includedData}</p>
                    <p>{guardianFeedbackTextPolicyCopy.excludedData}</p>
                    <p>{guardianFeedbackTextPolicyCopy.processor}</p>
                    <p>{guardianFeedbackTextPolicyCopy.retention}</p>
                    <p>{guardianFeedbackTextPolicyCopy.withdrawal}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
            <AccordionItem value="recipients">
              <AccordionTrigger className="text-left text-sm">Welche Dienstleister erhalten Daten?</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                  {guardianPolicyDetails.recipients.map((item) => <li key={item}>• {item}</li>)}
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="rights">
              <AccordionTrigger className="text-left text-sm">Welche Rechte habt ihr?</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                  {guardianPolicyDetails.rights.map((item) => <li key={item}>• {item}</li>)}
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="retention">
              <AccordionTrigger className="text-left text-sm">Verantwortung und Speicherdauer</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                  <p>{guardianPolicyDetails.controller}</p>
                  <ul className="space-y-2">{guardianPolicyDetails.retention.map((item) => <li key={item}>• {item}</li>)}</ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <aside className="h-fit rounded-lg border border-border bg-card lg:sticky lg:top-8">
          <div className="border-b border-border px-5 py-5 sm:px-6">
            <p className="text-xs font-semibold uppercase text-primary">Deine Entscheidung</p>
            <h2 className="mt-2 font-heading text-xl font-semibold">Zugang und freiwillige Auswertungen getrennt wählen</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Keine Auswahl ist vorausgewählt. Freiwillige Entscheidungen können später unabhängig vom Programm widerrufen werden.</p>
          </div>

          <div className="px-5 sm:px-6">
            <div className="flex items-start gap-3 border-b border-border py-5">
              <Checkbox id="guardian-declaration" checked={guardianDeclaration} onCheckedChange={(value) => setGuardianDeclaration(value === true)} className="mt-0.5" />
              <Label htmlFor="guardian-declaration" className="min-h-11 min-w-0 flex-1 cursor-pointer text-sm font-medium leading-6">
                {guardianPolicyCopy.declaration}
              </Label>
            </div>

            <div className="flex items-start gap-3 border-b border-border py-5">
              <Checkbox id="guardian-product" checked={productAccepted} onCheckedChange={(value) => setProductAccepted(value === true)} className="mt-0.5" />
              <Label htmlFor="guardian-product" className="min-h-11 min-w-0 flex-1 cursor-pointer">
                <span className="block text-sm font-semibold">{guardianPolicyCopy.productLabel}</span>
                <span className="mt-1 block text-sm font-normal leading-5 text-muted-foreground">{guardianPolicyCopy.productDetail}</span>
              </Label>
            </div>

            {status.feedback_text_authorization_available === true && (
              <div className="my-3 flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/[0.06] px-4 py-5">
                <Checkbox
                  id="guardian-feedback-text"
                  checked={feedbackText}
                  onCheckedChange={(value) => setFeedbackText(value === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="guardian-feedback-text" className="min-h-11 min-w-0 flex-1 cursor-pointer">
                  <span className="block text-sm font-semibold">{guardianFeedbackTextPolicyCopy.label}</span>
                  <span className="mt-1 block text-sm font-normal leading-5 text-muted-foreground">{guardianFeedbackTextPolicyCopy.detail}</span>
                </Label>
              </div>
            )}

            <div className="flex items-start gap-3 py-5">
              <Checkbox id="guardian-contribution" checked={contribution} onCheckedChange={(value) => setContribution(value === true)} className="mt-0.5" />
              <Label htmlFor="guardian-contribution" className="min-h-11 min-w-0 flex-1 cursor-pointer">
                <span className="block text-sm font-semibold">{guardianPolicyCopy.contributionLabel}</span>
                <span className="mt-1 block text-sm font-normal leading-5 text-muted-foreground">{guardianPolicyCopy.contributionDetail}</span>
              </Label>
            </div>
          </div>

          <div className="border-t border-border px-5 py-5 sm:px-6">
            <div className="grid gap-3">
              <Button className="h-11 w-full" disabled={!guardianDeclaration || !productAccepted || busy} onClick={() => void decide(true)}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                Zugang erlauben
              </Button>
              <Button variant="outline" className="h-11 w-full" disabled={!guardianDeclaration || busy} onClick={() => void decide(false)}>
                Nicht erlauben
              </Button>
            </div>
            {actionError && (
              <p role="alert" className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                Die Entscheidung konnte gerade nicht sicher gespeichert werden. Bitte prüfe die Verbindung und versuche es erneut.
              </p>
            )}
            <p className="mt-4 text-xs leading-5 text-muted-foreground">{guardianPolicyCopy.declineDetail}</p>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Textversion: {MINOR_POLICY_KEY}. Details stehen in der <Link className="font-medium text-primary hover:underline" to="/privacy">Datenschutzerklärung</Link>.
            </p>
          </div>
        </aside>
      </section>
    </GuardianShell>
  );
};

export default GuardianDecision;
