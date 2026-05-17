import { motion } from "framer-motion";
import { ArrowRight, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-athlete.jpg";
import NeuroCoreScene from "@/components/NeuroCoreScene";

const HeroSection = () => {
  const navigate = useNavigate();
  return (
    <section className="relative min-h-[92svh] flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Athlet in mentaler Vorbereitung"
          className="w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 via-48% to-background/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-background/60" />
        <div className="absolute inset-y-0 right-0 w-[72%] bg-[radial-gradient(circle_at_65%_42%,hsl(160_84%_39%/0.16),transparent_32%),radial-gradient(circle_at_74%_58%,hsl(218_90%_65%/0.11),transparent_28%)]" />
      </div>

      <div className="absolute inset-y-10 right-0 z-[1] hidden w-[55%] items-center justify-center lg:flex">
        <NeuroCoreScene />
      </div>

      <div className="relative z-10 container mx-auto px-6 pb-24 pt-28 md:pt-32">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,0.78fr)]">
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
              className="font-heading text-4xl font-bold leading-[1.05] sm:text-5xl md:text-7xl mb-6"
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
              Ein 56-Tage-System für Athleten und Teams, das tägliche mentale Praxis, neurokognitive
              Prinzipien und messbare Entwicklung verbindet.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <button
                onClick={() => navigate("/auth?switch=1")}
                className="group flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 font-heading font-semibold text-primary-foreground transition-all hover:scale-[1.02] hover:shadow-glow"
              >
                Zugang sichern
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button className="flex items-center justify-center gap-2 rounded-xl border border-border px-8 py-4 font-heading font-medium text-foreground transition-all hover:bg-secondary">
                Demo anfragen
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45 }}
              className="mt-10 grid max-w-xl grid-cols-3 gap-3 text-xs text-muted-foreground"
            >
              {[
                ["56", "Tage"],
                ["3", "Rituale"],
                ["Team", "fähig"],
              ].map(([value, label]) => (
                <div key={value} className="border-l border-primary/30 pl-3">
                  <p className="font-heading text-lg font-semibold text-foreground">{value}</p>
                  <p>{label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.18 }}
            className="relative -mx-8 block lg:hidden"
          >
            <NeuroCoreScene />
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
