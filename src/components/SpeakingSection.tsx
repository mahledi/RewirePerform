import { motion } from "framer-motion";
import { Mic, Brain, Sparkles, Network } from "lucide-react";

const cards = [
  {
    icon: Network,
    title: "Mehr Netzwerke gleichzeitig",
    text: "Beim Sprechen feuern Broca, Wernicke, motorischer Cortex und auditiver Rückkopplungs-Loop parallel. Mehrere Bahnen kodieren denselben Gedanken — eine multimodale Spur statt einer einzigen.",
  },
  {
    icon: Brain,
    title: "Klarere Einsicht",
    text: "Über sich selbst zu sprechen aktiviert den medialen präfrontalen Cortex und reguliert die Amygdala runter (Kross, Univ. Michigan). Weniger Grübeln, mehr Distanz, schärfere Reflexion.",
  },
  {
    icon: Sparkles,
    title: "Schnellere Verdrahtung",
    text: "Synchrone Co-Aktivierung beschleunigt synaptische Bahnung (Hebbian Plasticity, LTP). Der Generation Effect zeigt: Selbst ausgesprochene Inhalte bleiben deutlich besser hängen als gelesene.",
  },
];

const SpeakingSection = () => {
  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mb-16"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Mic className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-primary tracking-widest uppercase">
              Warum eingesprochen wird
            </span>
          </div>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6">
            Du denkst nicht nur.
            <br />
            <span className="text-gradient">Du verdrahtest.</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-4">
            Reflexion und Journal werden bei RewirePerform <strong className="text-foreground">eingesprochen</strong>,
            nicht getippt. Sprechen aktiviert mehr neuronale Netzwerke gleichzeitig —
            Sprache, Motorik, Hören und Selbst-Wahrnehmung. Genau diese Synchronität
            beschleunigt, wie schnell sich neue Verbindungen im Gehirn bilden.
          </p>
          <p className="text-sm text-muted-foreground/80 italic">
            Hebbian Plasticity, Generation Effect, Self-distancing through speech —
            drei unabhängige Forschungslinien zeigen dasselbe: laut aussprechen
            verdrahtet schneller und tiefer als stilles Tippen.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
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

export default SpeakingSection;
