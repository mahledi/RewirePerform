import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, ChevronRight } from "lucide-react";

interface Bite {
  fact: string;
  source: string;
  year: number;
}

const scienceBites: Bite[] = [
  {
    fact: "Mentales Training aktiviert bis zu 80% derselben neuronalen Netzwerke wie die tatsächliche Bewegungsausführung.",
    source: "Jeannerod, M. – Neural Simulation of Action",
    year: 2001,
  },
  {
    fact: "Athleten mit einer regelmäßigen Visualisierungspraxis zeigen eine 13,5% höhere Leistungssteigerung als Kontrollgruppen.",
    source: "Feltz & Landers – Meta-Analyse, Psychological Bulletin",
    year: 1983,
  },
  {
    fact: "Selbstgespräche (Self-Talk) verbessern die sportliche Leistung signifikant – besonders bei Präzisions- und Ausdaueraufgaben.",
    source: "Hatzigeorgiadis et al. – Perspectives on Psychological Science",
    year: 2011,
  },
  {
    fact: "Achtsamkeitsbasierte Interventionen reduzieren die Wettkampfangst bei Athleten um durchschnittlich 25%.",
    source: "Sappington & Longshore – Journal of Clinical Sport Psychology",
    year: 2015,
  },
  {
    fact: "Ein Growth Mindset führt zu 34% mehr Durchhaltevermögen nach Misserfolgen im sportlichen Kontext.",
    source: "Dweck, C. – Mindset: The New Psychology of Success",
    year: 2006,
  },
  {
    fact: "Zielsetzung nach dem SMART-Prinzip steigert die Trainingsmotivation um bis zu 40% gegenüber vagen Zielen.",
    source: "Locke & Latham – American Psychologist",
    year: 2002,
  },
  {
    fact: "Schon 10 Minuten mentales Training pro Tag verbessern die Konzentrationsfähigkeit unter Druck nachweislich.",
    source: "Vealey & Greenleaf – Applied Sport Psychology",
    year: 2010,
  },
  {
    fact: "Die Pre-Performance-Routine reduziert Variabilität in der Leistung und erhöht die Konsistenz um bis zu 20%.",
    source: "Cotterill, S. – Journal of Sport Psychology in Action",
    year: 2010,
  },
  {
    fact: "Emotionsregulation ist der stärkste Prädiktor für Clutch-Performance – wichtiger als technisches Können.",
    source: "Schweizer & Furley – Psychology of Sport and Exercise",
    year: 2016,
  },
  {
    fact: "Teamkohäsion korreliert mit einer 18% höheren Leistung in Mannschaftssportarten.",
    source: "Carron et al. – Journal of Sport & Exercise Psychology",
    year: 2002,
  },
  {
    fact: "Schlafqualität beeinflusst die Reaktionszeit stärker als 24 Stunden ohne Schlaf – ein oft unterschätzter Leistungsfaktor.",
    source: "Mah et al. – Sleep",
    year: 2011,
  },
  {
    fact: "Sportler, die regelmäßig reflektieren, entwickeln 2x schneller Expertise als solche ohne strukturierte Reflexion.",
    source: "Ericsson et al. – Psychological Review",
    year: 1993,
  },
];

const ScienceBite = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Pick a random bite on mount based on the day
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    setIndex(dayOfYear % scienceBites.length);
  }, []);

  const nextBite = () => {
    setIndex((prev) => (prev + 1) % scienceBites.length);
  };

  const bite = scienceBites[index];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 p-5 rounded-2xl bg-gradient-card border-glow relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      
      <div className="flex items-start gap-3 relative">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Lightbulb className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-heading font-medium text-primary tracking-widest uppercase mb-2">
            Science Bite
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-sm text-foreground leading-relaxed mb-2">
                {bite.fact}
              </p>
              <p className="text-[11px] text-muted-foreground italic">
                — {bite.source} ({bite.year})
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
        <button
          onClick={nextBite}
          className="p-2 rounded-lg hover:bg-secondary transition-colors shrink-0"
          title="Nächster Fakt"
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </motion.div>
  );
};

export default ScienceBite;
