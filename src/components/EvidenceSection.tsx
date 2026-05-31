import { motion } from "framer-motion";
import { LineChart, CheckCircle2, TrendingUp } from "lucide-react";

const stats = [
  { label: "Tage", value: "56" },
  { label: "Assessments", value: "Pre · Mid · Post" },
  { label: "Anonymisiert", value: "n≥5" },
  { label: "Dranbleiben", value: "Tracked" },
  { label: "Comprehension", value: "Tracked" },
];

const cards = [
  {
    icon: LineChart,
    title: "Assessment Layer",
    text: "SMTQ, CSAI-2R und Flow bilden Pre-, Mid- und Post-Vergleiche — aggregiert, anonymisiert und teambezogen.",
  },
  {
    icon: CheckCircle2,
    title: "Dranbleiben & Verständnis",
    text: "Absolvierte Tage, Streaks, Check-ins und Comprehension zeigen, wie konsequent das System im Alltag genutzt wurde.",
  },
  {
    icon: TrendingUp,
    title: "Beobachtete Entwicklung",
    text: "Das System zeigt Veränderung im Verlauf — ohne unbelegte Heilungs- oder Garantieversprechen.",
  },
];

const EvidenceSection = () => {
  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-sm font-medium text-primary tracking-widest uppercase mb-4 block">
            Evidenz & Messung
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6">
            Veränderung
            <br />
            <span className="text-gradient">sichtbar machen.</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            RewirePerform misst Nutzung, Verständnis, Dranbleiben und beobachtete
            Veränderungen über 56 Tage — als ehrlicher Outcome-Layer für Teams.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-16 max-w-5xl mx-auto">
          {stats.map((s) => (
            <div
              key={s.label}
              className="p-4 rounded-xl bg-gradient-card border-glow text-center"
            >
              <div className="font-heading font-bold text-foreground text-lg leading-tight">
                {s.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-12">
          {cards.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-2xl bg-gradient-card border-glow shadow-card"
            >
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary w-fit mb-4">
                <c.icon className="w-5 h-5" />
              </div>
              <h3 className="font-heading text-xl font-semibold mb-3">{c.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{c.text}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="p-6 rounded-2xl bg-primary/5 border border-primary/20 max-w-3xl mx-auto"
        >
          <p className="text-sm text-muted-foreground leading-relaxed text-center">
            <span className="text-foreground font-medium">Science Guardrail.</span>{" "}
            RewirePerform ersetzt keine wissenschaftliche Studie. Das System ist
            neu. Aber seine Bausteine sind bewusst aus erforschten Mechanismen
            zusammengesetzt: Wiederholung, Reflexion, Aufmerksamkeit,
            Selbstregulation, Dankbarkeit, Feedback und Verhalten unter Druck.
            Genau daraus entsteht ein Umfeld, das neuroplastische Anpassung und
            mentale Entwicklung unterstützen kann.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default EvidenceSection;
