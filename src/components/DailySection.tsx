import { motion } from "framer-motion";
import { Sun, Moon, Zap, CheckCircle2 } from "lucide-react";

const DailySection = () => {
  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="text-sm font-medium text-primary tracking-widest uppercase mb-4 block">
            Tägliche Begleitung
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold">
            Jeden Tag ein
            <br />
            <span className="text-gradient">Check-in.</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Training Day */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-8 rounded-2xl bg-gradient-card border-glow shadow-card"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-heading text-xl font-semibold">Trainingstag</h3>
            </div>
            <ul className="space-y-4">
              {[
                "Mentale Aufgabe vor dem Training",
                "Gezielte Situationen im Training visualisieren",
                "Fokus auf Progress statt Perfektion",
                "Reflexion & Check-in nach dem Training",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-1 shrink-0" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Rest Day */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-8 rounded-2xl bg-gradient-card border-glow shadow-card"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                <Moon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-heading text-xl font-semibold">Ruhetag</h3>
            </div>
            <ul className="space-y-4">
              {[
                "Mindset-Aufgaben & Journaling",
                "Geführte Visualisierung",
                "Mentale Wettkampf-Vorbereitung",
                "Selbstreflexion & Erholung",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-1 shrink-0" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default DailySection;
