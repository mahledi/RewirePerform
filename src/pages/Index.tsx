import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppLoadingShell from "@/components/AppLoadingShell";
import { pendingPostSignupIntent } from "@/lib/postSignupOnboarding";
import WebsiteGoldenPagePreview from "@/pages/WebsiteGoldenPagePreview";

const Index = () => {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user && Capacitor.isNativePlatform()) {
      navigate("/start", { replace: true });
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

  return <WebsiteGoldenPagePreview />;
};

export default Index;
