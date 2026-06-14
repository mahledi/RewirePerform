import { useEffect, useState } from "react";

type ApplyUpdate = () => void;

const UpdateAvailableToast = () => {
  const [applyUpdate, setApplyUpdate] = useState<ApplyUpdate | null>(null);

  useEffect(() => {
    const onUpdateAvailable = (event: WindowEventMap["rewireperform:update-available"]) => {
      setApplyUpdate(() => event.detail.applyUpdate);
    };

    window.addEventListener("rewireperform:update-available", onUpdateAvailable);
    return () => {
      window.removeEventListener("rewireperform:update-available", onUpdateAvailable);
    };
  }, []);

  if (!applyUpdate) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[80] max-w-[calc(100vw-2rem)] rounded-xl border border-primary/25 bg-card px-3 py-3 shadow-card premium-hairline">
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">Update verfügbar</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Neue Version laden.</p>
        </div>
        <button
          type="button"
          onClick={applyUpdate}
          className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Aktualisieren
        </button>
      </div>
    </div>
  );
};

export default UpdateAvailableToast;
