import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Link, useNavigate } from "react-router-dom";
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
import { BrandLockup } from "@/components/brand/BrandLogo";
import { pendingPostSignupIntent } from "@/lib/postSignupOnboarding";

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
    else if (pendingPostSignupIntent(user.id)) navigate("/questionnaire", { replace: true });
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
        <div className="container mx-auto flex flex-col items-center gap-4 px-6 text-center text-sm text-muted-foreground">
          <BrandLockup symbolSize={28} textClassName="text-base text-foreground" />
          <span>© 2026 RewirePerform. Alle Rechte vorbehalten.</span>
          <nav aria-label="Rechtliches" className="flex flex-wrap justify-center gap-4 text-xs">
            <Link to="/privacy" className="hover:text-foreground">Datenschutz</Link>
            <Link to="/imprint" className="hover:text-foreground">Impressum</Link>
            <Link to="/support" className="hover:text-foreground">Support</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default Index;
