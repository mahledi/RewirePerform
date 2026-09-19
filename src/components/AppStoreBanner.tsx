import { Capacitor } from "@capacitor/core";
import { ArrowUpRight } from "lucide-react";
import { APP_STORE_PRODUCT_URL } from "@/lib/appStore";

const AppStoreBanner = () => {
  if (Capacitor.isNativePlatform()) return null;

  return (
    <aside
      aria-label="RewirePerform im App Store"
      className="border-b border-primary/20 bg-primary/[0.07]"
    >
      <div className="container mx-auto flex min-h-11 items-center gap-3 px-4 py-2 sm:px-6">
        <img
          src="/app-icon-192.png"
          alt=""
          className="h-7 w-7 shrink-0 rounded-[7px]"
        />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-xs font-semibold text-foreground sm:text-sm">
            RewirePerform für iPhone
          </p>
          <p className="truncate text-[10px] text-muted-foreground sm:text-xs">
            Jetzt im App Store verfügbar
          </p>
        </div>
        <a
          href={APP_STORE_PRODUCT_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Im App Store
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </aside>
  );
};

export default AppStoreBanner;
