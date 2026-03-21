import { motion } from "framer-motion";
import { Users, BarChart3, Shield, Eye } from "lucide-react";

const features = [
  { icon: Eye, title: "Volle Transparenz", text: "Alle Sportler-Aktivitäten in einer Übersicht." },
  { icon: BarChart3, title: "Fortschritts-Tracking", text: "Entwicklung über Wochen und Monate verfolgen." },
  { icon: Users, title: "Team-Management", text: "Mehrere Sportler gleichzeitig betreuen." },
  { icon: Shield, title: "Datenschutz", text: "DSGVO-konform. Daten gehören dem Sportler." },
];

const CoachSection = () => {
  return (
    <section className="py-32 relative bg-secondary/30">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl bg-gradient-card border-glow shadow-card"
            >
              {/* Mock Dashboard */}
              <div className="flex items-center justify-between mb-6">
                <span className="font-heading font-semibold">Coach Dashboard</span>
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
              <div className="space-y-4">
                {[
                  { name: "L. Müller", status: "Check-in abgeschlossen", progress: 87 },
                  { name: "T. Schmidt", status: "Visualisierung läuft", progress: 64 },
                  { name: "M. Weber", status: "Fragebogen ausstehend", progress: 42 },
                ].map((athlete) => (
                  <div key={athlete.name} className="flex items-center gap-4 p-4 rounded-xl bg-background/50">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-heading font-bold text-primary text-sm">
                      {athlete.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{athlete.name}</span>
                        <span className="text-xs text-muted-foreground">{athlete.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${athlete.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground mt-1 block">{athlete.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2"
          >
            <span className="text-sm font-medium text-primary tracking-widest uppercase mb-4 block">
              Für Coaches
            </span>
            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6">
              Dein Team.
              <br />
              <span className="text-gradient">Dein Überblick.</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-10">
              Als Coach siehst du jede Aktivität deiner Sportler. 
              Verfolge Fortschritte, erkenne Muster und unterstütze gezielt – 
              alles in einem Dashboard.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {features.map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <f.icon className="w-4 h-4 text-primary mt-1 shrink-0" />
                  <div>
                    <span className="text-sm font-medium block">{f.title}</span>
                    <span className="text-xs text-muted-foreground">{f.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CoachSection;
