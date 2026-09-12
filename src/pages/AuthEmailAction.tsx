import { CircleAlert, KeyRound, MailCheck, ShieldCheck } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { BrandLockup } from "@/components/brand/BrandLogo";
import { usePublicLanguage } from "@/contexts/PublicLanguageContext";
import { PublicLanguageSwitch } from "@/components/public/PublicLanguageSwitch";
import {
  parseAuthConfirmationUrl,
  shouldAutoOpenAndroidConfirmation,
} from "@/lib/authConfirmationUrl";

const AuthEmailAction = () => {
  const { tr } = usePublicLanguage();
  const autoOpened = useRef(false);
  const confirmation = parseAuthConfirmationUrl(
    window.location.search,
    import.meta.env.VITE_SUPABASE_URL,
  );
  const shouldAutoOpen = shouldAutoOpenAndroidConfirmation(
    confirmation,
    Capacitor.getPlatform(),
    window.navigator.userAgent,
  );

  useEffect(() => {
    if (!shouldAutoOpen || !confirmation || autoOpened.current) return;
    autoOpened.current = true;
    window.location.assign(confirmation.url);
  }, [confirmation, shouldAutoOpen]);

  if (!confirmation) {
    return (
      <ActionLayout icon={<CircleAlert className="h-7 w-7" />} title={tr("Der Sicherheitslink ist ungültig.", "The security link is invalid.")}>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {tr("Fordere bitte direkt in RewirePerform eine neue E-Mail an.", "Please request a new email directly in RewirePerform.")}
        </p>
        <Link to="/auth" className="mt-8 flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
          {tr("Zur Anmeldung", "Go to sign-in")}
        </Link>
      </ActionLayout>
    );
  }

  const recovery = confirmation.type === "recovery";
  return (
    <ActionLayout
      icon={recovery ? <KeyRound className="h-7 w-7" /> : <MailCheck className="h-7 w-7" />}
      title={recovery ? tr("Passwortänderung bestätigen.", "Confirm password change.") : tr("E-Mail-Adresse bestätigen.", "Confirm your email address.")}
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        {recovery
          ? tr("Erst mit deinem Tap wird der einmalige Sicherheitslink verwendet und RewirePerform geöffnet.", "The one-time security link will only be used when you tap, and then RewirePerform will open.")
          : tr("Erst mit deinem Tap wird deine E-Mail-Adresse bestätigt und RewirePerform geöffnet.", "Your email address will only be confirmed when you tap, and then RewirePerform will open.")}
      </p>
      <button
        type="button"
        onClick={() => window.location.assign(confirmation.url)}
        className="mt-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:shadow-glow"
      >
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        {recovery ? tr("Sicher fortfahren", "Continue securely") : tr("E-Mail jetzt bestätigen", "Confirm email now")}
      </button>
    </ActionLayout>
  );
};

const ActionLayout = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => {
  const { tr } = usePublicLanguage();
  return (
  <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground sm:px-6">
    <PublicLanguageSwitch className="absolute right-4 top-4 z-20" />
    <div className="w-full max-w-md text-center">
      <Link to="/" aria-label={tr("Zur Startseite", "Go to homepage")} className="mx-auto flex items-center justify-center gap-2">
        <BrandLockup symbolSize={34} textClassName="text-xl" />
      </Link>
      <div className="mx-auto mb-5 mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <h1 className="mb-3 font-heading text-3xl font-bold">{title}</h1>
      {children}
      <nav aria-label={tr("Rechtliches und Hilfe", "Legal information and help")} className="mt-8 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <Link to="/privacy" className="hover:text-foreground">{tr("Datenschutz", "Privacy")}</Link>
        <Link to="/support" className="hover:text-foreground">Support</Link>
      </nav>
    </div>
  </main>
  );
};

export default AuthEmailAction;
