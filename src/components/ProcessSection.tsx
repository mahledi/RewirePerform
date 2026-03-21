import { motion } from "framer-motion";
import { ClipboardCheck, Cpu, CalendarDays, Target } from "lucide-react";

const steps = [
  {
    icon: ClipboardCheck,
    title: "Tiefgehende Analyse",
    description:
      "Deine Antworten auf sorgfältig entwickelte Fragen offenbaren mentale Muster, Stärken und Lücken – auch solche, die dir selbst nicht bewusst sind.",
  },
  {
    icon: Cpu,
    title: "KI-Auswertung",
    description:
      "Unser Algorithmus wertet deine Antworten aus und erstellt ein individuelles Profil. Kein Sportler bekommt das gleiche Programm.",
  },
  {
    icon: CalendarDays,
    title: "Tägliche Begleitung",
    description:
      "An Trainingstagen mentale Übungen für den Wettkampf. An Ruhetagen Visualisierung, Mindset-Arbeit und Vorbereitung. Jeden Tag ein Check-in.",
  },
  {
    icon: Target,
    title: "Adaptive Anpassung",
    description:
      "Die KI verschiebt und passt dein Programm fortlaufend an – basierend auf deinen täglichen Eingaben und deinem Fortschritt.",
  },
];

const ProcessSection = () => {
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
            So funktioniert es
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold">
            Von der Analyse zur
            <br />
            <span className="text-gradient">täglichen Praxis</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative p-8 rounded-2xl bg-gradient-card border-glow shadow-card group hover:shadow-glow transition-all duration-500"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-6">
                <step.icon className="w-6 h-6 text-primary" />
              </div>
              <span className="absolute top-6 right-6 font-heading text-6xl font-bold text-foreground/5">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-heading text-xl font-semibold mb-3">
                {step.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
