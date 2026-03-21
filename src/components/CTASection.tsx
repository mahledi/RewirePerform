import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CTASection = () => {
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
            Bereit, den
            <br />
            <span className="text-gradient">Unterschied zu machen?</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
            Starte jetzt mit deinem individuellen Mental-Performance-Programm. 
            Wissenschaftlich fundiert. KI-personalisiert. Täglich begleitet.
          </p>
          <button className="group inline-flex items-center gap-2 px-10 py-5 rounded-xl bg-primary font-heading font-semibold text-lg text-primary-foreground transition-all hover:shadow-glow hover:scale-[1.02]">
            Jetzt Zugang sichern
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>
          <p className="text-xs text-muted-foreground mt-6">
            Individueller Zugang · Sofort starten · Jederzeit kündbar
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
