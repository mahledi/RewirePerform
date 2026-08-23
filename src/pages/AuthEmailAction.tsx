import { CircleAlert, KeyRound, MailCheck, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandLockup } from "@/components/brand/BrandLogo";
import { parseAuthConfirmationUrl } from "@/lib/authConfirmationUrl";

const AuthEmailAction = () => {
  const confirmation = parseAuthConfirmationUrl(
    window.location.search,
    import.meta.env.VITE_SUPABASE_URL,
  );

  if (!confirmation) {
    return (
      <ActionLayout icon={<CircleAlert className="h-7 w-7" />} title="Der Sicherheitslink ist ungültig.">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Fordere bitte direkt in RewirePerform eine neue E-Mail an.
        </p>
        <Link to="/auth" className="mt-8 flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
          Zur Anmeldung
        </Link>
      </ActionLayout>
    );
  }

  const recovery = confirmation.type === "recovery";
  return (
    <ActionLayout
      icon={recovery ? <KeyRound className="h-7 w-7" /> : <MailCheck className="h-7 w-7" />}
      title={recovery ? "Passwortänderung bestätigen." : "E-Mail-Adresse bestätigen."}
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        {recovery
          ? "Erst mit deinem Tap wird der einmalige Sicherheitslink verwendet und RewirePerform geöffnet."
          : "Erst mit deinem Tap wird deine E-Mail-Adresse bestätigt und RewirePerform geöffnet."}
      </p>
      <button
        type="button"
        onClick={() => window.location.assign(confirmation.url)}
        className="mt-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:shadow-glow"
      >
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        {recovery ? "Sicher fortfahren" : "E-Mail jetzt bestätigen"}
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
}) => (
  <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground sm:px-6">
    <div className="w-full max-w-md text-center">
      <Link to="/" aria-label="Zur Startseite" className="mx-auto flex items-center justify-center gap-2">
        <BrandLockup symbolSize={34} textClassName="text-xl" />
      </Link>
      <div className="mx-auto mb-5 mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <h1 className="mb-3 font-heading text-3xl font-bold">{title}</h1>
      {children}
      <nav aria-label="Rechtliches und Hilfe" className="mt-8 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <Link to="/privacy" className="hover:text-foreground">Datenschutz</Link>
        <Link to="/support" className="hover:text-foreground">Support</Link>
      </nav>
    </div>
  </main>
);

export default AuthEmailAction;
