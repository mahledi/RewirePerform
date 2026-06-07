import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { captureAppError } from "@/lib/monitoring";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export const NotificationOpenTracker = () => {
  const { user, role, isTestUser, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [accountMismatch, setAccountMismatch] = useState(false);
  const notificationParams = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      notificationId: params.get("notification_id"),
      notificationUserId: params.get("notification_user_id"),
      notificationType: params.get("notification_type"),
    };
  }, [location.search]);

  useEffect(() => {
    const { notificationId, notificationUserId } = notificationParams;
    if (!user || !notificationId) return;
    if (notificationUserId && notificationUserId !== user.id) {
      setAccountMismatch(true);
      return;
    }
    setAccountMismatch(false);

    supabase
      .from("notification_log")
      .select("metadata")
      .eq("id", notificationId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error) {
          console.warn("[push] open tracking failed:", error.message);
          void captureAppError({
            eventName: "push_clicked",
            error,
            role,
            route: location.pathname,
            isTest: isTestUser,
            metadata: { has_notification_id: true },
          });
          return;
        }
        const existingMetadata =
          data?.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
            ? data.metadata
            : {};
        const { error: updateError } = await supabase
          .from("notification_log")
          .update({
            status: "opened",
            opened_at: new Date().toISOString(),
            metadata: { ...existingMetadata, route: location.pathname },
          })
          .eq("id", notificationId)
          .eq("user_id", user.id);
        if (updateError) {
          console.warn("[push] open tracking failed:", updateError.message);
          void captureAppError({
            eventName: "push_clicked",
            error: updateError,
            role,
            route: location.pathname,
            isTest: isTestUser,
            metadata: { has_notification_id: true },
          });
        }
      });
  }, [location.pathname, notificationParams, role, isTestUser, user]);

  const handleSwitchAccount = async () => {
    const redirect = `${location.pathname}${location.search}`;
    await signOut();
    navigate(`/auth?redirect=${encodeURIComponent(redirect)}`, { replace: true });
  };

  if (!accountMismatch) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 px-4 backdrop-blur-xl">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
        </div>
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Falscher Account aktiv
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Diese Erinnerung gehört zu einem anderen Spieleraccount. Bitte melde dich mit dem richtigen Account an,
          damit du im passenden Tagesflow landest.
        </p>
        <div className="mt-5 space-y-2">
          <Button onClick={handleSwitchAccount} className="w-full">
            Zum richtigen Account wechseln
          </Button>
          <Button variant="outline" onClick={() => navigate("/dashboard", { replace: true })} className="w-full">
            In dieser Sitzung bleiben
          </Button>
        </div>
        {notificationParams.notificationType && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Erinnerung: {notificationParams.notificationType}
          </p>
        )}
      </div>
    </div>
  );
};
