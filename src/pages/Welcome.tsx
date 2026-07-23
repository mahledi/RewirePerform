import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, LockKeyhole, RotateCcw } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { BrandLockup } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { completePublicOnboarding } from "@/lib/publicOnboarding";

const pages = [
  {
    eyebrow: "Dein 56-Tage-Programm",
    title: "Ein klarer Ablauf für deine mentale Performance.",
    body: "Du trainierst Fokus, Selbststeuerung und die Rückkehr zur nächsten Handlung. Kurze tägliche Einheiten bauen strukturiert aufeinander auf.",
    icon: RotateCcw,
  },
  {
    eyebrow: "Passend zu deinem Tag",
    title: "Training, Wettkampf und Ruhetag bleiben verschieden.",
    body: "Check-in, Aufgaben und Journal passen sich an deinen Tagestyp an. So bekommst du Fragen und Schritte, die zur tatsächlichen Situation passen.",
    icon: CalendarDays,
  },
  {
    eyebrow: "Klare Privatsphäre",
    title: "Deine persönlichen Inhalte bleiben privat.",
    body: "Coaches sehen Aktivität, Fortschritt und ausreichend große Team-Aggregate. Journaltexte, Freitexte, rohe Antworten und individuelle private Scores sehen sie nicht.",
    icon: LockKeyhole,
  },
] as const;

const safeReturnPath = (value: string | null) =>
  value && /^\/(?!\/)/.test(value) ? value : null;

const Welcome = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [pageIndex, setPageIndex] = useState(0);
  const isReplay = searchParams.get("replay") === "1";
  const returnPath = useMemo(
    () => safeReturnPath(searchParams.get("return")) ?? (isReplay ? "/settings" : "/auth"),
    [isReplay, searchParams],
  );
  const page = pages[pageIndex];
  const Icon = page.icon;
  const isLast = pageIndex === pages.length - 1;

  const finish = (login = false) => {
    completePublicOnboarding();
    if (login) {
      navigate("/auth?mode=login", { replace: true });
      return;
    }
    navigate(returnPath, { replace: true, state: { from: location.pathname } });
  };

  return (
    <main className="flex min-h-[100dvh] flex-col bg-background px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] text-foreground sm:px-8">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
        <header className="flex min-h-11 items-center justify-between">
          <BrandLockup symbolSize={30} textClassName="text-lg" />
          {isReplay && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigate(returnPath, { replace: true })}
              aria-label="Einführung schließen"
              className="h-11 w-11 rounded-md"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
          )}
        </header>

        <section
          key={page.eyebrow}
          aria-labelledby="welcome-title"
          className="flex flex-1 flex-col justify-center py-10"
        >
          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
            <Icon className="h-8 w-8" aria-hidden="true" />
          </div>
          <p className="mb-3 text-xs font-semibold uppercase text-primary">{page.eyebrow}</p>
          <h1 id="welcome-title" className="max-w-lg font-heading text-3xl font-bold leading-tight sm:text-4xl">
            {page.title}
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
            {page.body}
          </p>
        </section>

        <footer className="space-y-5">
          <div className="flex items-center justify-center gap-2" aria-label={`Seite ${pageIndex + 1} von ${pages.length}`}>
            {pages.map((item, index) => (
              <span
                key={item.eyebrow}
                aria-hidden="true"
                className={`h-1.5 rounded-full transition-[width,background-color] ${
                  index === pageIndex ? "w-8 bg-primary" : "w-2 bg-border"
                }`}
              />
            ))}
          </div>

          <div className="grid min-h-11 grid-cols-[2.75rem_1fr] gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
              aria-label="Vorherige Seite"
              className="h-11 w-11 rounded-md"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (isLast) finish();
                else setPageIndex((current) => Math.min(pages.length - 1, current + 1));
              }}
              className="min-h-11 h-auto rounded-md py-3 font-semibold"
            >
              {isLast ? (isReplay ? "Zurück zu den Einstellungen" : "RewirePerform starten") : "Weiter"}
              {!isLast && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </Button>
          </div>

          {!isReplay && isLast && (
            <button
              type="button"
              onClick={() => finish(true)}
              className="min-h-11 w-full px-3 py-2 text-sm font-medium text-primary hover:underline"
            >
              Bereits registriert? Anmelden
            </button>
          )}
        </footer>
      </div>
    </main>
  );
};

export default Welcome;
