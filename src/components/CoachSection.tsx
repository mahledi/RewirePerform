import { motion } from "framer-motion";
import { Users, BarChart3, Shield, Lock } from "lucide-react";

const features = [
  { icon: Shield, title: "Privatsphäre geschützt", text: "Keine Einblicke in persönliche Antworten, Journale oder Reflexionen." },
  { icon: BarChart3, title: "Nur Überblick-Daten", text: "Anonyme Team-Statistiken wie Teilnahme und Aktivität." },
  { icon: Users, title: "Team-Management", text: "Mehrere Sportler gleichzeitig betreuen." },
  { icon: Lock, title: "Datenschutz", text: "DSGVO-konform. Private Inhalte bleiben beim Sportler." },
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
                <span className="text-xs text-muted-foreground">Team-Übersicht</span>
              </div>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-background/50 text-center">
                  <p className="text-2xl font-bold text-primary">12</p>
                  <p className="text-xs text-muted-foreground">Aktive Sportler</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-background/50 text-center">
                    <p className="text-lg font-bold text-foreground">89%</p>
                    <p className="text-xs text-muted-foreground">Teilnahmequote</p>
                  </div>
                  <div className="p-4 rounded-xl bg-background/50 text-center">
                    <p className="text-lg font-bold text-foreground">34</p>
                    <p className="text-xs text-muted-foreground">Check-ins diese Woche</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-2">
                  <Lock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Private Inhalte wie Antworten, Reflexionen und Journale sind für Coaches nicht sichtbar.
                  </p>
                </div>
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
              Als Coach siehst du, ob deine Sportler aktiv am Programm teilnehmen –
              aber niemals ihre privaten Antworten, Reflexionen oder Journale.
              Volle Privatsphäre für Sportler, klarer Überblick für dich.
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
