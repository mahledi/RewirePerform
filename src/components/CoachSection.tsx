import { motion } from "framer-motion";
import { Activity, BarChart3, BookOpen, Lock } from "lucide-react";

const features = [
  {
    icon: Activity,
    title: "Team Pulse",
    text: "Tägliche und wöchentliche Trends zeigen Energie, Fokus, Stress, Erholung, Druck und Teamverbundenheit — erst ab n≥5 anonymisiert.",
  },
  {
    icon: BookOpen,
    title: "Heute im Programm",
    text: "Coaches sehen, welchen mentalen Inhalt die Spieler heute bearbeiten, damit Training und Kommunikation das System unterstützen.",
  },
  {
    icon: BarChart3,
    title: "Coach Toolkit",
    text: "Kurze Science Inputs, Team Standards und ein optionales Coach Journal helfen, die Kultur hinter dem Programm zu stärken.",
  },
];

const CoachSection = () => {
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
            Für Coaches
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6">
            Das Team sehen.
            <br />
            <span className="text-gradient">Nicht überwachen.</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Coaches bekommen Orientierung über Teilnahme, Team Pulse, Adherence
            und aggregierte Entwicklung — ohne private Journale, Einzelantworten
            oder psychologische Labels einzelner Spieler zu sehen.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 mb-16">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl bg-gradient-card border-glow shadow-card"
            >
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary w-fit mb-4">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-semibold mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.text}</p>
            </motion.div>
          ))}
        </div>

        {/* Live Team Intelligence */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="p-10 rounded-3xl bg-gradient-card border-glow shadow-card max-w-5xl mx-auto"
        >
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary tracking-widest uppercase">
              Live Team Intelligence
            </span>
          </div>
          <h3 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            Live-Daten für{" "}
            <span className="text-gradient">bessere Teamführung.</span>
          </h3>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Zum ersten Mal wird mentale Performance im Team nicht nur gefühlt,
            sondern sichtbar gemacht: tägliche Check-ins, Team Pulse, Adherence,
            Verständnis und Pre/Mid/Post-Assessments zeigen, wie das Team
            wirklich durch das Programm geht. Coaches erhalten Orientierung für
            Training, Belastung und Kommunikation — ohne private Journale oder
            Einzelantworten zu sehen.
          </p>
          <p className="text-sm text-muted-foreground/80 italic">
            Live bedeutet nicht Überwachung. Live bedeutet: Der Coach sieht
            rechtzeitig, ob das Team müde, überlastet, fokussiert, verbunden
            oder bereit wirkt — aggregiert, anonymisiert und erst ab
            ausreichender Gruppengröße.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CoachSection;
