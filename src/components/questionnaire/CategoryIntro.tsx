import { motion } from "framer-motion";
import { categories } from "@/data/questionnaireData";

interface CategoryIntroProps {
  categoryId: string;
  onContinue: () => void;
}

const CategoryIntro = ({ categoryId, onContinue }: CategoryIntroProps) => {
  const category = categories.find((c) => c.id === categoryId);
  if (!category) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-[60vh] flex items-center justify-center"
    >
      <div className="max-w-lg text-center">
        <span className="text-5xl mb-6 block">{category.icon}</span>
        <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
          {category.title}
        </h2>
        <p className="text-muted-foreground text-lg mb-4">
          {category.description}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-10 max-w-md mx-auto">
          {category.intro}
        </p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onContinue}
          className="px-8 py-4 rounded-xl bg-primary font-heading font-semibold text-primary-foreground hover:shadow-glow transition-all"
        >
          Weiter
        </motion.button>
      </div>
    </motion.div>
  );
};

export default CategoryIntro;
