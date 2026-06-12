import { motion } from "framer-motion";
import { ClipboardCheck, Repeat, Users, LineChart } from "lucide-react";

const steps = [
  {
    icon: ClipboardCheck,
    title: "Analyse",
    description:
      "Fragen erfassen Sport, Position, Selbstführung, Druckmuster, Motivation und mentale Ausgangslage.",
  },
  {
    icon: Repeat,
    title: "Tägliche Praxis",
    description:
      "Jeden Tag trainieren Athlet:innen konkrete Skills: Fokus, Prozessdenken, Fehlerreaktion, Selbstgespräch, Druckinterpretation, Discomfort und Reflexion.",
  },
  {
    icon: Users,
    title: "Team Pulse",
    description:
      "10 kurze Check-in-Fragen machen Zustand, Bereitschaft und Teamtendenzen sichtbar — anonymisiert und aggregiert.",
  },
  {
    icon: LineChart,
    title: "Evidence Layer",
    description:
      "Pre/Mid/Post-Assessments, Dranbleiben, Comprehension und Teamdaten zeigen beobachtete Entwicklung über 56 Tage.",
  },
];

const ProcessSection = () => {
  return (
    <section className="py-32 relative bg-secondary/30">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20 max-w-3xl mx-auto"
        >
          <span className="text-sm font-medium text-primary tracking-widest uppercase mb-4 block">
            So funktioniert es
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6">
            56 Tage. Eine klare Progression.
            <br />
            <span className="text-gradient">Tägliche Reps.</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Jeder Tag verbindet Science Bite, mentale Aufgabe, Verständnischeck
            und Reflexion. Die Struktur bleibt stabil — die Anwendung wird über
            Sport, Position, Zustand und Fortschritt persönlich eingeordnet.
          </p>
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
