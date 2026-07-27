import type { ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { hasCompletedPublicOnboarding } from "@/lib/publicOnboarding";

const PublicOnboardingGate = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();

  if (
    Capacitor.isNativePlatform()
    && !loading
    && !user
    && !hasCompletedPublicOnboarding()
  ) {
    return <Navigate to="/welcome" replace />;
  }

  return <>{children}</>;
};

export default PublicOnboardingGate;
