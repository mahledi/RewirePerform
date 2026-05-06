import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import WhySection from "@/components/WhySection";
import ProcessSection from "@/components/ProcessSection";
import BrainSection from "@/components/BrainSection";
import MechanismSection from "@/components/MechanismSection";
import PlayersSection from "@/components/PlayersSection";
import CoachSection from "@/components/CoachSection";
import EvidenceSection from "@/components/EvidenceSection";
import PrivacySection from "@/components/PrivacySection";
import CTASection from "@/components/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <div id="why">
        <WhySection />
      </div>
      <div id="process">
        <ProcessSection />
      </div>
      <div id="science">
        <BrainSection />
      </div>
      <div id="mechanisms">
        <MechanismSection />
      </div>
      <div id="players">
        <PlayersSection />
      </div>
      <div id="coaches">
        <CoachSection />
      </div>
      <div id="evidence">
        <EvidenceSection />
      </div>
      <div id="privacy">
        <PrivacySection />
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
