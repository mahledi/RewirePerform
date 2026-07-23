import { RefreshCw } from "lucide-react";
import StartupBrandMark from "@/components/StartupBrandMark";
import { Button } from "@/components/ui/button";

type AccessStatusScreenProps = {
  checking?: boolean;
  message: string;
  onRetry?: () => void;
  title: string;
};

const AccessStatusScreen = ({
  checking = false,
  message,
  onRetry,
  title,
}: AccessStatusScreenProps) => (
  <main
    data-app-loading-shell={checking ? "true" : undefined}
    className="fixed inset-0 z-[100] min-h-[100dvh] overflow-y-auto bg-[#0D0E12] px-6 text-white"
    aria-busy={checking}
  >
    <StartupBrandMark />

    {checking ? (
      <p className="sr-only" role="status">
        {title}. {message}
      </p>
    ) : (
      <section
        className="absolute inset-x-0 top-[calc(50%+7rem)] mx-auto min-h-44 w-full max-w-sm px-6 text-center [@media(max-height:640px)]:top-[calc(36%+7rem)]"
        aria-live="polite"
      >
        <h1 className="font-heading text-xl font-semibold leading-7">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-white/65">{message}</p>
        {onRetry ? (
          <Button type="button" className="mt-5 min-w-40" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Erneut prüfen
          </Button>
        ) : null}
      </section>
    )}
  </main>
);

export default AccessStatusScreen;
