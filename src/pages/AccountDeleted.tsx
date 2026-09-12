import { CheckCircle2 } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/brand/BrandLogo";
import { usePublicLanguage } from "@/contexts/PublicLanguageContext";
import { PublicLanguageSwitch } from "@/components/public/PublicLanguageSwitch";

const AccountDeleted = () => {
  const { tr } = usePublicLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const confirmed = (location.state as { accountDeleted?: boolean } | null)?.accountDeleted === true;

  if (!confirmed) return <Navigate to="/" replace />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <PublicLanguageSwitch className="absolute right-4 top-4 z-20" />
      <div className="w-full max-w-md text-center">
        <BrandLockup className="mb-8" symbolSize={32} textClassName="text-lg" />
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="font-heading text-2xl font-bold">{tr("Dein Account wurde gelöscht.", "Your account has been deleted.")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {tr("Dein Zugang und deine personenbezogenen Daten wurden aus dem aktiven System entfernt. Du kannst dich mit diesem Konto nicht mehr anmelden.", "Your access and personal data have been removed from the active system. You can no longer sign in with this account.")}
        </p>
        <Button className="mt-7 w-full" onClick={() => navigate("/", { replace: true })}>
          {tr("Zur Startseite", "Go to homepage")}
        </Button>
      </div>
    </main>
  );
};

export default AccountDeleted;
