import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Building2, Check, KeyRound, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { BrandLockup } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePublicLanguage } from "@/contexts/PublicLanguageContext";
import { PublicLanguageSwitch } from "@/components/public/PublicLanguageSwitch";
import {
  formatCoachInviteCode,
  ORGANIZATION_INVITE_ORIGIN,
  parseOrganizationInviteUrl,
} from "@/lib/organizationInvite";

type InviteState = "idle" | "accepting" | "accepted" | "error";
type InvitationRpcClient = {
  rpc: (
    name: "accept_organization_invitation" | "accept_team_coach_invitation",
    args: { _token: string } | { _code: string },
  ) => Promise<{ error: { message?: string } | null }>;
};

const OrganizationInvite = () => {
  const { tr } = usePublicLanguage();
  const { user, loading, signOut, verifyRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const invitation = useMemo(() => {
    const parsed = parseOrganizationInviteUrl(
      new URL(`${location.pathname}${location.search}`, ORGANIZATION_INVITE_ORIGIN).toString(),
    );
    return parsed.kind === "invite" ? parsed : null;
  }, [location.pathname, location.search]);
  const isCoachCode = invitation?.inviteType === "coach_code";
  const formattedCode = isCoachCode ? formatCoachInviteCode(invitation.coachCode) : null;
  const [state, setState] = useState<InviteState>("idle");
  const [error, setError] = useState("");
  const [roleRefreshPending, setRoleRefreshPending] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);

  useEffect(() => {
    setState("idle");
    setError("");
    setRoleRefreshPending(false);
  }, [invitation?.route]);

  useEffect(() => {
    if (!loading && user && state === "accepted") {
      const timer = window.setTimeout(() => navigate("/coach", { replace: true }), 900);
      return () => window.clearTimeout(timer);
    }
  }, [loading, navigate, state, user]);

  const accept = async () => {
    if (!user || !invitation || state === "accepting") return;
    setState("accepting");
    setError("");

    if (!roleRefreshPending) {
      const rpcClient = supabase as unknown as InvitationRpcClient;
      const { error: rpcError } = invitation.inviteType === "coach_code"
        ? await rpcClient.rpc("accept_team_coach_invitation", { _code: invitation.coachCode })
        : await rpcClient.rpc("accept_organization_invitation", { _token: invitation.token });

      if (rpcError) {
        setState("error");
        setError(
          rpcError.message?.includes("email_mismatch")
            ? tr("Diese Einladung gehört zu einer anderen bestätigten E-Mail-Adresse.", "This invitation belongs to a different confirmed email address.")
            : rpcError.message?.includes("already_team_member")
              ? tr("Dieses persönliche Konto gehört bereits zu diesem Team. Bitte nutze die Einladung nur für den vorgesehenen Co-Coach.", "This personal account already belongs to the team. Please use the invitation only for the intended co-coach.")
            : rpcError.message?.includes("existing_athlete")
              ? tr("Dieser bestehende Athletenaccount kann nicht automatisch in einen Coach-Zugang umgewandelt werden. Bitte nutze den Support.", "This existing athlete account cannot automatically be changed into coach access. Please contact support.")
              : tr("Die Einladung ist ungültig, abgelaufen oder bereits verwendet.", "The invitation is invalid, expired or has already been used."),
        );
        return;
      }
      setRoleRefreshPending(true);
    }

    const verifiedRole = await verifyRole(undefined, 5_000);
    if (!verifiedRole.ok || (verifiedRole.value !== "coach" && verifiedRole.value !== "admin")) {
      setState("error");
      setError(tr("Der Zugang wurde aktiviert, konnte auf diesem Gerät aber noch nicht bestätigt werden. Bitte prüfe deine Verbindung und versuche es erneut.", "Access was activated but could not yet be confirmed on this device. Check your connection and try again."));
      return;
    }
    setRoleRefreshPending(false);
    setState("accepted");
  };

  const redirect = invitation?.route ?? "/organization/invite";
  const coachStartRoute = (mode: "signup" | "login") => {
    const params = new URLSearchParams({ redirect, auth_mode: mode });
    return `/start/coach?${params.toString()}`;
  };
  const coachAuthRoute = (mode: "signup" | "login") => {
    const params = new URLSearchParams({
      mode,
      intent: "organization",
      redirect,
      intro: "coach",
    });
    return `/auth?${params.toString()}`;
  };

  const handleDifferentAccount = async () => {
    if (switchingAccount) return;
    setSwitchingAccount(true);
    await signOut();
    navigate(coachAuthRoute("login"), { replace: true });
  };

  if (!loading && !user && invitation && !isCoachCode) {
    return <Navigate to={coachStartRoute("signup")} replace />;
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground">
      <div className="mx-auto max-w-xl">
        <div className="mb-10 flex items-center justify-between gap-3"><BrandLockup symbolSize={30} /><PublicLanguageSwitch /></div>
        <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-2xl shadow-black/20 sm:p-9">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {state === "accepted"
              ? <Check className="h-7 w-7" />
              : isCoachCode
                ? <KeyRound className="h-7 w-7" />
                : <Building2 className="h-7 w-7" />}
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {isCoachCode ? tr("Co-Coach-Einladung", "Co-coach invitation") : tr("Persönlicher Coach-Zugang", "Personal coach access")}
          </p>
          <h1 className="mt-3 font-heading text-3xl font-bold">
            {state === "accepted" ? tr("Coach-Team verbunden.", "Connected to the coaching team.") : !user && isCoachCode ? tr("Willkommen im Coach-Team.", "Welcome to the coaching team.") : tr("Gemeinsam Performance entwickeln.", "Develop performance together.")}
          </h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            {state === "accepted"
              ? tr("Du wirst jetzt in dein Coach-Dashboard weitergeleitet.", "You will now be taken to your coach dashboard.")
              : !user && isCoachCode
                ? tr("Du wurdest als Co-Coach eingeladen. Lerne zuerst die Coach-Ansicht kennen; danach erstellst du dein persönliches Konto oder meldest dich an, bestätigst deine E-Mail und verbindest dich mit dem Team.", "You have been invited as a co-coach. Explore the coach view first; then create your personal account or sign in, confirm your email and connect to the team.")
                : isCoachCode
                ? tr("Dein Coach-Code ist bereits eingetragen. Nach der Coach-Einführung registrierst du dich oder meldest dich an und bestätigst anschließend den Teamzugang.", "Your coach code is already entered. After the coach introduction, register or sign in and then confirm team access.")
                : tr("Diese persönliche Organisationseinladung ist an die bestätigte eingeladene E-Mail-Adresse gebunden.", "This personal organization invitation is bound to the confirmed invited email address.")}
          </p>

          {formattedCode && state !== "accepted" && (
            <div className="mt-6 rounded-2xl border border-primary/25 bg-primary/[0.06] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{tr("Coach-Code · bereits eingetragen", "Coach code · already entered")}</p>
              <p className="mt-1 font-mono text-lg font-semibold tracking-[0.08em] text-foreground">{formattedCode}</p>
            </div>
          )}

          {!invitation ? (
            <p role="alert" className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{tr("Der Einladungslink ist unvollständig.", "The invitation link is incomplete.")}</p>
          ) : loading ? (
            <div className="mt-7 flex items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" />{tr("Account wird geprüft.", "Checking account.")}</div>
          ) : !user && isCoachCode ? (
            <div className="mt-7 space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-secondary/25 p-4 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                {tr("Der Lead Coach verwaltet diesen Team-Link. Jede eingeladene Person nutzt einen eigenen Coach-Login; Journale, Freitext und individuelle Antworten bleiben auch für Co-Coaches privat.", "The lead coach manages this team link. Each invited person uses their own coach login; journals, free text and individual answers remain private even from co-coaches.")}
              </div>
              <Button type="button" onClick={() => navigate(coachStartRoute("signup"))} className="min-h-11 w-full">
                {tr("Coach-Einführung starten", "Start coach introduction")}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(coachStartRoute("login"))} className="min-h-11 w-full">
                {tr("Ich habe bereits einen Coach-Account", "I already have a coach account")}
              </Button>
            </div>
          ) : state !== "accepted" ? (
            <div className="mt-7 space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-secondary/25 p-4 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                {isCoachCode
                  ? tr("Die Annahme verbindet dein persönliches Konto als Co-Coach mit diesem Team. Private Athleteninhalte wie Journals, Freitext und individuelle Antworten bleiben unsichtbar.", "Accepting links your personal account to this team as a co-coach. Private athlete content such as journals, free text and individual answers remains invisible.")
                  : tr("Die Annahme aktiviert deinen persönlichen Coach-Zugang. Private Athleteninhalte wie Journals, Freitext und individuelle Antworten bleiben unsichtbar.", "Accepting activates your personal coach access. Private athlete content such as journals, free text and individual answers remains invisible.")}
              </div>
              <div className="rounded-xl border border-border/70 bg-background/45 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{tr("Du bist angemeldet als", "You are signed in as")} {user.email ?? tr("dieses persönliche Konto", "this personal account")}.</p>
                <p className="mt-1 leading-relaxed">{tr("Nutze diese Einladung nur, wenn dieses Konto dir gehört. Jeder Coach verwendet einen eigenen Zugang; Teamdaten werden über Rollen geteilt, Logins nicht.", "Use this invitation only if this account belongs to you. Each coach uses their own access; team data is shared through roles, not shared logins.")}</p>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void handleDifferentAccount()}
                  disabled={switchingAccount || state === "accepting"}
                  className="mt-2 min-h-10 px-0 text-primary hover:bg-transparent hover:text-primary"
                >
                  {switchingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  {tr("Anderes Konto verwenden", "Use another account")}
                </Button>
              </div>
              {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
              <Button onClick={accept} disabled={state === "accepting"} className="min-h-11 w-full">
                {state === "accepting" && <Loader2 className="h-4 w-4 animate-spin" />}
                {roleRefreshPending
                  ? tr("Zugang auf diesem Gerät bestätigen", "Confirm access on this device")
                  : isCoachCode ? tr("Als Co-Coach verbinden", "Connect as co-coach") : tr("Coach-Zugang aktivieren", "Activate coach access")}
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
};

export default OrganizationInvite;
