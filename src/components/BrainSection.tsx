import { motion } from "framer-motion";
import { Shield, Brain, Flame, Repeat } from "lucide-react";

const cards = [
  {
    icon: Shield,
    title: "Amygdala & Bedrohung",
    text: "Unter Druck reagieren Bedrohungssysteme schneller. Das Ziel ist nicht, Angst auszuschalten, sondern Verhalten trotz innerer Aktivierung steuerbar zu machen.",
  },
  {
    icon: Brain,
    title: "Präfrontaler Kortex & Kontrolle",
    text: "Fokus, Bewertung und Handlungskontrolle stehen in Verbindung mit präfrontalen Prozessen. Das System trainiert die Rückkehr zur bewussten nächsten Handlung.",
  },
  {
    icon: Flame,
    title: "aMCC & Anstrengung",
    text: "Der anterior midcingulate cortex wird mit Anstrengung, Widerstand und freiwilligem Handeln trotz Unkomfort in Verbindung gebracht. Deshalb enthält das Programm kleine, machbare Challenges.",
  },
  {
    icon: Repeat,
    title: "Basalganglien & Automatisierung",
    text: "Was wiederholt wird, kann leichter verfügbar werden. Das System bringt mentale Skills aus der Theorie in wiederholte Alltagspraxis.",
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
                Neurowissenschaft
              </span>
            </div>
          </div>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6">
            Das Gehirn ist die Grundlage.
            <br />
            <span className="text-gradient">Nicht die Metapher.</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            RewirePerform arbeitet mit Prinzipien der Neuroplastizität:
            Wiederholung, Aufmerksamkeit, emotionaler Kontext, Selbstregulation
            und Verhalten unter Druck. Die täglichen Aufgaben sind mentale Reps —
            nicht als Motivation, sondern als Training für Muster, die im
            Wettkampf entscheiden.
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
          RewirePerform misst keine Gehirnaktivität und behauptet keine
          garantierte physische Veränderung. Das System ist darauf ausgelegt,
          Bedingungen zu schaffen, die neuroplastische Anpassung unterstützen
          können.
        </motion.p>
      </div>
    </section>
  );
};

export default BrainSection;
