import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertCircle, CheckCircle2, Database, Loader2, LockKeyhole, ShieldCheck, XCircle } from "lucide-react";
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
  withdrawGuardianDataContribution,
  type GuardianLinkStatus,
} from "@/lib/minorAuthorization";
import {
  guardianPolicyCopy,
  guardianPolicyDetails,
  MINOR_POLICY_KEY,
  minorProductSummary,
} from "@/content/minorPolicy";

const GuardianShell = ({ children }: { children: React.ReactNode }) => (
  <main className="min-h-screen bg-[#f2f4f7] px-4 py-7 text-[#18212f] sm:px-6 sm:py-12">
    <article className="mx-auto max-w-2xl overflow-hidden rounded-lg border border-[#d7dde5] bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-[#e3e7ed] px-5 py-5 sm:px-8">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#e9f7f2] text-[#177a5f]"><ShieldCheck className="h-5 w-5" /></span>
        <div><p className="text-sm font-semibold">RewirePerform</p><p className="text-xs text-[#667085]">Information für Sorgeberechtigte</p></div>
      </header>
      <div className="px-5 py-8 sm:px-8 sm:py-10">{children}</div>
      <footer className="flex flex-wrap gap-x-4 gap-y-2 border-t border-[#e3e7ed] bg-[#f8fafc] px-5 py-4 text-xs text-[#667085] sm:px-8">
        <Link to="/privacy" className="hover:text-[#18212f]">Datenschutz</Link>
        <Link to="/imprint" className="hover:text-[#18212f]">Impressum</Link>
        <Link to="/support" className="hover:text-[#18212f]">Support</Link>
      </footer>
    </article>
  </main>
);

const LinkProblem = ({ state }: { state?: string }) => (
  <GuardianShell>
    <AlertCircle className="h-10 w-10 text-[#b54708]" />
    <h1 className="mt-5 text-2xl font-semibold">Dieser Link ist nicht mehr gültig</h1>
    <p className="mt-3 text-sm leading-6 text-[#667085]">
      {state === "expired" ? "Der Link ist abgelaufen. Die minderjährige Person kann einen neuen Link senden." : "Der Link wurde bereits verwendet, ersetzt oder widerrufen."}
    </p>
    <p className="mt-4 text-sm text-[#667085]">Bei Fragen erreichst du uns unter <a className="font-medium text-[#177a5f]" href="mailto:hello@rewireperform.com">hello@rewireperform.com</a>.</p>
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
    return <GuardianShell><div className="flex min-h-52 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#177a5f]" /></div></GuardianShell>;
  }
  if (!status || ["invalid", "expired", "revoked", "delivery_failed"].includes(status.state)) return <LinkProblem state={status?.state} />;

  if (result?.state === "revoked") {
    return (
      <GuardianShell>
        <CheckCircle2 className="h-11 w-11 text-[#177a5f]" />
        <h1 className="mt-5 text-2xl font-semibold">Freigabe widerrufen</h1>
        <p className="mt-3 text-sm leading-6 text-[#667085]">Neue datenabhängige Verarbeitung ist gesperrt. Die minderjährige Person sieht den geänderten Zugangsstatus in der App.</p>
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
        setManagementMessage("Die optionale gruppierte Auswertung ist beendet. Der normale Programmzugang bleibt aktiv.");
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
        <LockKeyhole className="h-11 w-11 text-[#177a5f]" />
        <h1 className="mt-5 text-2xl font-semibold">Freigabe verwalten</h1>
        <p className="mt-3 text-sm leading-6 text-[#667085]">Du kannst die erteilte Freigabe jederzeit widerrufen. Danach werden neue datenabhängige Programmaktivitäten sofort gesperrt.</p>
        <div className="mt-6 rounded-md border border-[#f0d5d1] bg-[#fff6f5] p-4 text-sm leading-6 text-[#7a271a]">Der Widerruf betrifft den gesamten RewirePerform-Zugang und den freiwilligen Datenbeitrag.</div>
        {status.data_contribution_guardian === true ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="mt-5 w-full" disabled={busy}>
                <Database className="h-4 w-4" />
                Nur optionale Auswertung beenden
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Optionale Auswertung beenden?</AlertDialogTitle>
                <AlertDialogDescription>
                  Das normale RewirePerform-Programm bleibt aktiv. Neue gruppierte Auswertungen aus dem freiwilligen Datenbeitrag werden beendet.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={() => void withdrawOptional()}>Optionale Auswertung beenden</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <p className="mt-5 rounded-md border border-[#dfe4ea] bg-[#f8fafc] p-4 text-sm leading-6 text-[#475467]">Die optionale gruppierte Auswertung ist nicht freigegeben.</p>
        )}
        {managementMessage && <p role="status" className="mt-4 rounded-md border border-[#b7e4d5] bg-[#edf9f4] p-3 text-sm text-[#146c55]">{managementMessage}</p>}
        {actionError && <p role="alert" className="mt-5 rounded-md border border-[#f0d5d1] bg-[#fff6f5] p-3 text-sm text-[#7a271a]">Der Widerruf konnte gerade nicht sicher gespeichert werden. Bitte versuche es erneut.</p>}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="mt-7 w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Freigabe widerrufen
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Freigabe wirklich widerrufen?</AlertDialogTitle>
              <AlertDialogDescription>
                Danach kann die minderjährige Person keine neuen datenabhängigen Programmaktivitäten speichern.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => void revoke()}
              >
                Freigabe widerrufen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </GuardianShell>
    );
  }

  if (status.state !== "pending") return <LinkProblem state={status.state} />;

  if (result) {
    const approved = result.state === "approved";
    return (
      <GuardianShell>
        {approved ? <CheckCircle2 className="h-11 w-11 text-[#177a5f]" /> : <XCircle className="h-11 w-11 text-[#b42318]" />}
        <h1 className="mt-5 text-2xl font-semibold">{approved ? "Entscheidung gespeichert" : "Freigabe nicht erteilt"}</h1>
        <p className="mt-3 text-sm leading-6 text-[#667085]">
          {approved
            ? "Die minderjährige Person muss jetzt zusätzlich selbst zustimmen. Erst danach wird der Zugang freigeschaltet."
            : "Es werden keine datenabhängigen Programmfunktionen freigeschaltet."}
        </p>
        {approved && result.receiptDelivery === "sent" && <p className="mt-4 text-sm text-[#667085]">Du hast zusätzlich eine Bestätigung mit einem persönlichen Widerrufslink erhalten.</p>}
        {approved && result.receiptDelivery === "failed" && (
          <div className="mt-5 rounded-md border border-[#f0d5d1] bg-[#fff6f5] p-4 text-sm leading-6 text-[#7a271a]">
            Die Bestätigungs-E-Mail konnte nicht zugestellt werden. Bewahre diese Seite auf oder nutze den folgenden Widerrufslink.
          </div>
        )}
        {approved && result.manageUrl && (
          <a href={result.manageUrl} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md border border-[#b8c1cc] px-4 py-2 text-sm font-semibold text-[#18212f]">
            Freigabe verwalten
          </a>
        )}
      </GuardianShell>
    );
  }

  const decide = async (productAuthorized: boolean) => {
    setBusy(true);
    setActionError(false);
    try {
      setResult(await submitGuardianDecision(decisionToken, productAuthorized, productAuthorized && contribution));
    } catch {
      setActionError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GuardianShell>
      <p className="text-xs font-semibold uppercase text-[#177a5f]">Persönliche Entscheidung</p>
      <h1 className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl">{guardianPolicyCopy.title}</h1>
      <p className="mt-4 text-sm leading-6 text-[#667085]">{guardianPolicyCopy.introduction}</p>

      <div className="mt-7 rounded-md border border-[#dfe4ea] bg-[#f8fafc] p-4 text-sm leading-6 text-[#475467]">
        <h2 className="font-semibold text-[#18212f]">Worum es geht</h2>
        <p className="mt-2">{minorProductSummary.purpose} {minorProductSummary.productTracking}</p>
        <p className="mt-2">{minorProductSummary.noMedicalUse}</p>
      </div>

      <Accordion type="multiple" defaultValue={["data", "visibility"]} className="mt-5 border-y border-[#dfe4ea]">
        <AccordionItem value="data">
          <AccordionTrigger className="text-left text-sm text-[#18212f]">Welche Daten werden genutzt?</AccordionTrigger>
          <AccordionContent><ul className="space-y-2 text-sm leading-6 text-[#667085]">{guardianPolicyDetails.dataGroups.map((item) => <li key={item}>• {item}</li>)}</ul></AccordionContent>
        </AccordionItem>
        <AccordionItem value="visibility">
          <AccordionTrigger className="text-left text-sm text-[#18212f]">Was sehen Trainer?</AccordionTrigger>
          <AccordionContent><div className="space-y-3 text-sm leading-6 text-[#667085]"><p>{minorProductSummary.privateContent}</p><p>{minorProductSummary.coachVisibility}</p></div></AccordionContent>
        </AccordionItem>
        <AccordionItem value="recipients">
          <AccordionTrigger className="text-left text-sm text-[#18212f]">Welche Dienstleister erhalten Daten?</AccordionTrigger>
          <AccordionContent><ul className="space-y-2 text-sm leading-6 text-[#667085]">{guardianPolicyDetails.recipients.map((item) => <li key={item}>• {item}</li>)}</ul></AccordionContent>
        </AccordionItem>
        <AccordionItem value="rights">
          <AccordionTrigger className="text-left text-sm text-[#18212f]">Welche Rechte habt ihr?</AccordionTrigger>
          <AccordionContent><ul className="space-y-2 text-sm leading-6 text-[#667085]">{guardianPolicyDetails.rights.map((item) => <li key={item}>• {item}</li>)}</ul></AccordionContent>
        </AccordionItem>
        <AccordionItem value="retention">
          <AccordionTrigger className="text-left text-sm text-[#18212f]">Verantwortung und Speicherdauer</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 text-sm leading-6 text-[#667085]">
              <p>{guardianPolicyDetails.controller}</p>
              <ul className="space-y-2">{guardianPolicyDetails.retention.map((item) => <li key={item}>• {item}</li>)}</ul>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-5 rounded-md border border-[#dfe4ea] bg-[#f8fafc] p-4 text-sm leading-6 text-[#475467]">
        {guardianPolicyDetails.evidenceBoundary}
      </div>

      <Label htmlFor="guardian-declaration" className="mt-6 flex cursor-pointer items-start gap-3 rounded-md border border-[#dfe4ea] p-4">
        <Checkbox id="guardian-declaration" checked={guardianDeclaration} onCheckedChange={(value) => setGuardianDeclaration(value === true)} className="mt-0.5" />
        <span className="text-sm font-medium leading-6">{guardianPolicyCopy.declaration}</span>
      </Label>

      <Label htmlFor="guardian-product" className="mt-3 flex cursor-pointer items-start gap-3 rounded-md border border-[#dfe4ea] p-4">
        <Checkbox id="guardian-product" checked={productAccepted} onCheckedChange={(value) => setProductAccepted(value === true)} className="mt-0.5" />
        <span><span className="block text-sm font-semibold">{guardianPolicyCopy.productLabel}</span><span className="mt-1 block text-sm font-normal leading-5 text-[#667085]">{guardianPolicyCopy.productDetail}</span></span>
      </Label>

      <Label htmlFor="guardian-contribution" className="mt-3 flex cursor-pointer items-start gap-3 rounded-md border border-[#dfe4ea] p-4">
        <Checkbox id="guardian-contribution" checked={contribution} onCheckedChange={(value) => setContribution(value === true)} className="mt-0.5" />
        <span><span className="block text-sm font-semibold">{guardianPolicyCopy.contributionLabel}</span><span className="mt-1 block text-sm font-normal leading-5 text-[#667085]">{guardianPolicyCopy.contributionDetail}</span></span>
      </Label>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <Button variant="outline" disabled={!guardianDeclaration || busy} onClick={() => void decide(false)}>
          Nicht erlauben
        </Button>
        <Button disabled={!guardianDeclaration || !productAccepted || busy} onClick={() => void decide(true)}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Zugang erlauben
        </Button>
      </div>
      {actionError && <p role="alert" className="mt-4 rounded-md border border-[#f0d5d1] bg-[#fff6f5] p-3 text-sm text-[#7a271a]">Die Entscheidung konnte gerade nicht sicher gespeichert werden. Bitte prüfe die Verbindung und versuche es erneut.</p>}
      <p className="mt-4 text-xs leading-5 text-[#667085]">{guardianPolicyCopy.declineDetail}</p>
      <p className="mt-2 text-xs leading-5 text-[#667085]">Textversion: {MINOR_POLICY_KEY}. Weitere Einzelheiten stehen in der <Link className="font-medium text-[#177a5f]" to="/privacy">Datenschutzerklärung</Link>.</p>
    </GuardianShell>
  );
};

export default GuardianDecision;
