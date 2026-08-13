import { motion } from "framer-motion";

import { BookOpen, Heart, CheckCircle2 } from "lucide-react";

const cards = [
  {
    icon: BookOpen,
    title: "Journaling & Reflexion",
    text: "Reflexion kann Athlet:innen helfen, Muster zu erkennen, Erfahrungen einzuordnen und die nächste Handlung bewusster zu wählen.",
  },
  {
    icon: Heart,
    title: "Dankbarkeit",
    text: "Der Dankbarkeitsblock richtet Aufmerksamkeit bewusst auf konkrete Ressourcen, Verbindung und Bedeutung des Tages.",
  },
  {
    icon: CheckCircle2,
    title: "Comprehension",
    text: "Der kurze Verständnis-Check prüft, ob aus dem Tagesinhalt eine klare nächste Handlung geworden ist.",
  },
];

const MechanismSection = () => {
  return (
    <section className="py-32 relative bg-secondary/30">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mb-16"
        >
          <span className="text-sm font-medium text-primary tracking-widest uppercase mb-4 block">
            Die Mechanismen hinter dem System
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6">
            Keine Tipps.
            <br />
            <span className="text-gradient">Mechanismen.</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-4">
            Jeder Teil von RewirePerform hat eine klare Aufgabe: Erfahrungen
            einordnen, Aufmerksamkeit bewusst ausrichten und prüfen, ob die
            nächste Handlung verständlich ist.
          </p>
          <p className="text-sm text-muted-foreground/80 italic">
            Das Gesamtsystem ist neu. Seine Gestaltung orientiert sich an
            Prinzipien aus Sportpsychologie, Lernforschung, Neurowissenschaft
            und strukturierter Reflexionspraxis.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="p-6 rounded-2xl bg-gradient-card border-glow shadow-card"
            >
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary w-fit mb-4">
                <c.icon className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-2">
                {c.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {c.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MechanismSection;
