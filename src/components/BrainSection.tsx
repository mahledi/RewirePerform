import { motion } from "framer-motion";
import { BookOpen, Eye, Repeat, Target } from "lucide-react";

const cards = [
  {
    icon: Repeat,
    title: "Wiederholung",
    text: "Kurze, wiederkehrende Einheiten bringen mentale Fähigkeiten aus einmaligem Wissen in den Sportalltag.",
  },
  {
    icon: Target,
    title: "Aufmerksamkeit",
    text: "Konkrete Tagesanker helfen Athlet:innen, den Fokus auf die nächste beeinflussbare Handlung zu richten.",
  },
  {
    icon: BookOpen,
    title: "Reflexion & aktives Erinnern",
    text: "Fragen, aktives Erinnern und Journaling machen Erfahrungen bewusst und für die nächste Situation nutzbar.",
  },
  {
    icon: Eye,
    title: "Visualisierung",
    text: "Mentales Durchspielen verbindet den Satz des Tages mit einer konkreten sportlichen Situation — als Übung, nicht als Wirkversprechen.",
  },
];

const BrainSection = () => {
  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="px-4 py-2 rounded-full bg-primary/10 border-glow">
              <span className="text-sm font-medium text-primary tracking-widest uppercase">
                Wissenschaftliche Grundlage
              </span>
            </div>
          </div>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6">
            Wissenschaftliche Prinzipien.
            <br />
            <span className="text-gradient">Praktisch übersetzt.</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            RewirePerform verbindet Erkenntnisse aus Sportpsychologie,
            Lernforschung und Neurowissenschaft mit wiederholbaren Routinen.
            Die Forschung begründet die eingesetzten Prinzipien. Wie gut das
            Gesamtsystem im Sportalltag funktioniert, prüfen wir kontrolliert
            im Pilot.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-5 max-w-5xl mx-auto">
          {cards.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="p-6 rounded-2xl bg-gradient-card border-glow shadow-card"
            >
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <c.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading font-semibold text-foreground mb-2">
                    {c.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {c.text}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 text-center text-xs text-muted-foreground/70 max-w-2xl mx-auto"
        >
          RewirePerform misst keine Gehirnaktivität und garantiert keine
          körperliche Veränderung. Das System übersetzt erforschte Prinzipien
          in eine klare 56-Tage-Struktur, deren Nutzen wir im realen
          Sportalltag überprüfen.
        </motion.p>
      </div>
    </section>
  );
};

export default BrainSection;
