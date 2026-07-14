import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  detachNativeRemindersFromInactiveUser,
  isNativeNotificationsAvailable,
  listenForNativeReminderActions,
} from "@/lib/nativeNotifications";
import { refreshEnabledNativeReminders } from "@/lib/nativeReminderPlan";

const SAFE_NOTIFICATION_ROUTES = new Set([
  "/dashboard",
  "/journal",
  "/pre-training",
]);

export const NativeNotificationRouter = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativeNotificationsAvailable()) return;
    let disposed = false;
    let handle: Awaited<ReturnType<typeof listenForNativeReminderActions>> = null;

    void listenForNativeReminderActions((action) => {
      if (action.actionId === "dismiss") return;
      const extra = action.notification.extra as Record<string, unknown> | undefined;
      const route = typeof extra?.route === "string" ? extra.route : null;
      const reminderUserId =
        typeof extra?.userId === "string" ? extra.userId : null;
      if (!route || !SAFE_NOTIFICATION_ROUTES.has(route)) return;
      if (reminderUserId && user && reminderUserId !== user.id) {
        toast.error("Diese Erinnerung gehört zu einem anderen Account.");
        return;
      }
      navigate(route);
    }).then((listenerHandle) => {
      if (disposed) void listenerHandle?.remove();
      else handle = listenerHandle;
    });

    return () => {
      disposed = true;
      void handle?.remove();
    };
  }, [navigate, user]);

  useEffect(() => {
    if (loading || !isNativeNotificationsAvailable()) return;
    let disposed = false;
    let syncing = false;
    let lastSyncAt = 0;

    const sync = async (force = false) => {
      if (disposed || syncing) return;
      if (!force && Date.now() - lastSyncAt < 5 * 60_000) return;
      syncing = true;
      try {
        await detachNativeRemindersFromInactiveUser(user?.id ?? null);
        if (user) await refreshEnabledNativeReminders(user.id);
        lastSyncAt = Date.now();
      } catch (error) {
        console.warn("[native] reminder sync failed", error);
      } finally {
        syncing = false;
      }
    };

    void sync(true);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void sync();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loading, user]);

  return null;
};
