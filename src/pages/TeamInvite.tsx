import { Capacitor } from "@capacitor/core";
import { ArrowRight, Download, ShieldCheck, Users } from "lucide-react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { BrandLockup } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { APP_STORE_PRODUCT_URL } from "@/lib/appStore";
import {
  parseTeamInviteUrl,
  TEAM_INVITE_ORIGIN,
  teamInviteAuthRoute,
} from "@/lib/teamInvite";

const TeamInvite = () => {
  const location = useLocation();
  const result = parseTeamInviteUrl(
    new URL(`${location.pathname}${location.search}`, TEAM_INVITE_ORIGIN).toString(),
  );

  if (result.kind === "invite" && Capacitor.isNativePlatform()) {
    return <Navigate to={teamInviteAuthRoute(result.teamCode)} replace />;
  }

  const validInvite = result.kind === "invite";
  const authRoute = validInvite
    ? teamInviteAuthRoute(result.teamCode)
    : "/auth?mode=signup&intent=join&invite_error=invalid";

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:py-12">
      <div className="mx-auto max-w-xl">
        <div className="mb-9 flex justify-center">
          <BrandLockup symbolSize={32} />
        </div>
        <section className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-2xl shadow-black/25">
          <div className="border-b border-border/60 bg-gradient-to-br from-primary/15 via-primary/[0.04] to-transparent p-6 sm:p-9">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
              <Users className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Team-Einladung
            </p>
            <h1 className="mt-3 font-heading text-3xl font-bold sm:text-4xl">
              {validInvite ? "Dein Team wartet auf dich." : "Einladung prüfen."}
            </h1>
            <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
              {validInvite
                ? "Öffne RewirePerform, registriere dich sicher und verbinde dich direkt mit deinem Team."
                : "Dieser Einladungslink ist unvollständig oder wurde verändert."}
            </p>
          </div>

          <div className="space-y-5 p-6 sm:p-9">
            {validInvite ? (
              <>
                <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-secondary/25 p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Sicherer Teambeitritt</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Der Teamcode wird aus diesem Link übernommen. Du bestätigst den Beitritt in deinem Account.
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] px-5 py-4 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Teamcode</p>
                  <p className="mt-2 font-mono text-xl font-bold tracking-[0.28em] text-primary">
                    {result.teamCode}
                  </p>
                </div>
              </>
            ) : (
              <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                Bitte öffne den vollständigen Link erneut oder bitte deinen Coach um eine neue Einladung.
              </p>
            )}

            <Link to={authRoute} className="block">
              <Button className="min-h-12 w-full text-base">
                {validInvite ? "Teambeitritt starten" : "Zur Registrierung"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
            <a
              href={APP_STORE_PRODUCT_URL}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Download className="h-4 w-4 text-primary" aria-hidden="true" />
              RewirePerform im App Store
            </a>
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              Ist RewirePerform bereits installiert, öffnet der ursprüngliche Einladungslink direkt die App.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default TeamInvite;
