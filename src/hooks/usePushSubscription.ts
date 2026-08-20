import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_NATIVE_REMINDER_PREFERENCES,
  disableNativeReminders,
  getNativeReminderPreferences,
  hasNativeNotificationPermission,
  requestNativeNotificationPermission,
} from "@/lib/nativeNotifications";
import { syncNativeRemindersForUser } from "@/lib/nativeReminderPlan";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

const arrayBufferToBase64Url = (buf: ArrayBuffer | null) => {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const getBrowserTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export interface ReminderTimes {
  morningHour: number;
  morningMinute: number;
  eveningHour: number;
  eveningMinute: number;
  preTrainingMinutes: number;
}

type PushSupport =
  | { supported: true; reason: null; mode: "native" | "web" }
  | {
      supported: false;
      reason: "preview_host" | "insecure" | "browser";
      mode: null;
    };

export const isPushSupported = () =>
  getPushSupport().supported;

export const getPushSupport = (): PushSupport => {
  if (typeof window === "undefined") {
    return { supported: false, reason: "browser", mode: null };
  }

  if (Capacitor.isNativePlatform()) {
    return { supported: true, reason: null, mode: "native" };
  }

  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host.includes("lovable.app");
  if (isPreviewHost) {
    return { supported: false, reason: "preview_host", mode: null };
  }

  const isLocal = host === "localhost" || host === "127.0.0.1";
  if (!window.isSecureContext && !isLocal) {
    return { supported: false, reason: "insecure", mode: null };
  }

  const supported =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;
  return supported
    ? { supported: true, reason: null, mode: "web" }
    : { supported: false, reason: "browser", mode: null };
};

export const usePushSubscription = () => {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [morningHour, setMorningHour] = useState(7);
  const [morningMinute, setMorningMinute] = useState(30);
  const [eveningHour, setEveningHour] = useState(21);
  const [eveningMinute, setEveningMinute] = useState(0);
  const [preTrainingMinutes, setPreTrainingMinutes] = useState(60);
  const support = getPushSupport();
  const applyReminderTimes = useCallback((times: ReminderTimes) => {
    setMorningHour(times.morningHour);
    setMorningMinute(times.morningMinute);
    setEveningHour(times.eveningHour);
    setEveningMinute(times.eveningMinute);
    setPreTrainingMinutes(times.preTrainingMinutes);
  }, []);

  const refresh = useCallback(async () => {
    if (!user || !support.supported) {
      setLoading(false);
      return;
    }
    try {
      if (support.mode === "native") {
        const preferences =
          getNativeReminderPreferences(user.id) ??
          DEFAULT_NATIVE_REMINDER_PREFERENCES;
        applyReminderTimes(preferences);
        const permissionGranted = await hasNativeNotificationPermission();
        setEnabled(preferences.enabled && permissionGranted);
        return;
      }

      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const { data } = await supabase
          .from("push_subscriptions")
          .select("morning_hour,morning_minute,evening_hour,evening_minute,pre_training_minutes")
          .eq("endpoint", sub.endpoint)
          .maybeSingle();
        setEnabled(!!data);
        if (data) {
          setMorningHour(data.morning_hour);
          setMorningMinute(data.morning_minute);
          setEveningHour(data.evening_hour);
          setEveningMinute(data.evening_minute);
          setPreTrainingMinutes(data.pre_training_minutes ?? 60);
        }
      } else {
        setEnabled(false);
      }
    } finally {
      setLoading(false);
    }
  }, [user, support.supported, support.mode, applyReminderTimes]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(async (times?: ReminderTimes) => {
    if (!user || !support.supported) throw new Error("Push nicht unterstützt");

    const nextTimes: ReminderTimes = {
      morningHour: times?.morningHour ?? morningHour,
      morningMinute: times?.morningMinute ?? morningMinute,
      eveningHour: times?.eveningHour ?? eveningHour,
      eveningMinute: times?.eveningMinute ?? eveningMinute,
      preTrainingMinutes: times?.preTrainingMinutes ?? preTrainingMinutes,
    };

    if (support.mode === "native") {
      if (!(await requestNativeNotificationPermission())) {
        throw new Error("Benachrichtigungen wurden auf diesem Gerät nicht erlaubt");
      }
      await syncNativeRemindersForUser(user.id, nextTimes);
      applyReminderTimes(nextTimes);
      setEnabled(true);
      return;
    }

    const perm = await Notification.requestPermission();
    if (perm !== "granted") throw new Error("Berechtigung abgelehnt");

    const reg =
      (await navigator.serviceWorker.getRegistration("/sw.js")) ??
      (await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }));
    await navigator.serviceWorker.ready;

    const { data: keyData, error: keyErr } = await supabase.functions.invoke(
      "get-vapid-public-key",
    );
    if (keyErr || !keyData?.publicKey) throw new Error("VAPID-Key fehlt");

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });
    }

    const p256dh = arrayBufferToBase64Url(sub.getKey("p256dh"));
    const auth = arrayBufferToBase64Url(sub.getKey("auth"));

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
        morning_hour: nextTimes.morningHour,
        morning_minute: nextTimes.morningMinute,
        evening_hour: nextTimes.eveningHour,
        evening_minute: nextTimes.eveningMinute,
        pre_training_minutes: nextTimes.preTrainingMinutes,
        timezone: getBrowserTimeZone(),
      },
      { onConflict: "endpoint" },
    );
    if (error) throw error;
    applyReminderTimes(nextTimes);
    setEnabled(true);
  }, [user, support.supported, support.mode, morningHour, morningMinute, eveningHour, eveningMinute, preTrainingMinutes, applyReminderTimes]);

  const unsubscribe = useCallback(async () => {
    if (!support.supported) return;
    if (support.mode === "native") {
      if (user) await disableNativeReminders(user.id);
      setEnabled(false);
      return;
    }
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
    setEnabled(false);
  }, [support.supported, support.mode, user]);

  const saveTimes = useCallback(
    async (mh: number, mm: number, eh: number, em: number, preMinutes: number) => {
      if (!user) return;
      const nextTimes: ReminderTimes = {
        morningHour: mh,
        morningMinute: mm,
        eveningHour: eh,
        eveningMinute: em,
        preTrainingMinutes: preMinutes,
      };
      if (support.mode === "native") {
        await syncNativeRemindersForUser(user.id, nextTimes);
        applyReminderTimes(nextTimes);
        setEnabled(true);
        return;
      }
      setMorningHour(mh);
      setMorningMinute(mm);
      setEveningHour(eh);
      setEveningMinute(em);
      setPreTrainingMinutes(preMinutes);
      const { error } = await supabase
        .from("push_subscriptions")
        .update({
          morning_hour: mh,
          morning_minute: mm,
          evening_hour: eh,
          evening_minute: em,
          pre_training_minutes: preMinutes,
          timezone: getBrowserTimeZone(),
        })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    [user, support.mode, applyReminderTimes],
  );

  const resync = useCallback(async () => {
    if (!user || support.mode !== "native" || !enabled) return;
    await syncNativeRemindersForUser(user.id, {
      morningHour,
      morningMinute,
      eveningHour,
      eveningMinute,
      preTrainingMinutes,
    });
  }, [user, support.mode, enabled, morningHour, morningMinute, eveningHour, eveningMinute, preTrainingMinutes]);

  return {
    enabled,
    loading,
    supported: support.supported,
    morningHour,
    morningMinute,
    eveningHour,
    eveningMinute,
    preTrainingMinutes,
    subscribe,
    unsubscribe,
    saveTimes,
    resync,
    mode: support.mode,
    supportReason: support.reason,
  };
};
