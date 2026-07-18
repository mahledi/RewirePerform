import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, CircleAlert, KeyRound, Loader2, Lock } from "lucide-react";
import { motion } from "framer-motion";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { BrandLockup } from "@/components/brand/BrandLogo";
import {
  authErrorMessage,
  MIN_ACCOUNT_PASSWORD_LENGTH,
  parseAuthLinkError,
} from "@/lib/authEmailFlow";

type RecoveryState = "checking" | "ready" | "invalid" | "success";

const hasRecoveryHint = () => {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return query.get("verified") === "1" || query.get("type") === "recovery" || hash.get("type") === "recovery";
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const initialLinkError = useMemo(
    () => parseAuthLinkError(window.location.search, window.location.hash),
    [],
  );
  const recoveryHint = useMemo(hasRecoveryHint, []);
  const [state, setState] = useState<RecoveryState>(initialLinkError ? "invalid" : "checking");
  const [errorMessage, setErrorMessage] = useState(
    initialLinkError?.message ?? "Dieser Passwort-Link ist abgelaufen oder wurde bereits verwendet.",
  );
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialLinkError) return;

    let active = true;
    let recoveryEventSeen = false;

    const acceptSession = (session: Session | null, event?: AuthChangeEvent) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") recoveryEventSeen = true;
      if (session && (recoveryHint || recoveryEventSeen)) setState("ready");
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      acceptSession(session, event);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setErrorMessage("Der Sicherheitslink konnte gerade nicht geprüft werden.");
        setState("invalid");
        return;
      }
      acceptSession(data.session);
      if (!data.session && !recoveryHint) setState("invalid");
    });

    const timeout = window.setTimeout(() => {
      if (active) setState((current) => current === "checking" ? "invalid" : current);
    }, 4000);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [initialLinkError, recoveryHint]);

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (password.length < MIN_ACCOUNT_PASSWORD_LENGTH) {
      setErrorMessage(`Dein Passwort muss mindestens ${MIN_ACCOUNT_PASSWORD_LENGTH} Zeichen haben.`);
      return;
    }
    if (password !== confirmation) {
      setErrorMessage("Die beiden Passwörter stimmen nicht überein.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrorMessage(authErrorMessage(error, "Das Passwort konnte gerade nicht geändert werden."));
      setSaving(false);
      return;
    }

    window.history.replaceState({}, "", "/auth/reset-password");
    setPassword("");
    setConfirmation("");
    setState("success");
    setSaving(false);
  };

  if (state === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
        <div className="text-center" role="status" aria-live="polite">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" aria-hidden="true" />
          <p className="mt-4 text-sm text-muted-foreground">Sicherheitslink wird geprüft...</p>
        </div>
      </main>
    );
  }

  if (state === "invalid") {
    return (
      <RecoveryLayout icon={<CircleAlert className="h-7 w-7" />} tone="error" title="Der Link ist nicht mehr gültig.">
        <p className="text-sm leading-relaxed text-muted-foreground">{errorMessage}</p>
        <Link
          to="/auth?mode=forgot"
          className="mt-8 flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:shadow-glow"
        >
          Neuen Link anfordern
        </Link>
        <Link to="/auth" className="mt-3 flex min-h-11 items-center justify-center text-sm font-medium text-primary hover:underline">
          Zur Anmeldung
        </Link>
      </RecoveryLayout>
    );
  }

  if (state === "success") {
    return (
      <RecoveryLayout icon={<CheckCircle2 className="h-7 w-7" />} title="Passwort geändert.">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Dein neues Passwort ist aktiv. Du kannst RewirePerform jetzt sicher weiterverwenden.
        </p>
        <button
          type="button"
          onClick={() => navigate("/auth", { replace: true })}
          className="mt-8 min-h-11 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:shadow-glow"
        >
          Weiter zu RewirePerform
        </button>
      </RecoveryLayout>
    );
  }

  return (
    <RecoveryLayout icon={<KeyRound className="h-7 w-7" />} title="Neues Passwort festlegen.">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Verwende mindestens {MIN_ACCOUNT_PASSWORD_LENGTH} Zeichen und kein Passwort, das du bereits an anderer Stelle nutzt.
      </p>
      <form onSubmit={updatePassword} className="mt-8 space-y-4 text-left">
        <PasswordField
          id="new-password"
          label="Neues Passwort"
          value={password}
          onChange={setPassword}
        />
        <PasswordField
          id="confirm-password"
          label="Passwort wiederholen"
          value={confirmation}
          onChange={setConfirmation}
        />
        {errorMessage && errorMessage !== "Dieser Passwort-Link ist abgelaufen oder wurde bereits verwendet." && (
          <p role="alert" className="text-sm leading-relaxed text-destructive">{errorMessage}</p>
        )}
        <button
          type="submit"
          disabled={saving || !password || !confirmation}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-heading text-sm font-semibold text-primary-foreground hover:shadow-glow disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
          Passwort speichern
        </button>
      </form>
    </RecoveryLayout>
  );
};

const PasswordField = ({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div>
    <label htmlFor={id} className="mb-2 block text-sm font-medium text-foreground">{label}</label>
    <div className="relative">
      <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        id={id}
        type="password"
        autoComplete="new-password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        minLength={MIN_ACCOUNT_PASSWORD_LENGTH}
        className="w-full rounded-xl border border-border/60 bg-secondary/50 py-3.5 pl-11 pr-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  </div>
);

const RecoveryLayout = ({
  icon,
  title,
  tone = "default",
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone?: "default" | "error";
  children: React.ReactNode;
}) => (
  <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground sm:px-6">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
      <Link to="/" aria-label="Zur Startseite" className="mx-auto flex items-center justify-center gap-2">
        <BrandLockup symbolSize={34} textClassName="text-xl" />
      </Link>
      <div className={`mx-auto mb-5 mt-8 flex h-14 w-14 items-center justify-center rounded-full ${tone === "error" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
        {icon}
      </div>
      <h1 className="mb-3 font-heading text-3xl font-bold">{title}</h1>
      {children}
      <nav aria-label="Rechtliches und Hilfe" className="mt-8 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <Link to="/privacy" className="hover:text-foreground">Datenschutz</Link>
        <Link to="/support" className="hover:text-foreground">Support</Link>
      </nav>
    </motion.div>
  </main>
);

export default ResetPassword;
