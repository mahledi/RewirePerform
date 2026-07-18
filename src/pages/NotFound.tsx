import { Link } from "react-router-dom";
import { BrandLockup } from "@/components/brand/BrandLogo";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <BrandLockup className="mb-8" symbolSize={32} textClassName="text-lg" />
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Seite nicht gefunden</p>
        <Link to="/" className="text-primary underline hover:text-primary/90">
          Zur Startseite
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
