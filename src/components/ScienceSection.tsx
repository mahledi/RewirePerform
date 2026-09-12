import { motion } from "framer-motion";
import { BookOpen, Eye, Repeat, Target } from "lucide-react";

const principles = [
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

const ScienceSection = () => {
  return (
    <section className="py-32 relative bg-secondary/30">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-sm font-medium text-primary tracking-widest uppercase mb-4 block">
              Wissenschaftliche Grundlage
            </span>
            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6">
              Wissenschaftliche Prinzipien.
              <br />
              <span className="text-gradient">Praktisch übersetzt.</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              RewirePerform verbindet Erkenntnisse aus Sportpsychologie,
              Lernforschung und Neurowissenschaft mit wiederholbaren Routinen.
              Die Forschung begründet die eingesetzten Prinzipien. Wie gut das
              Gesamtsystem im Sportalltag funktioniert, prüfen wir kontrolliert
              im Pilot.
            </p>
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm leading-relaxed text-muted-foreground">
              RewirePerform misst keine Gehirnaktivität und garantiert keine
              körperliche Veränderung. Es übersetzt erforschte Prinzipien in
              eine klare 56-Tage-Struktur, deren Nutzen wir im realen
              Sportalltag überprüfen.
            </div>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-5">
            {principles.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-gradient-card border-glow shadow-card"
              >
                <p.icon className="w-5 h-5 text-primary mb-4" />
                <h3 className="font-heading font-semibold mb-2">{p.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{p.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScienceSection;
