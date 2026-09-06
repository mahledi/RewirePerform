import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, ChevronRight } from "lucide-react";
import { dashboardScienceBites } from "@/content/dashboardScienceBites";

const ScienceBite = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Pick a random bite on mount based on the day
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    setIndex(dayOfYear % dashboardScienceBites.length);
  }, []);

  const nextBite = () => {
    setIndex((prev) => (prev + 1) % dashboardScienceBites.length);
  };

  const bite = dashboardScienceBites[index];

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
