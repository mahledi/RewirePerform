import StartupBrandMark from "@/components/StartupBrandMark";

type AppLoadingShellProps = {
  title?: string;
  subtitle?: string;
  variant?: "app" | "dashboard" | "coach";
};

const AppLoadingShell = ({
  subtitle = "RewirePerform wird geladen",
}: AppLoadingShellProps) => (
  <main
    data-app-loading-shell="true"
    className="fixed inset-0 z-[100] min-h-[100dvh] bg-[#0D0E12]"
    aria-label={subtitle}
    aria-busy="true"
  >
    <StartupBrandMark />
    <span className="sr-only">{subtitle}</span>
  </main>
);

export default AppLoadingShell;
