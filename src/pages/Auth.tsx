import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { Mail, MailCheck, Lock, User, ArrowRight, ArrowLeft, Loader2, RefreshCw, Users, UserPlus, Sparkles, CircleAlert, KeyRound, Building2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSportAnswerText } from "@/data/questionnaireData";
import { buildStructuredSportProfile } from "@/lib/personalization/sportTaxonomy";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AppLoadingShell from "@/components/AppLoadingShell";
import AccessStatusScreen from "@/components/access/AccessStatusScreen";
import TeamAccessLink from "@/components/access/TeamAccessLink";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  AuthStatusLayout,
  BrandMark,
  LegalLinks,
  StatusAction,
} from "@/components/auth/AuthStatusLayout";
import {
  authErrorMessage,
  authEmailRedirectUrl,
  isEmailNotConfirmedError,
  MIN_ACCOUNT_PASSWORD_LENGTH,
  parseAuthLinkError,
  passwordResetRedirectUrl,
  publicAuthOrigin,
} from "@/lib/authEmailFlow";
import { safeInternalRoute } from "@/lib/internalRoute";
import {
  beginPostSignupOnboarding,
  completePostSignupOnboarding,
  pendingPostAuthorizationTeamCode,
  pendingPostSignupIntent,
  queuePostAuthorizationTeamJoin,
} from "@/lib/postSignupOnboarding";
import { normalizeTeamInviteCode } from "@/lib/teamInvite";
import {
  formatCoachInviteCode,
  ORGANIZATION_INVITE_ORIGIN,
  parseOrganizationInviteUrl,
} from "@/lib/organizationInvite";
import {
  EXISTING_ACCOUNT_NOTICE,
  isObscuredExistingAccountSignUp,
} from "@/lib/authAccountCollision";
import { trackAppEvent } from "@/lib/monitoring";
import { usePublicLanguage } from "@/contexts/PublicLanguageContext";
import { PublicLanguageSwitch } from "@/components/public/PublicLanguageSwitch";

type Mode = "intent" | "signup" | "login" | "verify" | "forgot" | "recovery-sent" | "link-error";
type Intent = "solo" | "join" | "organization";
type TeamJoinStatus = "idle" | "confirmation";

const Auth = () => {
  const { tr, language } = usePublicLanguage();
  const localizedAuthError = (error: Parameters<typeof authErrorMessage>[0], fallbackDe: string, fallbackEn: string) => {
    const message = authErrorMessage(error, fallbackDe);
    if (language === "de") return message;
    const known: Record<string, string> = {
      "E-Mail oder Passwort ist nicht korrekt.": "Email or password is incorrect.",
      "Bitte bestätige zuerst deine E-Mail-Adresse.": "Please confirm your email address first.",
      "Bitte warte kurz, bevor du eine weitere E-Mail anforderst.": "Please wait before requesting another email.",
      [`Das Passwort muss mindestens ${MIN_ACCOUNT_PASSWORD_LENGTH} Zeichen haben.`]: `Your password must contain at least ${MIN_ACCOUNT_PASSWORD_LENGTH} characters.`,
      "Das neue Passwort muss sich vom bisherigen Passwort unterscheiden.": "Your new password must be different from your current password.",
      "Der Code ist abgelaufen. Fordere bitte eine neue E-Mail an.": "The code has expired. Please request a new email.",
      "Der Code ist ungültig oder wurde bereits verwendet.": "The code is invalid or has already been used.",
    };
    return known[message] ?? fallbackEn;
  };
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const forceSwitch = searchParams.get("switch") === "1";
  const redirectTo = searchParams.get("redirect");
  const safeRedirect = safeInternalRoute(redirectTo);
  const parsedOrganizationInvite = safeRedirect
    ? parseOrganizationInviteUrl(new URL(safeRedirect, ORGANIZATION_INVITE_ORIGIN).toString())
    : null;
  const organizationInvite = parsedOrganizationInvite?.kind === "invite"
    ? parsedOrganizationInvite
    : null;
  const coachInviteCode = organizationInvite?.inviteType === "coach_code"
    ? formatCoachInviteCode(organizationInvite.coachCode)
    : null;
  const personalOrganizationInviteToken = organizationInvite?.inviteType === "legacy_token"
    ? organizationInvite.token
    : null;
  const urlIntent = searchParams.get("intent");
  const authFlow = searchParams.get("flow");
  const inviteLinkInvalid = searchParams.get("invite_error") === "invalid";
  const legacyTeamCode = authFlow === "signup" ? null : searchParams.get("code");
  const urlCode = searchParams.get("team") ?? legacyTeamCode;
  const requestedMode = searchParams.get("mode");
  const introAudience = searchParams.get("intro") === "athlete"
    ? "athlete"
    : searchParams.get("intro") === "coach"
      ? "coach"
      : null;
  const authLinkError = parseAuthLinkError(window.location.search, window.location.hash);
  const confirmedTeamJoinCode = urlCode?.trim().toUpperCase() ?? "";
  const isConfirmedTeamJoinReturn = urlIntent === "join" && Boolean(confirmedTeamJoinCode);
  const isOrganizationInvite = urlIntent === "organization" && organizationInvite !== null;
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
  const [signupNotice, setSignupNotice] = useState<string | null>(null);
  const [organizationInviteEmailHint, setOrganizationInviteEmailHint] = useState<string | null>(null);
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
    setSignupNotice(null);
  }, [initialIntent, initialMode, location.search, urlCode]);

  useEffect(() => {
    let active = true;
    if (!personalOrganizationInviteToken) {
      setOrganizationInviteEmailHint(null);
      return () => { active = false; };
    }

    const loadHint = async () => {
      // The token is a 256-bit invitation capability. The RPC returns only a
      // masked address and no account or role information.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("get_organization_invitation_email_hint", {
        _token: personalOrganizationInviteToken,
      });
      if (active) setOrganizationInviteEmailHint(error || typeof data !== "string" ? null : data);
    };
    void loadHint();
    return () => { active = false; };
  }, [personalOrganizationInviteToken]);

  const normalizedTeamCode = () => teamCode.trim().toUpperCase();
  const activeTeamJoinCode = intent === "join"
    ? confirmedTeamJoinCode || normalizedTeamCode()
    : "";
  const athleteIntroComplete = introAudience === "athlete" && intent !== "organization";
  const coachIntroComplete = introAudience === "coach" && intent === "organization";
  const signupMetadata = user?.user_metadata as Record<string, unknown> | undefined;
  const metadataOnboardingIntent = authFlow === "signup"
    && signupMetadata?.rewireperform_post_signup_onboarding_version === "1"
    && (signupMetadata?.rewireperform_post_signup_onboarding_intent === "solo"
      || signupMetadata?.rewireperform_post_signup_onboarding_intent === "join")
    ? signupMetadata.rewireperform_post_signup_onboarding_intent
    : null;

  const emailRedirectTo = () => {
    const redirectUrl = authEmailRedirectUrl(
      publicAuthOrigin(window.location),
      Capacitor.getPlatform(),
    );
    redirectUrl.searchParams.set("flow", "signup");
    if (intent === "join") {
      redirectUrl.searchParams.set("intent", "join");
      const code = normalizedTeamCode();
      if (code) redirectUrl.searchParams.set("team", code);
    } else if (intent === "organization" && safeRedirect) {
      redirectUrl.searchParams.set("intent", "organization");
      redirectUrl.searchParams.set("redirect", safeRedirect);
    }
    if (athleteIntroComplete) redirectUrl.searchParams.set("intro", "athlete");
    if (coachIntroComplete) redirectUrl.searchParams.set("intro", "coach");
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
    if (athleteIntroComplete) completePostSignupOnboarding(user.id, "join");
    const requiresOnboarding = Boolean(
      !athleteIntroComplete && (pendingPostSignupIntent(user.id) || metadataOnboardingIntent),
    );
    if (requiresOnboarding && !pendingPostSignupIntent(user.id)) {
      beginPostSignupOnboarding(user.id, "join");
    }
    if (!queuePostAuthorizationTeamJoin(user.id, activeTeamJoinCode, requiresOnboarding)) {
      toast.error(tr("Bitte gib einen gültigen 6-stelligen Teamcode ein.", "Please enter a valid six-character team code."));
      return;
    }
    navigate("/questionnaire", { replace: true });
  };

  const cancelConfirmedTeamJoin = () => {
    if (!user) return;
    if (athleteIntroComplete) completePostSignupOnboarding(user.id, "join");
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
      if (athleteIntroComplete && metadataOnboardingIntent) {
        completePostSignupOnboarding(user.id, metadataOnboardingIntent);
      } else if (!pendingPostSignupIntent(user.id) && metadataOnboardingIntent) {
        beginPostSignupOnboarding(user.id, metadataOnboardingIntent);
      }
      navigate(pendingPostSignupIntent(user.id) ? "/questionnaire" : "/dashboard", { replace: true });
    }
    else if (pendingPostSignupIntent(user.id)) navigate("/questionnaire", { replace: true });
    else if (safeRedirect) navigate(safeRedirect, { replace: true });
    else if (role === "athlete") navigate("/dashboard", { replace: true });
  }, [user, role, roleVerified, authLoading, switching, navigate, safeRedirect, isConfirmedTeamJoinReturn, isOrganizationInvite, verifyingCode, authFlow, authLinkError, metadataOnboardingIntent, intent, athleteIntroComplete]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (intent === "join" && !normalizeTeamInviteCode(teamCode)) {
      toast.error(tr("Bitte gib den 6-stelligen Teamcode ein, um den Teambeitritt abzuschließen.", "Enter your six-character team code to finish joining the team."));
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
      toast.error(localizedAuthError(error, "Die Anmeldung konnte gerade nicht abgeschlossen werden.", "Sign-in could not be completed right now."));
    } else {
      await trackAppEvent({
        eventName: "auth_login",
        status: "success",
        route: "/auth",
        metadata: { stage: "password_session_created" },
      });
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
      if (roleData?.role !== "admin" && roleData?.role !== "coach" && athleteIntroComplete) {
        completePostSignupOnboarding(data.user.id, intent === "join" ? "join" : "solo");
      }
      if (intent === "join") {
        if (roleData?.role === "admin" || roleData?.role === "coach") {
          navigate(nextRoute, { replace: true });
          setLoading(false);
          return;
        }
        const requiresOnboarding = Boolean(!athleteIntroComplete && pendingPostSignupIntent(data.user.id));
        if (!queuePostAuthorizationTeamJoin(data.user.id, teamCode, requiresOnboarding)) {
          toast.error(tr("Bitte gib einen gültigen 6-stelligen Teamcode ein.", "Please enter a valid six-character team code."));
          setLoading(false);
          return;
        }
        navigate("/questionnaire", { replace: true });
        setLoading(false);
        return;
      }

      toast.success(tr("Willkommen zurück!", "Welcome back!"));
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
      toast.error(tr(`Passwort muss mindestens ${MIN_ACCOUNT_PASSWORD_LENGTH} Zeichen haben.`, `Password must contain at least ${MIN_ACCOUNT_PASSWORD_LENGTH} characters.`));
      return;
    }
    if (!fullName.trim()) {
      toast.error(tr("Bitte gib deinen Namen ein.", "Please enter your name."));
      return;
    }
    if (intent === "join" && !normalizeTeamInviteCode(teamCode)) {
      toast.error(tr("Bitte gib einen gültigen 6-stelligen Teamcode ein.", "Please enter a valid six-character team code."));
      return;
    }
    setLoading(true);
    setSignupNotice(null);

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

    if (isObscuredExistingAccountSignUp(data.user, error)) {
      setSignupNotice(tr(EXISTING_ACCOUNT_NOTICE, "An account may already exist for this email address. Please sign in or reset your password."));
      setPassword("");
      setLoading(false);
      return;
    }

    if (error) {
      toast.error(localizedAuthError(error, "Das Konto konnte gerade nicht erstellt werden.", "The account could not be created right now."));
      setLoading(false);
      return;
    }

    if (!data.user) {
      setLoading(false);
      return;
    }

    if (intent !== "organization") {
      if (athleteIntroComplete) completePostSignupOnboarding(data.user.id, intent);
      else beginPostSignupOnboarding(data.user.id, intent);
    }
    if (intent === "join" && !queuePostAuthorizationTeamJoin(data.user.id, teamCode, !athleteIntroComplete)) {
      toast.error(tr("Bitte gib einen gültigen 6-stelligen Teamcode ein.", "Please enter a valid six-character team code."));
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

    toast.success(tr("Konto erstellt! Willkommen.", "Account created. Welcome!"));

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
      toast.error(localizedAuthError(error, "Die Bestätigungs-E-Mail konnte gerade nicht erneut gesendet werden.", "The confirmation email could not be sent again right now."));
    } else {
      toast.success(tr("Bestätigungs-E-Mail erneut gesendet.", "Confirmation email sent again."));
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
      redirectTo: passwordResetRedirectUrl(
        publicAuthOrigin(window.location),
        Capacitor.getPlatform(),
      ),
    });

    if (error) {
      toast.error(localizedAuthError(error, "Die Reset-E-Mail konnte gerade nicht gesendet werden.", "The password reset email could not be sent right now."));
    } else {
      setPendingEmail(normalizedEmail);
      setVerificationCode("");
      setMode("recovery-sent");
      if (isRepeat) toast.success(tr("Reset-E-Mail erneut gesendet.", "Password reset email sent again."));
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
      toast.error(localizedAuthError(error ?? {}, "Der Bestätigungscode konnte nicht geprüft werden.", "The confirmation code could not be verified."));
      setVerifyingCode(false);
      return;
    }

    await backfillProfileSport(data.user.id);
    if (intent !== "organization") {
      if (athleteIntroComplete) completePostSignupOnboarding(data.user.id, intent);
      else beginPostSignupOnboarding(data.user.id, intent);
    }
    if (intent === "join") {
      if (!queuePostAuthorizationTeamJoin(data.user.id, teamCode, !athleteIntroComplete)) {
        toast.error(tr("Bitte gib einen gültigen 6-stelligen Teamcode ein.", "Please enter a valid six-character team code."));
        setVerifyingCode(false);
        return;
      }
      navigate("/questionnaire", { replace: true });
      return;
    }

    if (intent === "organization" && safeRedirect) {
      toast.success(tr("E-Mail bestätigt.", "Email confirmed."));
      navigate(safeRedirect, { replace: true });
      return;
    }

    toast.success(tr("E-Mail bestätigt.", "Email confirmed."));
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
      toast.error(localizedAuthError(error, "Der Sicherheitscode konnte nicht geprüft werden.", "The security code could not be verified."));
      setVerifyingCode(false);
      return;
    }

    navigate("/auth/reset-password?verified=1", { replace: true });
  };

  if (user && role === "athlete" && isConfirmedTeamJoinReturn && teamJoinStatus === "confirmation") {
    return (
      <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-background px-4 py-8 sm:px-6 sm:py-10">
        <PublicLanguageSwitch className="absolute right-4 top-4 z-20" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md min-w-0 text-center"
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="mb-3 font-heading text-3xl font-bold">{tr("Team beitreten?", "Join this team?")}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {tr("Bestätige den Teambeitritt bewusst. Erst danach wird dein Athletenkonto dem Team zugeordnet.", "Confirm that you want to join this team. Your athlete account will only be linked to the team after you confirm.")}
          </p>
          <button
            type="button"
            onClick={confirmTeamJoin}
            className="mt-8 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-heading text-sm font-semibold text-primary-foreground transition-shadow hover:shadow-glow"
          >
            <Users className="h-4 w-4" aria-hidden="true" />
            {tr("Team beitreten", "Join team")}
          </button>
          <button
            type="button"
            onClick={cancelConfirmedTeamJoin}
            className="mt-3 min-h-11 w-full px-4 py-3 text-sm font-medium text-primary hover:underline"
          >
            {pendingPostSignupIntent(user.id) || metadataOnboardingIntent
              ? tr("Ohne Team fortfahren", "Continue without a team")
              : tr("Abbrechen", "Cancel")}
          </button>
          <LegalLinks />
        </motion.div>
      </div>
    );
  }

  // Don't flash login UI while restoring session or while a logged-in user is being redirected
  if (authLoading || switching) {
    return (
      <AppLoadingShell subtitle={isConfirmedTeamJoinReturn ? tr("Schließe deinen Teambeitritt ab...", "Finishing your team join...") : tr("Stelle deine Sitzung wieder her...", "Restoring your session...")} />
    );
  }

  if (!user && !forceSwitch && !authLinkError && authFlow !== "signup") {
    if (initialMode === "intent") {
      return <Navigate to="/start" replace />;
    }

    if (initialIntent === "organization" && isOrganizationInvite && introAudience !== "coach" && safeRedirect) {
      const params = new URLSearchParams({
        redirect: safeRedirect,
        auth_mode: initialMode === "login" ? "login" : "signup",
      });
      return <Navigate to={`/start/coach?${params.toString()}`} replace />;
    }

    if (
      initialIntent !== "organization"
      && introAudience !== "athlete"
      && (initialMode === "signup" || initialIntent === "join")
    ) {
      const params = new URLSearchParams({
        intent: initialIntent === "join" ? "join" : "solo",
        auth_mode: initialMode === "login" ? "login" : "signup",
      });
      const code = normalizeTeamInviteCode(urlCode ?? "");
      if (initialIntent === "join" && code) params.set("team", code);
      return <Navigate to={`/start/athlete?${params.toString()}`} replace />;
    }
  }

  if (user && !roleVerified && mode !== "link-error") {
    return (
      <AccessStatusScreen
        checking={retryingRole}
        title={retryingRole ? tr("Zugang wird geprüft", "Checking access") : tr("Rolle konnte nicht sicher geprüft werden", "Could not verify your role securely")}
        message={retryingRole
          ? tr("Wir stellen deine sichere Sitzung wieder her.", "We are restoring your secure session.")
          : tr("Deine Daten bleiben geschützt. Stelle die Verbindung wieder her und prüfe den Zugang erneut.", "Your data remains protected. Restore the connection and check your access again.")}
        onRetry={retryingRole ? undefined : () => void retryRoleVerification()}
      />
    );
  }

  if (user && !forceSwitch && mode !== "link-error") {
    return (
      <AppLoadingShell subtitle={isConfirmedTeamJoinReturn ? tr("Schließe deinen Teambeitritt ab...", "Finishing your team join...") : tr("Stelle deine Sitzung wieder her...", "Restoring your session...")} />
    );
  }

  if (mode === "link-error") {
    return (
      <AuthStatusLayout
        icon={<CircleAlert className="h-7 w-7" aria-hidden="true" />}
        title={tr("Der Link ist nicht mehr gültig.", "This link is no longer valid.")}
        description={language === "en" ? (authLinkError?.code === "otp_expired" || authLinkError?.code === "access_denied" ? "This security link has expired or has already been used." : "This security link could not be confirmed.") : authLinkError?.message ?? "Dieser Sicherheitslink konnte nicht bestätigt werden."}
        tone="error"
      >
        <button
          type="button"
          onClick={() => setMode("login")}
          className="mt-8 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-heading text-sm font-semibold text-primary-foreground hover:shadow-glow"
        >
          {tr("Zur Anmeldung", "Go to sign-in")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setMode("forgot")}
          className="mt-3 min-h-11 w-full px-4 py-3 text-sm font-medium text-primary hover:underline"
        >
          {tr("Neuen Passwort-Link anfordern", "Request a new password link")}
        </button>
      </AuthStatusLayout>
    );
  }

  if (mode === "forgot") {
    return (
      <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-background px-4 py-8 sm:px-6 sm:py-10">
        <PublicLanguageSwitch className="absolute right-4 top-4 z-20" />
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
            {tr("Zur Anmeldung", "Back to sign-in")}
          </button>
          <BrandMark />
          <div className="mb-8 mt-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <KeyRound className="h-7 w-7" aria-hidden="true" />
            </div>
            <h1 className="mb-3 font-heading text-3xl font-bold">{tr("Passwort zurücksetzen.", "Reset your password.")}</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {tr("Gib deine E-Mail-Adresse ein. Du erhältst einen sicheren Link und einen sechsstelligen Code.", "Enter your email address. You will receive a secure link and a six-digit code.")}
            </p>
          </div>
          <form onSubmit={requestPasswordReset} className="space-y-4">
            <FieldEmail value={email} onChange={setEmail} />
            <SubmitButton loading={loading} label={tr("Reset-E-Mail senden", "Send reset email")} />
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
        title={tr("Prüfe deine E-Mails.", "Check your email.")}
        description={
          <>
            {tr("Falls ein Konto für", "If an account exists for")} <strong className="break-all text-foreground">{pendingEmail}</strong>{tr(" besteht, ist die Reset-E-Mail unterwegs.", ", the reset email is on its way.")}
          </>
        }
      >
        <AuthCodeEntry
          value={verificationCode}
          onChange={setVerificationCode}
          onSubmit={() => void verifyRecoveryCode()}
          loading={verifyingCode}
          label={tr("Code prüfen", "Verify code")}
        />
        <StatusAction
          variant="secondary"
          onClick={() => void requestPasswordReset()}
          disabled={resending}
          className="mt-4"
        >
          {resending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
          {tr("E-Mail erneut senden", "Resend email")}
        </StatusAction>
        <StatusAction
          variant="link"
          onClick={() => {
            setEmail(pendingEmail);
            setMode("forgot");
          }}
          className="mt-3"
        >
          {tr("E-Mail-Adresse ändern", "Change email address")}
        </StatusAction>
      </AuthStatusLayout>
    );
  }

  if (mode === "verify") {
    return (
      <AuthStatusLayout
        icon={<MailCheck className="h-7 w-7" aria-hidden="true" />}
        title={tr("Bestätige deine E-Mail.", "Confirm your email.")}
        description={(
          <>
            <p>
            {tr("Wir haben einen Bestätigungslink an", "We sent a confirmation link to")}<br />
            <strong className="break-all text-foreground">{pendingEmail}</strong>{tr(" gesendet.", ".")}
            </p>
            <p className="mt-3">
              {tr("Öffne den Link in der E-Mail oder gib den sechsstelligen Code ein.", "Open the link in the email or enter the six-digit code.")}
            </p>
          </>
        )}
      >
        <AuthCodeEntry
          value={verificationCode}
          onChange={setVerificationCode}
          onSubmit={() => void completeEmailVerification()}
          loading={verifyingCode}
          label={tr("E-Mail bestätigen", "Confirm email")}
        />
        <StatusAction
          variant="secondary"
          onClick={() => void resendConfirmation()}
          disabled={resending}
          className="mt-8"
        >
          {resending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
          {tr("E-Mail erneut senden", "Resend email")}
        </StatusAction>
        <StatusAction
          variant="link"
          onClick={() => setMode("signup")}
          className="mt-3"
        >
          {tr("E-Mail-Adresse ändern", "Change email address")}
        </StatusAction>
      </AuthStatusLayout>
    );
  }

  // ─── INTENT SELECTION ──────────────────────────────────────────
  if (mode === "intent") {
    return (
      <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-background px-4 py-8 sm:px-6 sm:py-10">
        <PublicLanguageSwitch className="absolute right-4 top-4 z-20" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md min-w-0"
        >
          <div className="text-center mb-8">
            <BrandMark className="mb-6" />
            <h1 className="font-heading text-3xl font-bold mb-2">{tr("Wie startest du?", "How would you like to start?")}</h1>
            <p className="text-muted-foreground text-sm">
              {tr("Wähle, wie du RewirePerform nutzen möchtest.", "Choose how you want to use RewirePerform.")}
            </p>
          </div>

          <div className="space-y-3">
            <IntentCard
              icon={<UserPlus className="w-5 h-5" />}
              title={tr("Team beitreten", "Join a team")}
              description={tr("Du hast einen Teamcode oder Einladungslink von deinem Coach erhalten. Dann starte hier.", "Have a team code or invitation link from your coach? Start here.")}
              onClick={() => pickIntent("join")}
            />
            <IntentCard
              icon={<Sparkles className="w-5 h-5" />}
              title={tr("Ohne Team starten", "Start without a team")}
              description={tr("Du hast keine Teameinladung und nutzt dein persönliches Programm allein.", "No team invitation? Use your personal program on your own.")}
              onClick={() => pickIntent("solo")}
            />
          </div>

          <TeamAccessLink
            className="group mt-6 flex min-h-20 items-center gap-4 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/[0.05] to-card px-4 py-4 text-left transition-all hover:border-primary/50 hover:bg-primary/[0.12] active:scale-[0.99]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{tr("Für Verantwortliche", "For decision-makers")}</span>
              <span className="mt-1 block font-heading text-base font-semibold text-foreground">{tr("Für Teams & Organisationen", "For teams & organizations")}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{tr("RewirePerform kontrolliert in einem Team, Verein oder einer Organisation einführen.", "Introduce RewirePerform in your team, club or organization in a controlled way.")}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </TeamAccessLink>

          <p className="text-center text-sm text-muted-foreground mt-8">
            {tr("Bereits registriert?", "Already registered?")}{" "}
            <button
              onClick={() => setMode("login")}
              className="text-primary font-medium hover:underline"
            >
              {tr("Anmelden", "Sign in")}
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
        <PublicLanguageSwitch className="absolute right-4 top-4 z-20" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md min-w-0"
        >
          <div className="text-center mb-10">
            <BrandMark className="mb-6" />
            <h1 className="font-heading text-3xl font-bold mb-2">{tr("Willkommen zurück.", "Welcome back.")}</h1>
            <p className="text-muted-foreground text-sm">
              {intent === "join"
                ? tr("Melde dich an, um den Teambeitritt mit deinem Code abzuschließen.", "Sign in to finish joining the team with your code.")
                : intent === "organization"
                  ? coachInviteCode
                    ? tr("Melde dich an. Dein Co-Coach-Code ist bereits eingetragen.", "Sign in. Your co-coach code is already entered.")
                    : tr("Melde dich mit der eingeladenen E-Mail-Adresse an, um den Organisationszugang zu bestätigen.", "Sign in with the invited email address to confirm your organization access.")
                : tr("Melde dich an, um dein Programm fortzusetzen.", "Sign in to continue your program.")}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {coachInviteCode && <CoachInviteCodeCard code={coachInviteCode} />}
            {intent === "join" && (
              <div>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    name="team-code"
                    autoComplete="one-time-code"
                    aria-label={tr("Teamcode", "Team code")}
                    placeholder={tr("Teamcode (6 Zeichen)", "Team code (6 characters)")}
                    value={teamCode}
                    onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm uppercase tracking-widest"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 px-1">
                  {tr("Der Code wird nach dem Login erneut geprüft und deinem Konto zugeordnet.", "The code is checked again after sign-in and linked to your account.")}
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
                {tr("Passwort vergessen?", "Forgot your password?")}
              </button>
            </div>
            <SubmitButton loading={loading} label={tr("Anmelden", "Sign in")} />
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {tr("Noch kein Konto?", "No account yet?")}{" "}
            <button
              onClick={() => setMode(intent === "join" ? "signup" : "intent")}
              className="text-primary font-medium hover:underline"
            >
              {tr("Registrieren", "Register")}
            </button>
          </p>
          <LegalLinks />
        </motion.div>
      </div>
    );
  }

  // ─── SIGNUP ───────────────────────────────────────────────────
  const intentTitle =
    intent === "solo" ? tr("Du startest allein.", "Start on your own.")
    : intent === "join" ? tr("Du trittst einem Team bei.", "Join your team.")
    : coachInviteCode ? tr("Dein Coach-Zugang.", "Your coach access.") : tr("Dein Organisationszugang.", "Your organization access.");
  const intentSub =
    intent === "solo" ? tr("Dein personalisiertes Mental-Performance-Programm beginnt gleich.", "Your personalized mental performance program is about to begin.")
    : intent === "join" ? tr("Gib den Teamcode ein, den du als Athletin oder Athlet erhalten hast.", "Enter the team code you received as an athlete.")
    : coachInviteCode
      ? tr("Registriere dich als Coach. Dein Co-Coach-Code bleibt bis zur Team-Verbindung eingetragen.", "Register as a coach. Your co-coach code stays entered until you connect with the team.")
      : tr("Registriere dich mit der persönlich eingeladenen E-Mail-Adresse. Danach bestätigst du deine freigegebene Rolle.", "Register with the email address that received the personal invitation. Then confirm your approved role.");

  return (
    <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-background px-4 py-8 sm:px-6 sm:py-10">
      <PublicLanguageSwitch className="absolute right-4 top-4 z-20" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md min-w-0"
      >
        <button
          onClick={() => intent === "organization" && safeRedirect ? navigate(safeRedirect) : setMode("intent")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> {tr("Zurück", "Back")}
        </button>

        <div className="text-center mb-8">
          <BrandMark className="mb-6" />
          <h1 className="font-heading text-3xl font-bold mb-2">{intentTitle}</h1>
          <p className="text-muted-foreground text-sm">{intentSub}</p>
        </div>

        {inviteLinkInvalid && intent === "join" && (
          <p role="alert" className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground">
            {tr("Der Einladungslink ist nicht vollständig. Gib den sechsstelligen Teamcode bitte erneut ein.", "The invitation link is incomplete. Please enter your six-character team code again.")}
          </p>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          {coachInviteCode && <CoachInviteCodeCard code={coachInviteCode} />}
          {organizationInviteEmailHint && (
            <div className="rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-3 text-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{tr("Persönlich eingeladene Adresse", "Personally invited address")}</p>
              <p className="mt-1 font-medium text-foreground">{organizationInviteEmailHint}</p>
            </div>
          )}
          {signupNotice && (
            <div role="alert" className="rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-3 text-sm text-foreground">
              <p>{signupNotice}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tr("Du kannst dich anmelden, dein Passwort zurücksetzen oder die E-Mail-Adresse im Formular ändern.", "You can sign in, reset your password or change the email address in the form.")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setMode("login")}>{tr("Anmelden", "Sign in")}</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setMode("forgot")}>{tr("Passwort zurücksetzen", "Reset password")}</Button>
              </div>
            </div>
          )}
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              name="name"
              autoComplete="name"
              aria-label={tr("Vollständiger Name", "Full name")}
              required
              placeholder={tr("Vollständiger Name", "Full name")}
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
                  aria-label={tr("Teamcode", "Team code")}
                  placeholder={tr("Teamcode (6 Zeichen)", "Team code (6 characters)")}
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm uppercase tracking-widest"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 px-1">
                {tr("Der Teamcode verbindet dein Athletenkonto nach der E-Mail-Bestätigung mit dem Team.", "The team code links your athlete account to the team after email confirmation.")}
              </p>
            </div>
          )}

          <FieldEmail value={email} onChange={(value) => { setEmail(value); setSignupNotice(null); }} />
          <FieldPassword value={password} onChange={setPassword} autoComplete="new-password" />
          <SubmitButton loading={loading} label={tr("Konto erstellen", "Create account")} />
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {tr("Bereits registriert?", "Already registered?")}{" "}
          <button
            onClick={() => setMode("login")}
            className="text-primary font-medium hover:underline"
          >
            {intent === "join" ? tr("Anmelden und Teambeitritt abschließen", "Sign in and finish joining the team") : tr("Anmelden", "Sign in")}
          </button>
        </p>
        <LegalLinks />
      </motion.div>
    </div>
  );
};

// ─── small subcomponents ───
const CoachInviteCodeCard = ({ code }: { code: string }) => {
  const { tr } = usePublicLanguage();
  return (
  <div className="flex min-h-14 items-center gap-3 rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-3">
    <KeyRound className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
    <span className="min-w-0">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{tr("Coach-Code · bereits eingetragen", "Coach code · already entered")}</span>
      <span className="mt-1 block break-all font-mono text-sm font-semibold tracking-[0.08em] text-foreground">{code}</span>
    </span>
  </div>
  );
};

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
}) => {
  const { tr } = usePublicLanguage();
  return (
  <div className="mt-7 border-t border-border/60 pt-6">
    <label className="mb-3 block text-sm font-medium text-foreground">{tr("Sicherheitscode", "Security code")}</label>
    <InputOTP
      maxLength={6}
      value={value}
      onChange={onChange}
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={tr("Sechsstelliger Sicherheitscode", "Six-digit security code")}
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
};

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
}) => {
  const [visible, setVisible] = useState(false);
  const { tr } = usePublicLanguage();

  return (
    <div className="relative">
      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        type={visible ? "text" : "password"}
        name="password"
        autoComplete={autoComplete}
        aria-label={tr("Passwort", "Password")}
        required
        placeholder={tr("Passwort", "Password")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-11 pr-14 py-3.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? tr("Passwort verbergen", "Hide password") : tr("Passwort anzeigen", "Show password")}
        aria-pressed={visible}
        className="absolute right-1 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {visible
          ? <EyeOff className="h-4 w-4" aria-hidden="true" />
          : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
};

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
