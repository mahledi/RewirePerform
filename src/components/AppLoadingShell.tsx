import { BrandSymbol } from "@/components/brand/BrandLogo";

type AppLoadingShellProps = {
  title?: string;
  subtitle?: string;
  variant?: "app" | "dashboard" | "coach";
};

const AppLoadingShell = ({
  title = "RewirePerform",
  subtitle = "Bereite deinen Bereich vor...",
  variant = "app",
}: AppLoadingShellProps) => {
  const showDashboardSkeleton = variant === "dashboard" || variant === "coach";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-40 border-b border-border/50 bg-background/86 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-card">
            <BrandSymbol size={28} />
          </div>
          <div className="min-w-0">
            <p className="font-heading text-sm font-semibold leading-none">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-5xl px-5 py-6">
        {showDashboardSkeleton ? (
          <div className="space-y-4">
            <div className="h-24 rounded-2xl border border-border/50 bg-card/70 shadow-card">
              <div className="h-full animate-pulse rounded-2xl bg-gradient-to-r from-transparent via-primary/5 to-transparent" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="h-28 rounded-2xl border border-border/50 bg-card/70" />
              <div className="h-28 rounded-2xl border border-border/50 bg-card/70" />
            </div>
            <div className="h-40 rounded-2xl border border-border/50 bg-card/70" />
          </div>
        ) : (
          <div className="flex min-h-[45vh] items-center justify-center">
            <div className="h-9 w-9 rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
          </div>
        )}
      </main>
    </div>
  );
};

export default AppLoadingShell;
