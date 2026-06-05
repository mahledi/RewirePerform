import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Mail, Lock, User, ArrowRight, ArrowLeft, Loader2, Users, Shield, UserPlus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getOptionText } from "@/data/questionnaireData";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Mode = "intent" | "signup" | "login";
type Intent = "solo" | "join" | "create";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const forceSwitch = searchParams.get("switch") === "1";
  const redirectTo = searchParams.get("redirect");
  const safeRedirect = redirectTo && /^\/(?!\/)/.test(redirectTo) ? redirectTo : null;
  const { user, role, loading: authLoading } = useAuth();
  const [switching, setSwitching] = useState(forceSwitch);

  useEffect(() => {
    if (!forceSwitch) return;
    // Sign out any existing session so the login form is shown
    supabase.auth.signOut().finally(() => {
      try { window.localStorage.removeItem("cached_user_role"); } catch { /* noop */ }
      setSwitching(false);
    });
  }, [forceSwitch]);

  useEffect(() => {
    if (authLoading || switching || !user) return;
    if (safeRedirect) navigate(safeRedirect, { replace: true });
    else if (role === "admin") navigate("/admin", { replace: true });
    else if (role === "coach") navigate("/coach", { replace: true });
    else if (role === "athlete") navigate("/dashboard", { replace: true });
    // if role still null but user exists, wait for role to load
  }, [user, role, authLoading, switching, navigate, safeRedirect]);

  const urlIntent = searchParams.get("intent");
  const urlCode = searchParams.get("code");
  const initialMode: Mode = urlIntent === "join" || urlCode ? "signup" : "intent";
  const initialIntent: Intent = urlIntent === "join" || urlCode ? "join" : "solo";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [intent, setIntent] = useState<Intent>(initialIntent);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [sport, setSport] = useState("");
  const [teamCode, setTeamCode] = useState(urlCode ?? "");

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
        const answers = qr.answers as Record<string, any>;
        const s = answers["sport-01"] || null;
        const position = answers["sport-02"] || null;
        if (s) {
          await supabase.from("profiles").update({ sport: getOptionText("sport-01", s), team: position }).eq("id", userId);
        }
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Ungültige Anmeldedaten." : error.message);
    } else {
      await backfillProfileSport(data.user.id);
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
    if (intent !== "create" && !sport) {
      toast.error("Bitte wähle deine Sportart.");
      return;
    }
    if (intent === "join" && teamCode.trim().length !== 6) {
      toast.error("Bitte gib einen gültigen 6-stelligen Teamcode ein.");
      return;
    }

    setLoading(true);

    const initialRole: "athlete" | "coach" = intent === "create" ? "coach" : "athlete";

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), sport: sport.trim(), role: initialRole },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setLoading(false);
      return;
    }

    if (intent === "join" && !data.session) {
      toast.error("Falls dieses Konto schon existiert, melde dich bitte an. Danach schließen wir den Teambeitritt mit deinem Code ab.");
      setMode("login");
      setLoading(false);
      return;
    }

    if (sport) {
      await supabase.from("profiles").update({ sport }).eq("id", data.user.id);
    }

    let effectiveRole: "athlete" | "coach" = initialRole;

    if (intent === "join") {
      const { data: joinResult, error: joinError } = await supabase.rpc("join_team_by_code", {
        _code: teamCode.trim(),
      });
      const result = joinResult as { success?: boolean; role?: "athlete" | "coach" } | null;
      if (joinError || !result || result.success !== true) {
        toast.error("Teamcode nicht gefunden. Bitte prüfe den Code und versuche es erneut.");
        setLoading(false);
        return;
      }
      if (result.role) effectiveRole = result.role;
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

  // Don't flash login UI while restoring session or while a logged-in user is being redirected
  if (authLoading || switching || (user && !forceSwitch)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
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
            <div className="flex items-center justify-center gap-2 mb-6 cursor-pointer" onClick={() => navigate("/")}>
              <Brain className="w-7 h-7 text-primary" />
              <span className="font-heading text-xl font-bold">RewirePerform</span>
            </div>
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
            <div className="flex items-center justify-center gap-2 mb-6 cursor-pointer" onClick={() => navigate("/")}>
              <Brain className="w-7 h-7 text-primary" />
              <span className="font-heading text-xl font-bold">RewirePerform</span>
            </div>
            <h1 className="font-heading text-3xl font-bold mb-2">Willkommen zurück.</h1>
            <p className="text-muted-foreground text-sm">Melde dich an, um dein Programm fortzusetzen.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <FieldEmail value={email} onChange={setEmail} />
            <FieldPassword value={password} onChange={setPassword} />
            <SubmitButton loading={loading} label="Anmelden" />
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Noch kein Konto?{" "}
            <button
              onClick={() => setMode("intent")}
              className="text-primary font-medium hover:underline"
            >
              Registrieren
            </button>
          </p>
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
    : intent === "join" ? "Gib deinen Teamcode ein — dieser bestimmt deine Rolle (Spieler oder Co-Coach)."
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
          <div className="flex items-center justify-center gap-2 mb-6 cursor-pointer" onClick={() => navigate("/")}>
            <Brain className="w-7 h-7 text-primary" />
            <span className="font-heading text-xl font-bold">RewirePerform</span>
          </div>
          <h1 className="font-heading text-3xl font-bold mb-2">{intentTitle}</h1>
          <p className="text-muted-foreground text-sm">{intentSub}</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Vollständiger Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            />
          </div>

          {intent !== "create" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SportButton label="⚽ Fußball" value="Fußball" current={sport} onClick={setSport} />
              <SportButton label="🏈 American Football" value="American Football" current={sport} onClick={setSport} />
            </div>
          )}

          {intent === "join" && (
            <div>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Teamcode (6 Zeichen)"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm uppercase tracking-widest"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 px-1">
                Dein Code legt fest, ob du als Spieler oder Co-Coach beitrittst.
              </p>
            </div>
          )}

          {intent === "create" && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 text-xs text-muted-foreground">
              Nach der Anmeldung kommst du direkt in dein Coach-Dashboard und kannst dein Team anlegen.
            </div>
          )}

          <FieldEmail value={email} onChange={setEmail} />
          <FieldPassword value={password} onChange={setPassword} />
          <SubmitButton loading={loading} label="Konto erstellen" />
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Bereits registriert?{" "}
          <button
            onClick={() => setMode("login")}
            className="text-primary font-medium hover:underline"
          >
            Anmelden
          </button>
        </p>
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

const SportButton = ({
  label, value, current, onClick,
}: { label: string; value: string; current: string; onClick: (v: string) => void }) => (
  <button
    type="button"
    onClick={() => onClick(value)}
    className={`flex min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-3.5 text-sm font-medium transition-all ${
      current === value
        ? "bg-primary/10 border-primary text-primary"
        : "bg-secondary/50 border-border/50 text-muted-foreground hover:border-border"
    }`}
  >
    {label}
  </button>
);

const FieldEmail = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="relative">
    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
    <input
      type="email"
      placeholder="E-Mail"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
    />
  </div>
);

const FieldPassword = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="relative">
    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
    <input
      type="password"
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
