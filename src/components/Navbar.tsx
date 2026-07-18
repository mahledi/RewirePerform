import { useNavigate } from "react-router-dom";
import { BrandLockup } from "@/components/brand/BrandLogo";

const Navbar = () => {
  const navigate = useNavigate();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="RewirePerform Startseite"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <BrandLockup symbolSize={34} textClassName="text-lg" />
        </button>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#process" className="hover:text-foreground transition-colors">System</a>
          <a href="#science" className="hover:text-foreground transition-colors">Wissenschaft</a>
          <a href="#mechanisms" className="hover:text-foreground transition-colors">Mechanismen</a>
          <a href="#speaking" className="hover:text-foreground transition-colors">Einsprechen</a>
          <a href="#coaches" className="hover:text-foreground transition-colors">Coaches</a>
          <a href="#evidence" className="hover:text-foreground transition-colors">Evidenz</a>
        </div>
        <button onClick={() => navigate("/auth?switch=1")} className="px-5 py-2 rounded-lg bg-primary font-heading font-medium text-sm text-primary-foreground hover:shadow-glow transition-all">
          Zugang
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
