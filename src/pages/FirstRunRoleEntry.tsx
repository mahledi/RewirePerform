import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLoadingShell from "@/components/AppLoadingShell";
import { BrandLockup, BrandSymbol } from "@/components/brand/BrandLogo";
import { useAuth } from "@/contexts/AuthContext";

const FirstRunRoleEntry = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { user, role, roleVerified, loading } = useAuth();

  useEffect(() => {
    if (loading || !user || !roleVerified || !role) return;
    navigate(role === "admin" ? "/admin" : role === "coach" ? "/coach" : "/dashboard", {
      replace: true,
    });
  }, [loading, navigate, role, roleVerified, user]);

  if (loading || (user && (!roleVerified || !role))) {
    return <AppLoadingShell subtitle="Prüfe deinen Zugang..." />;
  }

  if (user && role) {
    return <AppLoadingShell subtitle="Öffne deinen Bereich..." />;
  }

  const entrance = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.01 } }
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <main className="relative flex min-h-[100dvh] overflow-hidden bg-[#0D0E12] px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))] text-[#EEF0F2] sm:px-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-8%,rgba(46,173,137,0.18),transparent_35%),radial-gradient(circle_at_10%_85%,rgba(46,173,137,0.07),transparent_30%)]" />
      <div className="pointer-events-none absolute left-1/2 top-[31%] h-64 w-64 -translate-x-1/2 rounded-full bg-primary/[0.07] blur-[90px]" />

      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col">
        <header className="flex items-center justify-between">
          <BrandLockup symbolSize={28} textClassName="text-[13px] tracking-[-0.02em]" />
          <button
            type="button"
            onClick={() => navigate("/auth?mode=login")}
            className="flex min-h-11 items-center rounded-xl px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Anmelden
          </button>
        </header>

        <section className="flex flex-1 items-center py-5 [@media(max-height:700px)]:py-2 sm:py-12">
          <motion.div {...entrance} className="mx-auto w-full max-w-3xl">
            <div className="text-center">
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center [@media(max-height:700px)]:hidden sm:h-20 sm:w-20">
                <div className="absolute inset-0 rounded-[28px] bg-primary/25 blur-2xl" />
                <span className="relative flex h-14 w-14 items-center justify-center rounded-[20px] border border-primary/25 bg-primary/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:h-16 sm:w-16 sm:rounded-[22px]">
                  <BrandSymbol size={34} />
                </span>
              </div>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary [@media(max-height:700px)]:mt-0 sm:mt-6">
                Dein Einstieg
              </p>
              <h1 className="mx-auto mt-3 max-w-2xl font-heading text-[clamp(2rem,7vw,4rem)] font-semibold leading-[0.98] tracking-[-0.055em] [@media(max-height:700px)]:text-[1.75rem]">
                Wie nutzt du RewirePerform?
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/48 [@media(max-height:700px)]:mt-2 [@media(max-height:700px)]:text-xs sm:mt-4 sm:text-base">
                Wähle deinen Bereich. Danach zeigen wir dir in wenigen Schritten genau das System, das zu deiner Rolle gehört.
              </p>
            </div>

            <div className="mt-6 grid gap-3 [@media(max-height:700px)]:mt-3 sm:mt-11 sm:grid-cols-2 sm:gap-4">
              <button
                type="button"
                onClick={() => navigate("/start/athlete")}
                className="premium-press group relative min-h-[154px] overflow-hidden rounded-[24px] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(30,33,38,0.96),rgba(14,16,20,0.98))] p-4 text-left shadow-[0_28px_80px_-45px_rgba(0,0,0,1),inset_0_1px_0_rgba(255,255,255,0.055)] transition-all duration-300 hover:border-primary/35 hover:shadow-[0_30px_80px_-40px_rgba(46,173,137,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [@media(max-height:700px)]:min-h-[124px] [@media(max-height:700px)]:p-3 sm:min-h-48 sm:rounded-[28px] sm:p-6"
              >
                <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary/[0.10] blur-3xl transition-opacity group-hover:bg-primary/[0.15]" />
                <div className="relative flex h-full flex-col">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-primary/20 bg-primary/[0.10] text-primary sm:h-12 sm:w-12 sm:rounded-2xl">
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary [@media(max-height:700px)]:mt-3 sm:mt-7">Ich bin Athlet</p>
                  <div className="mt-1.5 flex items-end justify-between gap-4 sm:mt-2">
                    <div>
                      <h2 className="font-heading text-[22px] font-semibold tracking-[-0.035em] sm:text-2xl">Mental trainieren.</h2>
                      <p className="mt-1.5 text-xs leading-relaxed text-white/45 [@media(max-height:700px)]:hidden sm:mt-2">Daily Flow, Trainingstransfer und deine Entwicklung.</p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.035] text-primary transition-transform group-hover:translate-x-1">
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate("/start/coach")}
                className="premium-press group relative min-h-[154px] overflow-hidden rounded-[24px] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(27,30,35,0.96),rgba(13,15,19,0.98))] p-4 text-left shadow-[0_28px_80px_-45px_rgba(0,0,0,1),inset_0_1px_0_rgba(255,255,255,0.055)] transition-all duration-300 hover:border-primary/35 hover:shadow-[0_30px_80px_-40px_rgba(46,173,137,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [@media(max-height:700px)]:min-h-[124px] [@media(max-height:700px)]:p-3 sm:min-h-48 sm:rounded-[28px] sm:p-6"
              >
                <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary/[0.08] blur-3xl transition-opacity group-hover:bg-primary/[0.13]" />
                <div className="relative flex h-full flex-col">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-primary/20 bg-primary/[0.10] text-primary sm:h-12 sm:w-12 sm:rounded-2xl">
                    <UsersRound className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary [@media(max-height:700px)]:mt-3 sm:mt-7">Ich bin Coach</p>
                  <div className="mt-1.5 flex items-end justify-between gap-4 sm:mt-2">
                    <div>
                      <h2 className="font-heading text-[22px] font-semibold tracking-[-0.035em] sm:text-2xl">Team begleiten.</h2>
                      <p className="mt-1.5 text-xs leading-relaxed text-white/45 [@media(max-height:700px)]:hidden sm:mt-2">Aktivität, Teamzustand und Coaching-Praxis im Blick.</p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.035] text-primary transition-transform group-hover:translate-x-1">
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </button>
            </div>

            <div className="mx-auto mt-4 flex max-w-xl items-start justify-center gap-2 text-center text-[11px] leading-relaxed text-white/32 [@media(max-height:700px)]:mt-3 [@media(max-height:700px)]:text-[10px] sm:mt-6">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/75" aria-hidden="true" />
              <p>Deine Auswahl öffnet nur die passende Einführung. Zugänge und Rollen werden danach sicher geprüft.</p>
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
};

export default FirstRunRoleEntry;
