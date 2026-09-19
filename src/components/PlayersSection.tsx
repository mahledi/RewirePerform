import { motion } from "framer-motion";
import { Lock, Sliders, CheckCircle2 } from "lucide-react";

const cards = [
  {
    icon: Lock,
    title: "Private Reflexion",
    text: "Athlet:innen können ehrlich reflektieren. Journale und Freitexte bleiben privat.",
  },
  {
    icon: Sliders,
    title: "Micro-Adjustment",
    text: "Das Tagesprogramm bleibt klar. Hinweise, Beispiele und Fokus werden an Sport, Position und Zustand angepasst.",
  },
  {
    icon: CheckCircle2,
    title: "Comprehension Check",
    text: "Athlet:innen wiederholen, was sie tun sollen — damit Wissen in Anwendung übergeht.",
  },
];

const PlayersSection = () => {
  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mb-16"
        >
          <span className="text-sm font-medium text-primary tracking-widest uppercase mb-4 block">
            Für Athlet:innen
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6">
            Verstehen. Anwenden.
            <br />
            <span className="text-gradient">Wiederholen.</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Athlet:innen lernen nicht nur, was in ihrem Kopf passiert. Sie üben
            täglich, anders zu reagieren: nach Fehlern, bei Druck, bei
            Müdigkeit, bei Selbstzweifel und in Momenten, in denen das Ego die
            Kontrolle übernehmen will.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          {cards.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-2xl bg-gradient-card border-glow shadow-card"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-6">
                <c.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading text-xl font-semibold mb-3">{c.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{c.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlayersSection;
