import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, MailCheck, Lock, User, ArrowRight, ArrowLeft, Loader2, RefreshCw, Users, UserPlus, Sparkles, CircleAlert, KeyRound, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSportAnswerText } from "@/data/questionnaireData";
import { buildStructuredSportProfile } from "@/lib/personalization/sportTaxonomy";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AppLoadingShell from "@/components/AppLoadingShell";
import AccessStatusScreen from "@/components/access/AccessStatusScreen";
import TeamAccessLink from "@/components/access/TeamAccessLink";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  AuthStatusLayout,
  BrandMark,
  LegalLinks,
  StatusAction,
} from "@/components/auth/AuthStatusLayout";
import {
  authErrorMessage,
  isEmailNotConfirmedError,
  MIN_ACCOUNT_PASSWORD_LENGTH,
  parseAuthLinkError,
  passwordResetRedirectUrl,
  publicAuthOrigin,
} from "@/lib/authEmailFlow";
import { safeInternalRoute } from "@/lib/internalRoute";
import {
  beginPostSignupOnboarding,
  pendingPostAuthorizationTeamCode,
  pendingPostSignupIntent,
  queuePostAuthorizationTeamJoin,
} from "@/lib/postSignupOnboarding";
import { normalizeTeamInviteCode } from "@/lib/teamInvite";

type Mode = "intent" | "signup" | "login" | "verify" | "forgot" | "recovery-sent" | "link-error";
type Intent = "solo" | "join" | "organization";
type TeamJoinStatus = "idle" | "confirmation";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const forceSwitch = searchParams.get("switch") === "1";
  const redirectTo = searchParams.get("redirect");
  const safeRedirect = safeInternalRoute(redirectTo);
  const urlIntent = searchParams.get("intent");
  const authFlow = searchParams.get("flow");
  const inviteLinkInvalid = searchParams.get("invite_error") === "invalid";
  const legacyTeamCode = authFlow === "signup" ? null : searchParams.get("code");
  const urlCode = searchParams.get("team") ?? legacyTeamCode;
  const requestedMode = searchParams.get("mode");
  const authLinkError = parseAuthLinkError(window.location.search, window.location.hash);
  const confirmedTeamJoinCode = urlCode?.trim().toUpperCase() ?? "";
  const isConfirmedTeamJoinReturn = urlIntent === "join" && Boolean(confirmedTeamJoinCode);
  const isOrganizationInvite = urlIntent === "organization"
    && Boolean(safeRedirect?.startsWith("/organization/invite"));
  const { user, role, roleVerified, loading: authLoading, verifyRole, signOut } = useAuth();
  const [switching, setSwitching] = useState(forceSwitch);
  const [teamJoinStatus, setTeamJoinStatus] = useState<TeamJoinStatus>("idle");
  const [retryingRole, setRetryingRole] = useState(false);

  useEffect(() => {
    if (!forceSwitch) return;
    // Sign out any existing session so the login form is shown
    signOut().finally(() => {
      setSwitching(false);
    });
  }, [forceSwitch, signOut]);

  const initialMode: Mode = authLinkError
    ? "link-error"
    : requestedMode === "forgot"
      ? "forgot"
      : requestedMode === "login"
        ? "login"
        : requestedMode === "signup"
          ? "signup"
      : urlIntent === "join" || urlCode
        ? "signup"
        : "intent";
  const initialIntent: Intent = isOrganizationInvite
    ? "organization"
    : urlIntent === "join" || urlCode
      ? "join"
      : "solo";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [intent, setIntent] = useState<Intent>(initialIntent);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [email, setEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [teamCode, setTeamCode] = useState(urlCode ?? "");
  const authSearchRef = useRef(location.search);

  useEffect(() => {
    if (authSearchRef.current === location.search) return;
    authSearchRef.current = location.search;

    // React Router keeps the same Auth component mounted when a Universal Link
    // changes only its query. Rebase all route-owned state on that new URL so a
    // warm team invite cannot inherit a previous login/solo state (or leak its
    // team intent into a later normal login).
    setMode(initialMode);
    setIntent(initialIntent);
    setTeamCode(initialIntent === "join" ? urlCode ?? "" : "");
    setTeamJoinStatus("idle");
    setRetryingRole(false);
  }, [initialIntent, initialMode, location.search, urlCode]);

  const normalizedTeamCode = () => teamCode.trim().toUpperCase();
  const activeTeamJoinCode = intent === "join"
    ? confirmedTeamJoinCode || normalizedTeamCode()
    : "";
  const signupMetadata = user?.user_metadata as Record<string, unknown> | undefined;
  const metadataOnboardingIntent = authFlow === "signup"
    && signupMetadata?.rewireperform_post_signup_onboarding_version === "1"
    && (signupMetadata?.rewireperform_post_signup_onboarding_intent === "solo"
      || signupMetadata?.rewireperform_post_signup_onboarding_intent === "join")
    ? signupMetadata.rewireperform_post_signup_onboarding_intent
    : null;

  const emailRedirectTo = () => {
    const redirectUrl = new URL("/auth", publicAuthOrigin(window.location));
    redirectUrl.searchParams.set("flow", "signup");
    if (intent === "join") {
      redirectUrl.searchParams.set("intent", "join");
      const code = normalizedTeamCode();
      if (code) redirectUrl.searchParams.set("team", code);
    } else if (intent === "organization" && safeRedirect) {
      redirectUrl.searchParams.set("intent", "organization");
      redirectUrl.searchParams.set("redirect", safeRedirect);
    }
    return redirectUrl.toString();
  };

  const pickIntent = (i: Intent) => {
    setIntent(i);
    if (i !== "join") setTeamCode("");
    setMode("signup");
  };

  const backfillProfileSport = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("sport, sport_category, sport_format, sport_level, sport_taxonomy_version")
      .eq("id", userId)
      .maybeSingle();

    if (profile && (
      !profile.sport
      || !profile.sport_category
      || !profile.sport_format
      || !profile.sport_taxonomy_version
    )) {
      const { data: qr } = await supabase
        .from("questionnaire_responses")
        .select("answers")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (qr?.answers && typeof qr.answers === "object") {
        const answers = qr.answers as Record<string, unknown>;
        const s = getSportAnswerText(answers["sport-01"]);
        const position = answers["sport-02"] || null;
        const level = answers["sport-03"] || null;
        if (s) {
          await supabase
            .from("profiles")
            .update({
              sport: s,
              position: typeof position === "string" ? position : null,
              ...buildStructuredSportProfile(s, typeof level === "string" ? level : null),
            })
            .eq("id", userId);
        }
      }
    }
  };

  const confirmTeamJoin = () => {
    if (!activeTeamJoinCode || !user) return;
    const requiresOnboarding = Boolean(
      pendingPostSignupIntent(user.id) || metadataOnboardingIntent,
    );
    if (requiresOnboarding && !pendingPostSignupIntent(user.id)) {
      beginPostSignupOnboarding(user.id, "join");
    }
    if (!queuePostAuthorizationTeamJoin(user.id, activeTeamJoinCode, requiresOnboarding)) {
      toast.error("Bitte gib einen gültigen 6-stelligen Teamcode ein.");
      return;
    }
    navigate("/questionnaire", { replace: true });
  };

  const cancelConfirmedTeamJoin = () => {
    if (!user) return;
    const pendingIntent = pendingPostSignupIntent(user.id);
    if (!pendingIntent && metadataOnboardingIntent) {
      beginPostSignupOnboarding(user.id, metadataOnboardingIntent);
    }
    navigate(
      pendingPostSignupIntent(user.id) ? "/questionnaire" : "/dashboard",
      { replace: true },
    );
  };

  const retryRoleVerification = async () => {
    if (retryingRole) return;
    setRetryingRole(true);
    await verifyRole();
    setRetryingRole(false);
  };

  useEffect(() => {
    if (
      authLoading
      || switching
      || !user
      || !roleVerified
      || role !== "athlete"
      || !isConfirmedTeamJoinReturn
      || !activeTeamJoinCode
      || teamJoinStatus !== "idle"
    ) return;

    if (pendingPostAuthorizationTeamCode(user.id) === activeTeamJoinCode) {
      navigate("/questionnaire", { replace: true });
      return;
    }
    setTeamJoinStatus("confirmation");
  }, [activeTeamJoinCode, authLoading, isConfirmedTeamJoinReturn, navigate, role, roleVerified, switching, teamJoinStatus, user]);

  useEffect(() => {
    if (authLoading || switching || verifyingCode || !user) return;
    if (authLinkError) return;
    if (!roleVerified || role === null) return;
    if (isOrganizationInvite && safeRedirect) {
      navigate(safeRedirect, { replace: true });
      return;
    }
    if (role === "admin") {
      navigate("/admin", { replace: true });
      return;
    }
    if (role === "coach") {
      navigate("/coach", { replace: true });
      return;
    }
    if (isConfirmedTeamJoinReturn) return;
    if (authFlow === "signup") {
      if (intent === "organization" && safeRedirect) {
        navigate(safeRedirect, { replace: true });
        return;
      }
      if (!pendingPostSignupIntent(user.id) && metadataOnboardingIntent) {
        beginPostSignupOnboarding(user.id, metadataOnboardingIntent);
      }
      navigate(pendingPostSignupIntent(user.id) ? "/questionnaire" : "/dashboard", { replace: true });
    }
    else if (pendingPostSignupIntent(user.id)) navigate("/questionnaire", { replace: true });
    else if (safeRedirect) navigate(safeRedirect, { replace: true });
    else if (role === "athlete") navigate("/dashboard", { replace: true });
  }, [user, role, roleVerified, authLoading, switching, navigate, safeRedirect, isConfirmedTeamJoinReturn, isOrganizationInvite, verifyingCode, authFlow, authLinkError, metadataOnboardingIntent, intent]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (intent === "join" && !normalizeTeamInviteCode(teamCode)) {
      toast.error("Bitte gib den 6-stelligen Teamcode ein, um den Teambeitritt abzuschließen.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      if (isEmailNotConfirmedError(error)) {
        setPendingEmail(email.trim());
        setPassword("");
        setMode("verify");
      }
      toast.error(authErrorMessage(error, "Die Anmeldung konnte gerade nicht abgeschlossen werden."));
    } else {
      await backfillProfileSport(data.user.id);
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();
      const nextRoute = roleData?.role === "admin"
        ? "/admin"
        : roleData?.role === "coach"
          ? "/coach"
          : "/dashboard";
      if (intent === "join") {
        if (roleData?.role === "admin" || roleData?.role === "coach") {
          navigate(nextRoute, { replace: true });
          setLoading(false);
          return;
        }
        const requiresOnboarding = Boolean(pendingPostSignupIntent(data.user.id));
        if (!queuePostAuthorizationTeamJoin(data.user.id, teamCode, requiresOnboarding)) {
          toast.error("Bitte gib einen gültigen 6-stelligen Teamcode ein.");
          setLoading(false);
          return;
        }
        navigate("/questionnaire", { replace: true });
        setLoading(false);
        return;
      }

      toast.success("Willkommen zurück!");
      navigate(
        pendingPostSignupIntent(data.user.id) ? "/questionnaire" : safeRedirect ?? nextRoute,
        { replace: true },
      );
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (password.length < MIN_ACCOUNT_PASSWORD_LENGTH) {
      toast.error(`Passwort muss mindestens ${MIN_ACCOUNT_PASSWORD_LENGTH} Zeichen haben.`);
      return;
    }
    if (!fullName.trim()) {
      toast.error("Bitte gib deinen Namen ein.");
      return;
    }
    if (intent === "join" && !normalizeTeamInviteCode(teamCode)) {
      toast.error("Bitte gib einen gültigen 6-stelligen Teamcode ein.");
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: intent === "organization"
          ? {
              full_name: fullName.trim(),
              rewireperform_account_purpose: "organization_invite",
            }
          : {
              full_name: fullName.trim(),
              rewireperform_post_signup_onboarding_version: "1",
              rewireperform_post_signup_onboarding_intent: intent,
            },
        emailRedirectTo: emailRedirectTo(),
      },
    });

    if (error) {
      const lowerMessage = error.message.toLowerCase();
      if (
        intent === "join" &&
        (lowerMessage.includes("already registered") ||
          lowerMessage.includes("already exists") ||
          lowerMessage.includes("already been registered"))
      ) {
        toast.error("Dieses Konto existiert bereits. Melde dich bitte an.", { duration: 2200 });
        setMode("login");
        setLoading(false);
        return;
      }
      toast.error(authErrorMessage(error, "Das Konto konnte gerade nicht erstellt werden."));
      setLoading(false);
      return;
    }

    if (!data.user) {
      setLoading(false);
      return;
    }

    if (intent !== "organization") beginPostSignupOnboarding(data.user.id, intent);
    if (intent === "join" && !queuePostAuthorizationTeamJoin(data.user.id, teamCode, true)) {
      toast.error("Bitte gib einen gültigen 6-stelligen Teamcode ein.");
      setLoading(false);
      return;
    }

    if (!data.session) {
      setPendingEmail(email.trim());
      setPassword("");
      setMode("verify");
      setLoading(false);
      return;
    }

    toast.success("Konto erstellt! Willkommen.");

    navigate(intent === "organization" && safeRedirect ? safeRedirect : "/questionnaire");
    setLoading(false);
  };

  const resendConfirmation = async () => {
    if (!pendingEmail || resending) return;
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: pendingEmail,
      options: { emailRedirectTo: emailRedirectTo() },
    });
    if (error) {
      toast.error(authErrorMessage(error, "Die Bestätigungs-E-Mail konnte gerade nicht erneut gesendet werden."));
    } else {
      toast.success("Bestätigungs-E-Mail erneut gesendet.");
    }
    setResending(false);
  };

  const requestPasswordReset = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const normalizedEmail = email.trim();
    if (!normalizedEmail || loading || resending) return;

    const isRepeat = mode === "recovery-sent";
    if (isRepeat) setResending(true);
    else setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: passwordResetRedirectUrl(publicAuthOrigin(window.location)),
    });

    if (error) {
      toast.error(authErrorMessage(error, "Die Reset-E-Mail konnte gerade nicht gesendet werden."));
    } else {
      setPendingEmail(normalizedEmail);
      setVerificationCode("");
      setMode("recovery-sent");
      if (isRepeat) toast.success("Reset-E-Mail erneut gesendet.");
    }

    setLoading(false);
    setResending(false);
  };

  const completeEmailVerification = async () => {
    if (!pendingEmail || verificationCode.length !== 6 || verifyingCode) return;
    setVerifyingCode(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: pendingEmail,
      token: verificationCode,
      type: "email",
    });

    if (error || !data.user) {
      toast.error(authErrorMessage(error ?? {}, "Der Bestätigungscode konnte nicht geprüft werden."));
      setVerifyingCode(false);
      return;
    }

    await backfillProfileSport(data.user.id);
    if (intent !== "organization") beginPostSignupOnboarding(data.user.id, intent);
    if (intent === "join") {
      if (!queuePostAuthorizationTeamJoin(data.user.id, teamCode, true)) {
        toast.error("Bitte gib einen gültigen 6-stelligen Teamcode ein.");
        setVerifyingCode(false);
        return;
      }
      navigate("/questionnaire", { replace: true });
      return;
    }

    if (intent === "organization" && safeRedirect) {
      toast.success("E-Mail bestätigt.");
      navigate(safeRedirect, { replace: true });
      return;
    }

    toast.success("E-Mail bestätigt.");
    navigate("/questionnaire", { replace: true });
  };

  const verifyRecoveryCode = async () => {
    if (!pendingEmail || verificationCode.length !== 6 || verifyingCode) return;
    setVerifyingCode(true);
    const { error } = await supabase.auth.verifyOtp({
      email: pendingEmail,
      token: verificationCode,
      type: "recovery",
    });

    if (error) {
      toast.error(authErrorMessage(error, "Der Sicherheitscode konnte nicht geprüft werden."));
      setVerifyingCode(false);
      return;
    }

    navigate("/auth/reset-password?verified=1", { replace: true });
  };

  if (user && role === "athlete" && isConfirmedTeamJoinReturn && teamJoinStatus === "confirmation") {
    return (
      <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-background px-4 py-8 sm:px-6 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md min-w-0 text-center"
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="mb-3 font-heading text-3xl font-bold">Team beitreten?</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Bestätige den Teambeitritt bewusst. Erst danach wird dein Athletenkonto dem Team zugeordnet.
          </p>
          <button
            type="button"
            onClick={confirmTeamJoin}
            className="mt-8 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-heading text-sm font-semibold text-primary-foreground transition-shadow hover:shadow-glow"
          >
            <Users className="h-4 w-4" aria-hidden="true" />
            Team beitreten
          </button>
          <button
            type="button"
            onClick={cancelConfirmedTeamJoin}
            className="mt-3 min-h-11 w-full px-4 py-3 text-sm font-medium text-primary hover:underline"
          >
            {pendingPostSignupIntent(user.id) || metadataOnboardingIntent
              ? "Ohne Team fortfahren"
              : "Abbrechen"}
          </button>
          <LegalLinks />
        </motion.div>
      </div>
    );
  }

  // Don't flash login UI while restoring session or while a logged-in user is being redirected
  if (authLoading || switching) {
    return (
      <AppLoadingShell subtitle={isConfirmedTeamJoinReturn ? "Schließe deinen Teambeitritt ab..." : "Stelle deine Sitzung wieder her..."} />
    );
  }

  if (user && !roleVerified && mode !== "link-error") {
    return (
      <AccessStatusScreen
        checking={retryingRole}
        title={retryingRole ? "Zugang wird geprüft" : "Rolle konnte nicht sicher geprüft werden"}
        message={retryingRole
          ? "Wir stellen deine sichere Sitzung wieder her."
          : "Deine Daten bleiben geschützt. Stelle die Verbindung wieder her und prüfe den Zugang erneut."}
        onRetry={retryingRole ? undefined : () => void retryRoleVerification()}
      />
    );
  }

  if (user && !forceSwitch && mode !== "link-error") {
    return (
      <AppLoadingShell subtitle={isConfirmedTeamJoinReturn ? "Schließe deinen Teambeitritt ab..." : "Stelle deine Sitzung wieder her..."} />
    );
  }

  if (mode === "link-error") {
    return (
      <AuthStatusLayout
        icon={<CircleAlert className="h-7 w-7" aria-hidden="true" />}
        title="Der Link ist nicht mehr gültig."
        description={authLinkError?.message ?? "Dieser Sicherheitslink konnte nicht bestätigt werden."}
        tone="error"
      >
        <button
          type="button"
          onClick={() => setMode("login")}
          className="mt-8 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-heading text-sm font-semibold text-primary-foreground hover:shadow-glow"
        >
          Zur Anmeldung
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setMode("forgot")}
          className="mt-3 min-h-11 w-full px-4 py-3 text-sm font-medium text-primary hover:underline"
        >
          Neuen Passwort-Link anfordern
        </button>
      </AuthStatusLayout>
    );
  }

  if (mode === "forgot") {
    return (
      <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-background px-4 py-8 sm:px-6 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md min-w-0"
        >
          <button
            type="button"
            onClick={() => setMode("login")}
            className="mb-8 flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Zur Anmeldung
          </button>
          <BrandMark />
          <div className="mb-8 mt-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <KeyRound className="h-7 w-7" aria-hidden="true" />
            </div>
            <h1 className="mb-3 font-heading text-3xl font-bold">Passwort zurücksetzen.</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Gib deine E-Mail-Adresse ein. Du erhältst einen sicheren Link und einen sechsstelligen Code.
            </p>
          </div>
          <form onSubmit={requestPasswordReset} className="space-y-4">
            <FieldEmail value={email} onChange={setEmail} />
            <SubmitButton loading={loading} label="Reset-E-Mail senden" />
          </form>
          <LegalLinks />
        </motion.div>
      </div>
    );
  }

  if (mode === "recovery-sent") {
    return (
      <AuthStatusLayout
        icon={<MailCheck className="h-7 w-7" aria-hidden="true" />}
        title="Prüfe deine E-Mails."
        description={
          <>
            Falls ein Konto für <strong className="break-all text-foreground">{pendingEmail}</strong> besteht, ist die Reset-E-Mail unterwegs.
          </>
        }
      >
        <AuthCodeEntry
          value={verificationCode}
          onChange={setVerificationCode}
          onSubmit={() => void verifyRecoveryCode()}
          loading={verifyingCode}
          label="Code prüfen"
        />
        <StatusAction
          variant="secondary"
          onClick={() => void requestPasswordReset()}
          disabled={resending}
          className="mt-4"
        >
          {resending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
          E-Mail erneut senden
        </StatusAction>
        <StatusAction
          variant="link"
          onClick={() => {
            setEmail(pendingEmail);
            setMode("forgot");
          }}
          className="mt-3"
        >
          E-Mail-Adresse ändern
        </StatusAction>
      </AuthStatusLayout>
    );
  }

  if (mode === "verify") {
    return (
      <AuthStatusLayout
        icon={<MailCheck className="h-7 w-7" aria-hidden="true" />}
        title="Bestätige deine E-Mail."
        description={(
          <>
            <p>
            Wir haben einen Bestätigungslink an<br />
            <strong className="break-all text-foreground">{pendingEmail}</strong> gesendet.
            </p>
            <p className="mt-3">
              Öffne den Link in der E-Mail oder gib den sechsstelligen Code ein.
            </p>
          </>
        )}
      >
        <AuthCodeEntry
          value={verificationCode}
          onChange={setVerificationCode}
          onSubmit={() => void completeEmailVerification()}
          loading={verifyingCode}
          label="E-Mail bestätigen"
        />
        <StatusAction
          variant="secondary"
          onClick={() => void resendConfirmation()}
          disabled={resending}
          className="mt-8"
        >
          {resending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
          E-Mail erneut senden
        </StatusAction>
        <StatusAction
          variant="link"
          onClick={() => setMode("signup")}
          className="mt-3"
        >
          E-Mail-Adresse ändern
        </StatusAction>
      </AuthStatusLayout>
    );
  }

  // ─── INTENT SELECTION ──────────────────────────────────────────
  if (mode === "intent") {
    return (
      <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-background px-4 py-8 sm:px-6 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md min-w-0"
        >
          <div className="text-center mb-8">
            <BrandMark className="mb-6" />
            <h1 className="font-heading text-3xl font-bold mb-2">Wie startest du?</h1>
            <p className="text-muted-foreground text-sm">
              Wähle, wie du RewirePerform nutzen möchtest.
            </p>
          </div>

          <div className="space-y-3">
            <IntentCard
              icon={<Sparkles className="w-5 h-5" />}
              title="Allein starten"
              description="Dein persönliches Mental-Performance-Programm — nur für dich."
              onClick={() => pickIntent("solo")}
            />
            <IntentCard
              icon={<UserPlus className="w-5 h-5" />}
              title="Team beitreten"
              description="Du hast einen Teamcode von deinem Coach oder Trainer erhalten."
              onClick={() => pickIntent("join")}
            />
          </div>

          <TeamAccessLink
            className="group mt-6 flex min-h-20 items-center gap-4 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/[0.05] to-card px-4 py-4 text-left transition-all hover:border-primary/50 hover:bg-primary/[0.12] active:scale-[0.99]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Für Verantwortliche</span>
              <span className="mt-1 block font-heading text-base font-semibold text-foreground">Für Teams &amp; Organisationen</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">RewirePerform kontrolliert in einem Team, Verein oder einer Organisation einführen.</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </TeamAccessLink>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Bereits registriert?{" "}
            <button
              onClick={() => setMode("login")}
              className="text-primary font-medium hover:underline"
            >
              Anmelden
            </button>
          </p>
          <LegalLinks />
        </motion.div>
      </div>
    );
  }

  // ─── LOGIN ────────────────────────────────────────────────────
  if (mode === "login") {
    return (
      <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-background px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md min-w-0"
        >
          <div className="text-center mb-10">
            <BrandMark className="mb-6" />
            <h1 className="font-heading text-3xl font-bold mb-2">Willkommen zurück.</h1>
            <p className="text-muted-foreground text-sm">
              {intent === "join"
                ? "Melde dich an, um den Teambeitritt mit deinem Code abzuschließen."
                : intent === "organization"
                  ? "Melde dich mit der eingeladenen E-Mail-Adresse an, um den Organisationszugang zu bestätigen."
                : "Melde dich an, um dein Programm fortzusetzen."}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {intent === "join" && (
              <div>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    name="team-code"
                    autoComplete="one-time-code"
                    aria-label="Teamcode"
                    placeholder="Teamcode (6 Zeichen)"
                    value={teamCode}
                    onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm uppercase tracking-widest"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 px-1">
                  Der Code wird nach dem Login erneut geprüft und deinem Konto zugeordnet.
                </p>
              </div>
            )}
            <FieldEmail value={email} onChange={setEmail} />
            <FieldPassword value={password} onChange={setPassword} autoComplete="current-password" />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="min-h-11 px-1 text-sm font-medium text-primary hover:underline"
              >
                Passwort vergessen?
              </button>
            </div>
            <SubmitButton loading={loading} label="Anmelden" />
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Noch kein Konto?{" "}
            <button
              onClick={() => setMode(intent === "join" ? "signup" : "intent")}
              className="text-primary font-medium hover:underline"
            >
              Registrieren
            </button>
          </p>
          <LegalLinks />
        </motion.div>
      </div>
    );
  }

  // ─── SIGNUP ───────────────────────────────────────────────────
  const intentTitle =
    intent === "solo" ? "Du startest allein."
    : intent === "join" ? "Du trittst einem Team bei."
    : "Dein Organisationszugang.";
  const intentSub =
    intent === "solo" ? "Dein personalisiertes Mental-Performance-Programm beginnt gleich."
    : intent === "join" ? "Gib den Teamcode ein, den du als Athletin oder Athlet erhalten hast."
    : "Registriere dich mit der persönlich eingeladenen E-Mail-Adresse. Danach bestätigst du deine freigegebene Rolle.";

  return (
    <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-background px-4 py-8 sm:px-6 sm:py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md min-w-0"
      >
        <button
          onClick={() => intent === "organization" && safeRedirect ? navigate(safeRedirect) : setMode("intent")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Zurück
        </button>

        <div className="text-center mb-8">
          <BrandMark className="mb-6" />
          <h1 className="font-heading text-3xl font-bold mb-2">{intentTitle}</h1>
          <p className="text-muted-foreground text-sm">{intentSub}</p>
        </div>

        {inviteLinkInvalid && intent === "join" && (
          <p role="alert" className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground">
            Der Einladungslink ist nicht vollständig. Gib den sechsstelligen Teamcode bitte erneut ein.
          </p>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              name="name"
              autoComplete="name"
              aria-label="Vollständiger Name"
              required
              placeholder="Vollständiger Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            />
          </div>

          {intent === "join" && (
            <div>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  name="team-code"
                  autoComplete="one-time-code"
                  aria-label="Teamcode"
                  placeholder="Teamcode (6 Zeichen)"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm uppercase tracking-widest"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 px-1">
                Der Teamcode verbindet dein Athletenkonto nach der E-Mail-Bestätigung mit dem Team.
              </p>
            </div>
          )}

          <FieldEmail value={email} onChange={setEmail} />
          <FieldPassword value={password} onChange={setPassword} autoComplete="new-password" />
          <SubmitButton loading={loading} label="Konto erstellen" />
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Bereits registriert?{" "}
          <button
            onClick={() => setMode("login")}
            className="text-primary font-medium hover:underline"
          >
            {intent === "join" ? "Anmelden und Teambeitritt abschließen" : "Anmelden"}
          </button>
        </p>
        <LegalLinks />
      </motion.div>
    </div>
  );
};

// ─── small subcomponents ───
const IntentCard = ({
  icon, title, description, onClick,
}: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex w-full min-w-0 items-start gap-3 rounded-2xl border border-border/50 bg-secondary/50 p-4 text-left transition-all hover:border-primary/60 hover:bg-secondary sm:gap-4 sm:p-5"
  >
    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/20 transition-colors">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <div className="font-heading font-semibold text-base mb-1">{title}</div>
      <div className="text-xs text-muted-foreground leading-relaxed">{description}</div>
    </div>
    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
  </button>
);

const AuthCodeEntry = ({
  value,
  onChange,
  onSubmit,
  loading,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  label: string;
}) => (
  <div className="mt-7 border-t border-border/60 pt-6">
    <label className="mb-3 block text-sm font-medium text-foreground">Sicherheitscode</label>
    <InputOTP
      maxLength={6}
      value={value}
      onChange={onChange}
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label="Sechsstelliger Sicherheitscode"
      containerClassName="justify-center"
      disabled={loading}
    >
      <InputOTPGroup>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <InputOTPSlot key={index} index={index} className="h-12 w-11 border-border/70 bg-secondary/50 text-base sm:w-12" />
        ))}
      </InputOTPGroup>
    </InputOTP>
    <button
      type="button"
      onClick={onSubmit}
      disabled={loading || value.length !== 6}
      className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-heading text-sm font-semibold text-primary-foreground hover:shadow-glow disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
      {label}
    </button>
  </div>
);

const FieldEmail = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="relative">
    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
    <input
      type="email"
      name="email"
      autoComplete="email"
      aria-label="E-Mail"
      required
      placeholder="E-Mail"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
    />
  </div>
);

const FieldPassword = ({
  value,
  onChange,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete: "current-password" | "new-password";
}) => (
  <div className="relative">
    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
    <input
      type="password"
      name="password"
      autoComplete={autoComplete}
      aria-label="Passwort"
      required
      placeholder="Passwort"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
    />
  </div>
);

const SubmitButton = ({ loading, label }: { loading: boolean; label: string }) => (
  <motion.button
    whileHover={{ scale: 1.01 }}
    whileTap={{ scale: 0.99 }}
    type="submit"
    disabled={loading}
    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-primary font-heading font-semibold text-primary-foreground hover:shadow-glow transition-all disabled:opacity-50"
  >
    {loading ? (
      <Loader2 className="w-5 h-5 animate-spin" />
    ) : (
      <>
        {label}
        <ArrowRight className="w-4 h-4" />
      </>
    )}
  </motion.button>
);

export default Auth;
