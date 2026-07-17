import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Mail, MailCheck, Lock, User, ArrowRight, ArrowLeft, Loader2, RefreshCw, Users, Shield, UserPlus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSportAnswerText } from "@/data/questionnaireData";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AppLoadingShell from "@/components/AppLoadingShell";

type Mode = "intent" | "signup" | "login" | "verify";
type Intent = "solo" | "join" | "create";
type TeamJoinStatus = "idle" | "joining" | "error";

const joinTeamByCode = async (rawCode: string) => {
  const code = rawCode.trim().toUpperCase();
  if (code.length !== 6) {
    return { success: false as const, message: "Bitte gib einen gültigen 6-stelligen Teamcode ein." };
  }

  const { data: joinResult, error: joinError } = await supabase.rpc("join_team_by_code", {
    _code: code,
  });
  const result = joinResult as { success?: boolean; role?: "athlete" | "coach"; error?: string } | null;

  if (joinError) {
    console.error("Team join error:", joinError);
    return {
      success: false as const,
      message: "Der Teambeitritt konnte gerade nicht abgeschlossen werden. Bitte versuche es erneut.",
    };
  }

  if (!result || result.success !== true) {
    return {
      success: false as const,
      message: "Teamcode nicht gefunden. Bitte prüfe den Code und versuche es erneut.",
    };
  }

  return { success: true as const, role: result.role ?? "athlete" };
};

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const forceSwitch = searchParams.get("switch") === "1";
  const redirectTo = searchParams.get("redirect");
  const safeRedirect = redirectTo && /^\/(?!\/)/.test(redirectTo) ? redirectTo : null;
  const urlIntent = searchParams.get("intent");
  const urlCode = searchParams.get("code");
  const confirmedTeamJoinCode = urlCode?.trim().toUpperCase() ?? "";
  const isConfirmedTeamJoinReturn = urlIntent === "join" && Boolean(confirmedTeamJoinCode);
  const { user, role, loading: authLoading } = useAuth();
  const [switching, setSwitching] = useState(forceSwitch);
  const [teamJoinStatus, setTeamJoinStatus] = useState<TeamJoinStatus>("idle");
  const attemptedTeamJoinCodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!forceSwitch) return;
    // Sign out any existing session so the login form is shown
    supabase.auth.signOut().finally(() => {
      try { window.localStorage.removeItem("cached_user_role"); } catch { /* noop */ }
      try {
        const cachedUserId = window.localStorage.getItem("cached_user_id");
        if (cachedUserId) window.localStorage.removeItem(`cached_user_role:${cachedUserId}`);
        window.localStorage.removeItem("cached_user_id");
      } catch { /* noop */ }
      setSwitching(false);
    });
  }, [forceSwitch]);

  const initialMode: Mode = urlIntent === "join" || urlCode ? "signup" : "intent";
  const initialIntent: Intent = urlIntent === "join" || urlCode ? "join" : "solo";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [intent, setIntent] = useState<Intent>(initialIntent);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [teamCode, setTeamCode] = useState(urlCode ?? "");

  const normalizedTeamCode = () => teamCode.trim().toUpperCase();

  const emailRedirectTo = () => {
    const redirectUrl = new URL("/auth", window.location.origin);
    if (safeRedirect) redirectUrl.searchParams.set("redirect", safeRedirect);
    if (intent === "join") {
      redirectUrl.searchParams.set("intent", "join");
      const code = normalizedTeamCode();
      if (code) redirectUrl.searchParams.set("code", code);
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
      .select("sport")
      .eq("id", userId)
      .maybeSingle();

    if (profile && !profile.sport) {
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
        if (s) {
          await supabase
            .from("profiles")
            .update({ sport: s, team: typeof position === "string" ? position : null })
            .eq("id", userId);
        }
      }
    }
  };

  const completeConfirmedTeamJoin = useCallback(async () => {
    if (!confirmedTeamJoinCode) return;
    setTeamJoinStatus("joining");
    const join = await joinTeamByCode(confirmedTeamJoinCode);
    if (!join.success) {
      setTeamJoinStatus("error");
      toast.error(join.message);
      return;
    }

    toast.success("E-Mail bestätigt und Teambeitritt abgeschlossen.");
    navigate(join.role === "coach" ? "/coach" : "/questionnaire", { replace: true });
  }, [confirmedTeamJoinCode, navigate]);

  useEffect(() => {
    if (authLoading || switching || !user || !isConfirmedTeamJoinReturn || !confirmedTeamJoinCode) return;
    if (attemptedTeamJoinCodeRef.current === confirmedTeamJoinCode) return;
    attemptedTeamJoinCodeRef.current = confirmedTeamJoinCode;
    void completeConfirmedTeamJoin();
  }, [authLoading, completeConfirmedTeamJoin, confirmedTeamJoinCode, isConfirmedTeamJoinReturn, switching, user]);

  useEffect(() => {
    if (authLoading || switching || !user || isConfirmedTeamJoinReturn) return;
    if (safeRedirect) navigate(safeRedirect, { replace: true });
    else if (role === "admin") navigate("/admin", { replace: true });
    else if (role === "coach") navigate("/coach", { replace: true });
    else if (role === "athlete") navigate("/dashboard", { replace: true });
    // if role still null but user exists, wait for role to load
  }, [user, role, authLoading, switching, navigate, safeRedirect, isConfirmedTeamJoinReturn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (intent === "join" && normalizedTeamCode().length !== 6) {
      toast.error("Bitte gib den 6-stelligen Teamcode ein, um den Teambeitritt abzuschließen.");
      return;
    }
    if (intent === "join") attemptedTeamJoinCodeRef.current = normalizedTeamCode();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Ungültige Anmeldedaten." : error.message);
    } else {
      await backfillProfileSport(data.user.id);
      if (intent === "join") {
        const join = await joinTeamByCode(teamCode);
        if (!join.success) {
          toast.error(join.message);
          setLoading(false);
          return;
        }
        toast.success("Teambeitritt abgeschlossen.");
        navigate(join.role === "coach" ? "/coach" : "/questionnaire", { replace: true });
        setLoading(false);
        return;
      }

      toast.success("Willkommen zurück!");
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
      navigate(safeRedirect ?? nextRoute, { replace: true });
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (password.length < 6) {
      toast.error("Passwort muss mindestens 6 Zeichen haben.");
      return;
    }
    if (!fullName.trim()) {
      toast.error("Bitte gib deinen Namen ein.");
      return;
    }
    if (intent === "join" && teamCode.trim().length !== 6) {
      toast.error("Bitte gib einen gültigen 6-stelligen Teamcode ein.");
      return;
    }
    if (intent === "join") attemptedTeamJoinCodeRef.current = normalizedTeamCode();

    setLoading(true);

    const initialRole: "athlete" | "coach" = intent === "create" ? "coach" : "athlete";

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), role: initialRole },
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
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
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

    let effectiveRole: "athlete" | "coach" = initialRole;

    if (intent === "join") {
      const join = await joinTeamByCode(teamCode);
      if (!join.success) {
        toast.error(`Konto erstellt, aber Teambeitritt offen: ${join.message}`);
        setLoading(false);
        return;
      }
      effectiveRole = join.role;
    }

    toast.success("Konto erstellt! Willkommen.");

    if (intent === "create") {
      navigate("/coach");
    } else if (intent === "join") {
      navigate(effectiveRole === "coach" ? "/coach" : "/questionnaire");
    } else {
      navigate("/questionnaire");
    }
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
      toast.error("Die Bestätigungs-E-Mail konnte gerade nicht erneut gesendet werden.");
    } else {
      toast.success("Bestätigungs-E-Mail erneut gesendet.");
    }
    setResending(false);
  };

  if (user && isConfirmedTeamJoinReturn && teamJoinStatus === "error") {
    const accountRoute = role === "admin" ? "/admin" : role === "coach" ? "/coach" : "/dashboard";
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
          <h1 className="mb-3 font-heading text-3xl font-bold">Teambeitritt noch offen.</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Deine E-Mail ist bestätigt. Der Teamcode konnte gerade nicht abgeschlossen werden. Du kannst es direkt erneut versuchen.
          </p>
          <button
            type="button"
            onClick={() => void completeConfirmedTeamJoin()}
            className="mt-8 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-heading text-sm font-semibold text-primary-foreground transition-shadow hover:shadow-glow"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Erneut versuchen
          </button>
          <button
            type="button"
            onClick={() => navigate(accountRoute, { replace: true })}
            className="mt-3 min-h-11 w-full px-4 py-3 text-sm font-medium text-primary hover:underline"
          >
            Ohne Team fortfahren
          </button>
          <LegalLinks />
        </motion.div>
      </div>
    );
  }

  // Don't flash login UI while restoring session or while a logged-in user is being redirected
  if (authLoading || switching || (user && !forceSwitch)) {
    return (
      <AppLoadingShell subtitle={isConfirmedTeamJoinReturn ? "Schließe deinen Teambeitritt ab..." : "Stelle deine Sitzung wieder her..."} />
    );
  }

  if (mode === "verify") {
    return (
      <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-background px-4 py-8 sm:px-6 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md min-w-0 text-center"
        >
          <button type="button" aria-label="Zur Startseite" className="mx-auto mb-8 flex items-center justify-center gap-2" onClick={() => navigate("/")}>
            <Brain className="h-7 w-7 text-primary" />
            <span className="font-heading text-xl font-bold">RewirePerform</span>
          </button>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="mb-3 font-heading text-3xl font-bold">Bestätige deine E-Mail.</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Wir haben einen Bestätigungslink an<br />
            <strong className="break-all text-foreground">{pendingEmail}</strong> gesendet.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Öffne die E-Mail und bestätige deine Adresse. Danach kannst du RewirePerform sicher verwenden.
          </p>
          <button
            type="button"
            onClick={() => void resendConfirmation()}
            disabled={resending}
            className="mt-8 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-secondary/50 px-4 py-3 font-heading text-sm font-semibold transition-colors hover:bg-secondary disabled:opacity-50"
          >
            {resending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            E-Mail erneut senden
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className="mt-3 min-h-11 w-full px-4 py-3 text-sm font-medium text-primary hover:underline"
          >
            E-Mail-Adresse ändern
          </button>
          <LegalLinks />
        </motion.div>
      </div>
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
            <button type="button" aria-label="Zur Startseite" className="mx-auto mb-6 flex items-center justify-center gap-2" onClick={() => navigate("/")}>
              <Brain className="w-7 h-7 text-primary" />
              <span className="font-heading text-xl font-bold">RewirePerform</span>
            </button>
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
            <IntentCard
              icon={<Shield className="w-5 h-5" />}
              title="Team erstellen"
              description="Du bist Coach und möchtest dein Team aufbauen und begleiten."
              onClick={() => pickIntent("create")}
            />
          </div>

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
            <button type="button" aria-label="Zur Startseite" className="mx-auto mb-6 flex items-center justify-center gap-2" onClick={() => navigate("/")}>
              <Brain className="w-7 h-7 text-primary" />
              <span className="font-heading text-xl font-bold">RewirePerform</span>
            </button>
            <h1 className="font-heading text-3xl font-bold mb-2">Willkommen zurück.</h1>
            <p className="text-muted-foreground text-sm">
              {intent === "join"
                ? "Melde dich an, um den Teambeitritt mit deinem Code abzuschließen."
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
    : "Du erstellst dein Team.";
  const intentSub =
    intent === "solo" ? "Dein personalisiertes Mental-Performance-Programm beginnt gleich."
    : intent === "join" ? "Gib deinen Teamcode ein — dieser bestimmt deine Rolle (Athlet:in oder Co-Coach)."
    : "Du legst dein Team direkt nach der Anmeldung im Coach-Bereich an.";

  return (
    <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-background px-4 py-8 sm:px-6 sm:py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md min-w-0"
      >
        <button
          onClick={() => setMode("intent")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Zurück
        </button>

        <div className="text-center mb-8">
          <button type="button" aria-label="Zur Startseite" className="mx-auto mb-6 flex items-center justify-center gap-2" onClick={() => navigate("/")}>
            <Brain className="w-7 h-7 text-primary" />
            <span className="font-heading text-xl font-bold">RewirePerform</span>
          </button>
          <h1 className="font-heading text-3xl font-bold mb-2">{intentTitle}</h1>
          <p className="text-muted-foreground text-sm">{intentSub}</p>
        </div>

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
                Dein Code legt fest, ob du als Athlet:in oder Co-Coach beitrittst.
              </p>
            </div>
          )}

          {intent === "create" && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 text-xs text-muted-foreground">
              Nach der Anmeldung kommst du direkt in dein Coach-Dashboard und kannst dein Team anlegen.
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

const LegalLinks = () => (
  <nav aria-label="Rechtliches und Hilfe" className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
    <Link to="/privacy" className="transition-colors hover:text-foreground">
      Datenschutz
    </Link>
    <Link to="/support" className="transition-colors hover:text-foreground">
      Support
    </Link>
  </nav>
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
