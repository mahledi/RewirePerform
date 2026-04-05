import { motion } from "framer-motion";
import { Brain, Zap, Target, Wind, Eye, Flame, Shield } from "lucide-react";

const regions = [
  {
    icon: Zap,
    region: "Amygdala",
    role: "Dein Alarmsystem",
    description: "Reagiert in 12ms – schneller als dein Bewusstsein. Wir lehren sie, Druck als Chance zu lesen statt als Gefahr.",
    color: "text-red-400",
  },
  {
    icon: Brain,
    region: "Präfrontaler Kortex",
    role: "Dein Entscheidungszentrum",
    description: "Unter Stress fährt er herunter – genau wenn du ihn am meisten brauchst. Wir halten ihn aktiv.",
    color: "text-blue-400",
  },
  {
    icon: Flame,
    region: "Anterior Midcingulate Cortex",
    role: "Dein Willpower-Muskel",
    description: "Er wächst PHYSISCH wenn du freiwillig unangenehme Dinge tust. Messbar im MRT. Disziplin ist trainierbar – buchstäblich.",
    color: "text-orange-400",
  },
  {
    icon: Target,
    region: "Basalganglien",
    role: "Dein Autopilot",
    description: "Mentale Skills werden hierhin verlagert, damit sie automatisch laufen – wie Dribbeln oder Atmen.",
    color: "text-green-400",
  },
  {
    icon: Wind,
    region: "Default Mode Network",
    role: "Dein Grübel-Netzwerk",
    description: "Nach Fehlern läuft es heiß. Keine Charakterschwäche – ein Netzwerk, das man gezielt unterbrechen kann.",
    color: "text-purple-400",
  },
  {
    icon: Eye,
    region: "Prämotorischer Kortex",
    role: "Dein Simulations-Center",
    description: "Visualisierung aktiviert dieselben Neuronen wie echte Bewegung. Mentale Reps = echte Reps.",
    color: "text-cyan-400",
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
                Neurokognitives Training
              </span>
            </div>
          </div>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6">
            Wir trainieren dein Gehirn.
            <br />
            <span className="text-gradient">Nicht dein Ego.</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Jede Aufgabe in deinem 56-Tage-Programm zielt auf eine spezifische 
            Gehirnregion. Das ist kein Motivations-Talk – das ist Neurowissenschaft. 
            Dein Gehirn verändert sich physisch. Messbar.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {regions.map((r, i) => (
            <motion.div
              key={r.region}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="p-6 rounded-2xl bg-gradient-card border-glow shadow-card group hover:scale-[1.02] transition-transform"
            >
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl bg-secondary/50 ${r.color}`}>
                  <r.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading font-semibold text-foreground mb-0.5">
                    {r.region}
                  </h3>
                  <span className="text-xs font-medium text-primary">{r.role}</span>
                  <p className="text-muted-foreground text-sm leading-relaxed mt-2">
                    {r.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* aMCC Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 p-8 rounded-2xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-glow text-center max-w-2xl mx-auto"
        >
          <Flame className="w-8 h-8 text-primary mx-auto mb-4" />
          <h3 className="font-heading text-xl font-bold mb-3 text-foreground">
            Der aMCC – Dein Willpower-Muskel
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Studien zeigen: Der Anterior Midcingulate Cortex wächst physisch, wenn du 
            freiwillig unangenehme Dinge tust. Bei Extremsportlern und "Super-Agern" 
            ist er signifikant größer. Deshalb enthält jeder Tag in deinem Programm 
            eine aMCC-Challenge – eine kleine Überwindung, die deinen Willpower-Muskel 
            wachsen lässt. Buchstäblich.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default BrainSection;
