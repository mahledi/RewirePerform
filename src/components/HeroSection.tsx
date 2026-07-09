import { motion } from "framer-motion";
import { ArrowRight, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-athlete.jpg";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[76svh] md:min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Athlet in mentaler Vorbereitung"
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
      </div>

      <div className="relative z-10 container mx-auto px-6 pt-28 pb-14 md:py-32">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-6 md:mb-8"
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
            className="font-heading text-4xl sm:text-5xl md:text-7xl font-bold leading-[1.05] mb-5 md:mb-6"
          >
            Trainiere das System
            <br />
            <span className="text-gradient">hinter deiner Performance.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-base md:text-xl text-muted-foreground max-w-2xl mb-7 md:mb-10 leading-relaxed"
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
            <button onClick={() => navigate("/auth?switch=1")} className="group flex items-center justify-center gap-2 px-8 py-3.5 md:py-4 rounded-xl bg-primary font-heading font-semibold text-primary-foreground transition-all hover:shadow-glow hover:scale-[1.02]">
              Zugang sichern
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/demo")}
              className="flex items-center justify-center gap-2 px-8 py-3.5 md:py-4 rounded-xl border border-border font-heading font-medium text-foreground transition-all hover:bg-secondary"
            >
              Demo ansehen
            </button>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>

  );
};

export default HeroSection;
