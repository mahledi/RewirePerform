import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Building2, Check, Loader2, ShieldCheck } from "lucide-react";
import { BrandLockup } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type InviteState = "idle" | "accepting" | "accepted" | "error";

const OrganizationInvite = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const token = new URLSearchParams(location.search).get("token")?.trim() ?? "";
  const [state, setState] = useState<InviteState>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user && state === "accepted") {
      const timer = window.setTimeout(() => navigate("/coach", { replace: true }), 900);
      return () => window.clearTimeout(timer);
    }
  }, [loading, navigate, state, user]);

  const accept = async () => {
    if (!user || token.length < 32 || state === "accepting") return;
    setState("accepting");
    setError("");
    const { error: rpcError } = await (supabase as any).rpc("accept_organization_invitation", { _token: token });
    if (rpcError) {
      setState("error");
      setError(
        rpcError.message?.includes("email_mismatch")
          ? "Diese Einladung gehört zu einer anderen bestätigten E-Mail-Adresse."
          : rpcError.message?.includes("existing_athlete")
            ? "Dieser bestehende Athletenaccount kann nicht automatisch in einen Coach-Zugang umgewandelt werden. Bitte nutze den Support."
            : "Die Einladung ist ungültig, abgelaufen oder bereits verwendet.",
      );
      return;
    }
    setState("accepted");
  };

  const redirect = `/organization/invite?token=${encodeURIComponent(token)}`;

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground">
      <div className="mx-auto max-w-xl">
        <div className="mb-10 flex justify-center"><BrandLockup symbolSize={30} /></div>
        <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-2xl shadow-black/20 sm:p-9">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {state === "accepted" ? <Check className="h-7 w-7" /> : <Building2 className="h-7 w-7" />}
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Persönliche Einladung</p>
          <h1 className="mt-3 font-heading text-3xl font-bold">
            {state === "accepted" ? "Zugang freigegeben." : "Organisation sicher verbinden."}
          </h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            {state === "accepted"
              ? "Du wirst jetzt in deine Coach Console weitergeleitet."
              : "Der Zugang wird nur für die bestätigte eingeladene E-Mail-Adresse aktiviert."}
          </p>

          {!token || token.length < 32 ? (
            <p role="alert" className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">Der Einladungslink ist unvollständig.</p>
          ) : loading ? (
            <div className="mt-7 flex items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" />Account wird geprüft.</div>
          ) : !user ? (
            <div className="mt-7 space-y-3">
              <Link to={`/auth?mode=signup&redirect=${encodeURIComponent(redirect)}`} className="block">
                <Button className="min-h-11 w-full">Mit eingeladener E-Mail registrieren</Button>
              </Link>
              <Link to={`/auth?mode=login&redirect=${encodeURIComponent(redirect)}`} className="block">
                <Button variant="outline" className="min-h-11 w-full">Bereits registriert? Anmelden</Button>
              </Link>
            </div>
          ) : state !== "accepted" ? (
            <div className="mt-7 space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-secondary/25 p-4 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                Die Annahme aktiviert ausschließlich die freigegebene Organisations- und Teamrolle. Athletendaten anderer Teams bleiben unsichtbar.
              </div>
              {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
              <Button onClick={accept} disabled={state === "accepting"} className="min-h-11 w-full">
                {state === "accepting" && <Loader2 className="h-4 w-4 animate-spin" />}
                Einladung verbindlich annehmen
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
};

export default OrganizationInvite;
