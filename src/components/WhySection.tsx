import { motion } from "framer-motion";
import { Activity, HeartPulse, Crosshair } from "lucide-react";

const cards = [
  {
    icon: Activity,
    title: "Druck verstehen",
    text: "Druck wird nicht romantisiert. Athlet:innen lernen, ihn zu erkennen, einzuordnen und handlungsfähig zu bleiben.",
  },
  {
    icon: HeartPulse,
    title: "Emotionen regulieren",
    text: "Negative Gefühle werden nicht unterdrückt. Sie werden beobachtet, benannt und in Verhalten übersetzt.",
  },
  {
    icon: Crosshair,
    title: "Fokus zurückholen",
    text: "Das System trainiert die Rückkehr zur nächsten kontrollierbaren Handlung.",
  },
];

const WhySection = () => {
  return (
    <section className="pt-8 pb-24 md:py-32 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mb-16"
        >
          <span className="text-sm font-medium text-primary tracking-widest uppercase mb-4 block">
            Warum es existiert
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6">
            Mentale Performance wurde zu lange
            <br />
            <span className="text-gradient">dem Zufall überlassen.</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Athlet:innen trainieren Technik, Taktik, Athletik und Ernährung. Aber der
            Umgang mit Druck, Fehlern, Selbstzweifel und Fokusverlust wird oft
            erst dann thematisiert, wenn es zu spät ist. RewirePerform bringt
            diese Arbeit in den Alltag — und Athlet:innen üben täglich, anders zu
            reagieren: nach Fehlern, unter Druck, bei Müdigkeit und in Momenten,
            in denen das Ego die Kontrolle übernehmen will.
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

export default WhySection;
