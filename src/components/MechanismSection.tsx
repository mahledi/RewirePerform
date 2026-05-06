import { motion } from "framer-motion";

import { BookOpen, Heart, CheckCircle2, Flame } from "lucide-react";

const cards = [
  {
    icon: BookOpen,
    title: "Journaling & Reflexion",
    text: "Reflexion hilft Spielern, Muster zu erkennen, Abstand zu Gedanken zu gewinnen und Verhalten bewusster zu steuern.",
  },
  {
    icon: Heart,
    title: "Dankbarkeit",
    text: "Dankbarkeit lenkt Aufmerksamkeit auf Ressourcen, Verbindung und Bedeutung — ein Gegengewicht zu Druck, Vergleich und Defizitfokus.",
  },
  {
    icon: CheckCircle2,
    title: "Comprehension",
    text: "Spieler wiederholen, was sie tun sollen. Dadurch wird aus Information ein klarer Handlungsplan.",
  },
  {
    icon: Flame,
    title: "Discomfort & aMCC",
    text: "Kleine freiwillige Herausforderungen trainieren Handeln trotz Widerstand — ein Prozess, der mit Anstrengung und dem anterior midcingulate cortex in Verbindung gebracht wird.",
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
            Jeder Teil von RewirePerform hat eine Funktion: Reflexion stärkt
            Selbstwahrnehmung, Dankbarkeit verändert Aufmerksamkeit,
            Comprehension verwandelt Wissen in Anwendung, kleine Challenges
            trainieren Handeln trotz Widerstand.
          </p>
          <p className="text-sm text-muted-foreground/80 italic">
            Das Tool ist neu. Die Mechanismen dahinter sind nicht zufällig: Sie
            stammen aus Sportpsychologie, Verhaltenswissenschaft, Neurowissenschaft
            und jahrzehntealter Reflexionspraxis.
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
