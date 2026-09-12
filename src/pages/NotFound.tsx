import { Link } from "react-router-dom";
import { BrandLockup } from "@/components/brand/BrandLogo";
import { usePublicLanguage } from "@/contexts/PublicLanguageContext";
import { PublicLanguageSwitch } from "@/components/public/PublicLanguageSwitch";

const NotFound = () => {
  const { tr } = usePublicLanguage();
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <PublicLanguageSwitch className="absolute right-4 top-4 z-20" />
      <div className="text-center">
        <BrandLockup className="mb-8" symbolSize={32} textClassName="text-lg" />
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">{tr("Seite nicht gefunden", "Page not found")}</p>
        <Link to="/" className="text-primary underline hover:text-primary/90">
          {tr("Zur Startseite", "Go to homepage")}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
