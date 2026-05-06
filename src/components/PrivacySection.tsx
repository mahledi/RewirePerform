import { motion } from "framer-motion";
import { Lock } from "lucide-react";

const items = [
  "Journale bleiben privat",
  "Freitexte bleiben privat",
  "Coach sieht nur Aggregate",
  "Teamdaten ab n≥5",
  "Keine psychologischen Labels einzelner Spieler",
];

const PrivacySection = () => {
  return (
    <section className="py-32 relative bg-secondary/30">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-sm font-medium text-primary tracking-widest uppercase mb-4 block">
              Privacy
            </span>
            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6">
              Ehrliche Reflexion
              <br />
              <span className="text-gradient">braucht Schutz.</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Spieler sollen sich selbst verstehen lernen, ohne Angst zu haben,
              dass private Gedanken gegen sie verwendet werden. Deshalb trennt
              RewirePerform klar zwischen Spieler-Privatsphäre und
              Coach-Überblick.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-8 rounded-2xl bg-gradient-card border-glow shadow-card"
          >
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-primary/10 mt-0.5">
                    <Lock className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-foreground font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PrivacySection;
