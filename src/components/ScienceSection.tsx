import { motion } from "framer-motion";
import { BookOpen, FlaskConical, Eye, Repeat } from "lucide-react";

const principles = [
  {
    icon: FlaskConical,
    title: "Neurokognitives Training",
    text: "PFC-Aktivierung und Amygdala-Regulation: Wir trainieren die Gehirnregionen, die unter Druck über Sieg und Niederlage entscheiden.",
  },
  {
    icon: Eye,
    title: "Prämotorische Aktivierung",
    text: "Visualisierung aktiviert denselben prämotorischen Kortex wie die echte Bewegung – mentale Reps formen reale neuronale Pfade (Jeannerod, 2001).",
  },
  {
    icon: Repeat,
    title: "Neuroplastische Progression",
    text: "56 Tage: Von PFC-gesteuertem bewusstem Üben zu automatisierten Routinen in den Basalganglien. Dein Gehirn baut sich physisch um.",
  },
  {
    icon: BookOpen,
    title: "aMCC Willpower-Training",
    text: "Der Anterior Midcingulate Cortex wächst messbar durch freiwillige Überwindung. Tägliche Challenges machen Disziplin zu einem physischen Muskel.",
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
              Die Wissenschaft
            </span>
            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6">
              Vertrauen durch
              <br />
              <span className="text-gradient">Evidenz.</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              Jede Übung, jede Frage, jede Empfehlung basiert auf 
              peer-reviewed Forschung aus Sportpsychologie, Neurowissenschaften 
              und Verhaltensforschung. Kein Trend – Wissenschaft.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="text-center">
                <span className="block text-3xl font-heading font-bold text-foreground">150+</span>
                Studien
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="text-center">
                <span className="block text-3xl font-heading font-bold text-foreground">12</span>
                Prinzipien
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="text-center">
                <span className="block text-3xl font-heading font-bold text-foreground">100%</span>
                Individuell
              </div>
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
