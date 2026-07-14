import { CheckCircle2 } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const AccountDeleted = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const confirmed = (location.state as { accountDeleted?: boolean } | null)?.accountDeleted === true;

  if (!confirmed) return <Navigate to="/" replace />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="font-heading text-2xl font-bold">Dein Account wurde gelöscht.</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Dein Zugang und deine personenbezogenen Daten wurden aus dem aktiven System entfernt. Technische Sicherungskopien
          werden innerhalb ihrer Aufbewahrungsfrist von höchstens 30 Tagen automatisch überschrieben.
        </p>
        <Button className="mt-7 w-full" onClick={() => navigate("/", { replace: true })}>
          Zur Startseite
        </Button>
      </div>
    </main>
  );
};

export default AccountDeleted;
