import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import WhySection from "@/components/WhySection";
import ProcessSection from "@/components/ProcessSection";
import BrainSection from "@/components/BrainSection";
import MechanismSection from "@/components/MechanismSection";
import SpeakingSection from "@/components/SpeakingSection";
import CoachSection from "@/components/CoachSection";
import EvidenceSection from "@/components/EvidenceSection";
import CTASection from "@/components/CTASection";
import { useAuth } from "@/contexts/AuthContext";
import AppLoadingShell from "@/components/AppLoadingShell";

const Index = () => {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user && Capacitor.isNativePlatform()) {
      navigate("/auth", { replace: true });
      return;
    }
    if (!user || !role) return;
    if (role === "admin") navigate("/admin", { replace: true });
    else if (role === "coach") navigate("/coach", { replace: true });
    else navigate("/dashboard", { replace: true });
  }, [loading, navigate, role, user]);

  if (loading || (user && role) || (!user && Capacitor.isNativePlatform())) {
    return <AppLoadingShell subtitle="Öffne deinen Bereich..." />;
  }

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
      <div id="speaking" className="scroll-mt-20">
        <SpeakingSection />
      </div>
      <div id="coaches">
        <CoachSection />
      </div>
      <div id="evidence">
        <EvidenceSection />
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
