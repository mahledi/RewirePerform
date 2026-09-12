import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { getNativeReminderPreferences } from "@/lib/nativeNotifications";

const REGISTRATION_TIMEOUT_MS = 15_000;

export const isNativeRemotePushAvailable = () =>
  Capacitor.isNativePlatform() && ["ios", "android"].includes(Capacitor.getPlatform());

/** Registers an APNs or FCM token only after the existing explicit reminder opt-in. */
export const syncNativeRemotePushRegistration = async (userId: string) => {
  if (!isNativeRemotePushAvailable()) return { registered: false as const, reason: "not_native" };
  if (!getNativeReminderPreferences(userId)?.enabled) {
    return { registered: false as const, reason: "not_opted_in" };
  }

  const permission = await PushNotifications.checkPermissions();
  if (permission.receive !== "granted") {
    return { registered: false as const, reason: "permission_not_granted" };
  }

  let registrationHandle: PluginListenerHandle | undefined;
  let errorHandle: PluginListenerHandle | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    await new Promise<void>((resolve, reject) => {
      const finish = (callback: () => void) => {
        if (timeout) clearTimeout(timeout);
        callback();
      };

      void (async () => {
        try {
          registrationHandle = await PushNotifications.addListener("registration", async ({ value }) => {
            try {
              const platform = Capacitor.getPlatform();
              if (platform !== "ios" && platform !== "android") {
                throw new Error("Unsupported native push platform");
              }
              const { error } = await supabase.from("native_push_devices").upsert(
                { user_id: userId, platform, device_token: value },
                { onConflict: "device_token" },
              );
              if (error) throw error;
              finish(resolve);
            } catch (error) {
              finish(() => reject(error));
            }
          });
          errorHandle = await PushNotifications.addListener("registrationError", ({ error }) => {
            finish(() => reject(new Error(error)));
          });
          timeout = setTimeout(
            () => finish(() => reject(new Error("Native push registration timed out"))),
            REGISTRATION_TIMEOUT_MS,
          );
          await PushNotifications.register();
        } catch (error) {
          finish(() => reject(error));
        }
      })();
    });
  } finally {
    await registrationHandle?.remove();
    await errorHandle?.remove();
  }

  return { registered: true as const, reason: null };
};

export const unregisterNativeRemotePush = async (userId: string) => {
  if (!isNativeRemotePushAvailable()) return;
  const platform = Capacitor.getPlatform();
  const { error } = await supabase
    .from("native_push_devices")
    .delete()
    .eq("user_id", userId)
    .eq("platform", platform);
  if (error) throw error;
  await PushNotifications.unregister();
};
