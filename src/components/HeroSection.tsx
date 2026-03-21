import { motion } from "framer-motion";
import { ArrowRight, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-athlete.jpg";

const HeroSection = () => {
  const navigate = useNavigate();
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Athlet in mentaler Vorbereitung"
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
      </div>

      {/* Content */}
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
              <span className="text-sm font-medium text-primary">Wissenschaftlich fundiert</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-heading text-5xl md:text-7xl font-bold leading-[1.05] mb-6"
          >
            Dein Kopf entscheidet
            <br />
            <span className="text-gradient">das Spiel.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-xl mb-10 leading-relaxed"
          >
            KI-gestützte mentale Performance-Begleitung für Sportler. 
            Personalisiert. Täglich. Wissenschaftlich bewiesen.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <button className="group flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary font-heading font-semibold text-primary-foreground transition-all hover:shadow-glow hover:scale-[1.02]">
              Zugang sichern
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-border font-heading font-medium text-foreground transition-all hover:bg-secondary">
              Mehr erfahren
            </button>
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
