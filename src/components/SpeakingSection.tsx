import { motion } from "framer-motion";
import { Mic, Brain, Sparkles, Network } from "lucide-react";

const cards = [
  {
    icon: Network,
    title: "Aktiv formulieren",
    text: "Eigene Worte zu finden ist aktive Auseinandersetzung statt passives Lesen. So wird aus einem Gedanken eine konkrete Aussage, mit der du weiterarbeiten kannst.",
  },
  {
    icon: Brain,
    title: "Reaktionen benennen",
    text: "Das Benennen von Gefühlen und Reaktionen war in Laborstudien mit veränderter Aktivität in präfrontalen und limbischen Regionen verbunden. Das kann helfen, Erlebtes mit etwas mehr Abstand zu betrachten.",
  },
  {
    icon: Sparkles,
    title: "Direkt festhalten",
    text: "Wenn Sprechen für dich schneller oder natürlicher ist, hältst du den Gedanken fest, bevor du ihn glättest oder verlierst. Der übernommene Text bleibt vollständig bearbeitbar.",
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
            Aus Gedanken wird
            <br />
            <span className="text-gradient">konkretes Training.</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-4">
            Bei RewirePerform kannst du Reflexionen <strong className="text-foreground">einsprechen oder tippen</strong>.
            Lautes Formulieren macht Gedanken explizit und kann dabei helfen,
            Reaktionen zu benennen, zu ordnen und aus etwas Distanz zu betrachten.
            Entscheidend ist die aktive, wiederholte Auseinandersetzung.
          </p>
          <p className="text-sm text-muted-foreground/80 italic">
            Sprechen ist freiwillig. In der iPhone- und iPad-App wird es lokal auf dem Gerät
            in Text umgewandelt; Tippen bleibt gleichwertig möglich.
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
