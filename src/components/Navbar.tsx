import { Brain } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary" />
          <span className="font-heading font-bold text-lg">MindGame</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#process" className="hover:text-foreground transition-colors">Prozess</a>
          <a href="#science" className="hover:text-foreground transition-colors">Wissenschaft</a>
          <a href="#coaches" className="hover:text-foreground transition-colors">Für Coaches</a>
        </div>
        <button className="px-5 py-2 rounded-lg bg-primary font-heading font-medium text-sm text-primary-foreground hover:shadow-glow transition-all">
          Zugang
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
