import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { captureAppError, trackAppEvent } from "@/lib/monitoring";

export const NotificationOpenTracker = () => {
  const { user, role, isTestUser } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const notificationId = params.get("notification_id");
    if (!user || !notificationId) return;

    supabase
      .from("notification_log")
      .update({
        status: "opened",
        opened_at: new Date().toISOString(),
        metadata: { route: location.pathname },
      })
      .eq("id", notificationId)
      .eq("user_id", user.id)
      .then(({ error }) => {
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
        void trackAppEvent({
          eventName: "push_clicked",
          status: "opened",
          role,
          route: location.pathname,
          isTest: isTestUser,
          metadata: { has_notification_id: true },
        });
      });
  }, [location.pathname, location.search, role, isTestUser, user]);

  return null;
};
