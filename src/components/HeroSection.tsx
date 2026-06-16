import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Brain, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-athlete.jpg";

const HeroSection = () => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [hideHint, setHideHint] = useState(false);

  useEffect(() => {
    const onScroll = () => setHideHint(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToWhy = () => {
    document.getElementById("why")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="relative min-h-[88svh] md:min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Athlet in mentaler Vorbereitung"
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
      </div>

      <div className="relative z-10 container mx-auto px-6 py-32">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-8"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border-glow">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Neurokognitives Performance-System</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-heading text-5xl md:text-7xl font-bold leading-[1.05] mb-6"
          >
            Trainiere das System
            <br />
            <span className="text-gradient">hinter deiner Performance.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed"
          >
            Ein 56-Tage-System für Athleten und Teams, das tägliche mentale
            Praxis, neurokognitive Prinzipien und messbare Entwicklung verbindet.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <button onClick={() => navigate("/auth?switch=1")} className="group flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary font-heading font-semibold text-primary-foreground transition-all hover:shadow-glow hover:scale-[1.02]">
              Zugang sichern
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/demo")}
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-border font-heading font-medium text-foreground transition-all hover:bg-secondary"
            >
              Demo ansehen
            </button>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      <motion.button
        type="button"
        onClick={scrollToWhy}
        aria-label="Mehr erfahren"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: hideHint ? 0 : 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="md:hidden absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 px-4 py-2.5 rounded-full bg-background/40 backdrop-blur-sm border border-border/30"
      >
        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Mehr erfahren
        </span>
        <motion.span
          animate={prefersReducedMotion ? undefined : { y: [0, 5, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="flex"
        >
          <ChevronDown className="w-5 h-5 text-primary" />
        </motion.span>
      </motion.button>
    </section>

  );
};

export default HeroSection;
