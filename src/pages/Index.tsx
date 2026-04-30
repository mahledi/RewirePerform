import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ProcessSection from "@/components/ProcessSection";
import ScienceSection from "@/components/ScienceSection";
import BrainSection from "@/components/BrainSection";
import DailySection from "@/components/DailySection";
import CoachSection from "@/components/CoachSection";
import CTASection from "@/components/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <div id="process">
        <ProcessSection />
      </div>
      <div id="science">
        <ScienceSection />
      </div>
      <div id="brain">
        <BrainSection />
      </div>
      <DailySection />
      <div id="coaches">
        <CoachSection />
      </div>
      <CTASection />
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          © 2026 RewirePerform. Alle Rechte vorbehalten.
        </div>
      </footer>
    </div>
  );
};

export default Index;
