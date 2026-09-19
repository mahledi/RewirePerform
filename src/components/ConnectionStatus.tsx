import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

const getInitialOnlineState = () =>
  typeof navigator === "undefined" ? true : navigator.onLine;

const ConnectionStatus = () => {
  const [online, setOnline] = useState(getInitialOnlineState);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setShowBackOnline(true);
      window.setTimeout(() => setShowBackOnline(false), 2200);
    };
    const handleOffline = () => {
      setOnline(false);
      setShowBackOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online && !showBackOnline) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center px-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={`flex max-w-md items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium shadow-card backdrop-blur-xl ${
          online
            ? "border-primary/30 bg-primary/15 text-foreground"
            : "border-amber-500/30 bg-amber-500/15 text-foreground"
        }`}
      >
        <WifiOff aria-hidden="true" className="h-3.5 w-3.5" />
        <span>
          {online
            ? "Verbindung wiederhergestellt."
            : "Offline. Deine Eingaben bleiben auf diesem Gerät gesichert."}
        </span>
      </div>
    </div>
  );
};

export default ConnectionStatus;
