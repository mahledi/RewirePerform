import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CalendarCheck, Lock, PlayCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CoachDashboardDemo } from "./components/CoachDashboardDemo";
import { MockDesktopFrame, MockPhoneFrame } from "./components/DemoFrames";
import { PlayerFlowDemo } from "./components/PlayerFlowDemo";
import { PrivacyTrustSection } from "./components/PrivacyTrustSection";
import { demoHighlights } from "./data/demoData";
import { BrandLockup } from "@/components/brand/BrandLogo";

const navItems = [
  { label: "Überblick", target: "overview" },
  { label: "Athleten-Flow", target: "player-flow" },
  { label: "Coach-Dashboard", target: "coach-demo" },
  { label: "Datenschutz", target: "privacy-demo" },
];

const DemoPage = () => {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <section id="overview" className="relative overflow-hidden pb-14 pt-6 md:pb-24 md:pt-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.2),transparent_34%),radial-gradient(circle_at_75%_15%,hsl(var(--primary)/0.12),transparent_28%)]" />
        <div className="container mx-auto px-6">
          <div className="mb-10 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Startseite
            </button>
            <div className="hidden rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm text-primary sm:block">
              Demo-Daten · keine Speicherung
            </div>
          </div>

          <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <BrandLockup className="mb-7" symbolSize={34} textClassName="text-lg" />
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                <PlayCircle className="h-4 w-4" />
                Interaktive Produktdemo
              </p>
              <h1 className="font-heading text-4xl font-bold leading-tight md:text-6xl">
                Sieh, wie RewirePerform im Alltag funktioniert.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                Eine isolierte Demo für Coaches: Daily Flow der Athleten,
                Tages-Puls, Mission, Programmverlauf und Team-Überblick — ohne
                Login, ohne echte Daten.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => scrollToSection("player-flow")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-4 font-heading font-semibold text-primary-foreground transition-all hover:shadow-glow"
                >
                  Daily Flow testen
                  <ArrowRight className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("coach-demo")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/70 px-7 py-4 font-heading font-semibold transition-all hover:bg-secondary"
                >
                  Coach-Ansicht ansehen
                </button>
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4 text-primary" />
                Demo-Daten. Keine echten Athleten. Keine Speicherung.
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.65, delay: 0.1 }}
              className="grid gap-5 md:grid-cols-[0.7fr_1.3fr] lg:grid-cols-1 xl:grid-cols-[0.68fr_1.32fr]"
            >
              <MockPhoneFrame />
              <MockDesktopFrame />
            </motion.div>
          </div>
        </div>
      </section>

      <nav className="sticky top-0 z-20 border-y border-border bg-background/88 backdrop-blur-xl">
        <div className="container mx-auto overflow-x-auto px-6 py-3">
          <div className="flex min-w-max gap-2 md:justify-center">
            {navItems.map((item) => (
              <button
                key={item.target}
                type="button"
                onClick={() => scrollToSection(item.target)}
                className="rounded-full border border-border bg-card/60 px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <section className="border-b border-border py-20">
        <div className="container mx-auto px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {demoHighlights.map(({ Icon, title, text }) => (
              <div key={title} className="rounded-3xl border border-border bg-card/70 p-6">
                <Icon className="h-6 w-6 text-primary" />
                <h2 className="mt-5 font-heading text-xl font-bold">{title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-3xl border border-border bg-card/60 p-6 md:p-8">
            <p className="font-heading text-2xl font-bold">Was du hier siehst</p>
            <p className="mt-4 max-w-4xl leading-relaxed text-muted-foreground">
              Diese Demo zeigt beispielhaft, wie ein Teamtag in RewirePerform aussehen kann. Inhalte, Werte und Athleten
              sind Demo-Daten. Das echte System bleibt privat, rollenbasiert und getrennt von dieser Sandbox.
            </p>
          </div>
        </div>
      </section>

      <PlayerFlowDemo />
      <CoachDashboardDemo />
      <PrivacyTrustSection />
      <FinalCTA />
    </main>
  );
};

const FinalCTA = () => {
  const navigate = useNavigate();

  return (
    <section className="border-t border-border py-24">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-primary/25 bg-primary/10 p-8 text-center md:p-12">
          <CalendarCheck className="mx-auto h-9 w-9 text-primary" />
          <h2 className="mt-6 font-heading text-3xl font-bold md:text-5xl">Bereit, das System mit deinem Team zu starten?</h2>
            <p className="mt-5 text-muted-foreground">
            Prüfe, ob RewirePerform zu deinem Team oder deiner Organisation passt.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate("/team-access")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-4 font-heading font-semibold text-primary-foreground transition-all hover:shadow-glow"
            >
              Team oder Organisation anfragen
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card/70 px-7 py-4 font-heading font-semibold transition-all hover:bg-secondary"
            >
              Zurück zur Startseite
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DemoPage;
