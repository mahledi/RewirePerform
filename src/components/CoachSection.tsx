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

const privacyItems = [
  "Journale bleiben privat",
  "Freitexte bleiben privat",
  "Coach sieht nur Aggregate",
  "Teamdaten ab n≥5",
  "Keine psychologischen Labels einzelner Spieler",
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

        {/* Privacy Panel */}
        <div className="grid lg:grid-cols-2 gap-10 items-center max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-sm font-medium text-primary tracking-widest uppercase mb-4 block">
              Privacy
            </span>
            <h3 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              Ehrliche Reflexion
              <br />
              <span className="text-gradient">braucht Schutz.</span>
            </h3>
            <p className="text-muted-foreground leading-relaxed">
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
              {privacyItems.map((item) => (
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

export default CoachSection;
