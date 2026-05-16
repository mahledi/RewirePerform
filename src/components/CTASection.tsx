import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CTASection = () => {
  const navigate = useNavigate();
  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6">
            Bereit, mentale Performance
            <br />
            <span className="text-gradient">systematisch zu trainieren?</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
            Für Teams, die nichts mehr dem Zufall überlassen wollen.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/auth?switch=1")}
              className="group inline-flex items-center justify-center gap-2 px-10 py-5 rounded-xl bg-primary font-heading font-semibold text-lg text-primary-foreground transition-all hover:shadow-glow hover:scale-[1.02]"
            >
              Zugang sichern
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
            <button className="inline-flex items-center justify-center gap-2 px-10 py-5 rounded-xl border border-border font-heading font-semibold text-lg text-foreground transition-all hover:bg-secondary">
              Demo anfragen
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-8 font-heading">
            Keine Motivations-Floskeln. Ein System.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
