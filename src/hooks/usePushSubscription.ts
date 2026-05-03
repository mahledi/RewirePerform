import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

export const isPushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

export const usePushSubscription = () => {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [morningHour, setMorningHour] = useState(7);
  const [morningMinute, setMorningMinute] = useState(30);
  const [eveningHour, setEveningHour] = useState(21);
  const [eveningMinute, setEveningMinute] = useState(0);

  const refresh = useCallback(async () => {
    if (!user || !isPushSupported()) {
      setLoading(false);
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const { data } = await supabase
          .from("push_subscriptions")
          .select("morning_hour,morning_minute,evening_hour,evening_minute")
          .eq("endpoint", sub.endpoint)
          .maybeSingle();
        setEnabled(!!data);
        if (data) {
          setMorningHour(data.morning_hour);
          setMorningMinute(data.morning_minute);
          setEveningHour(data.evening_hour);
          setEveningMinute(data.evening_minute);
        }
      } else {
        setEnabled(false);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    if (!user || !isPushSupported()) throw new Error("Push nicht unterstützt");

    const perm = await Notification.requestPermission();
    if (perm !== "granted") throw new Error("Berechtigung abgelehnt");

    const reg =
      (await navigator.serviceWorker.getRegistration("/sw.js")) ??
      (await navigator.serviceWorker.register("/sw.js"));
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
        morning_hour: morningHour,
        morning_minute: morningMinute,
        evening_hour: eveningHour,
        evening_minute: eveningMinute,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw error;
    setEnabled(true);
  }, [user, morningHour, morningMinute, eveningHour, eveningMinute]);

  const unsubscribe = useCallback(async () => {
    if (!isPushSupported()) return;
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
    setEnabled(false);
  }, []);

  const saveTimes = useCallback(
    async (mh: number, mm: number, eh: number, em: number) => {
      if (!user) return;
      setMorningHour(mh);
      setMorningMinute(mm);
      setEveningHour(eh);
      setEveningMinute(em);
      await supabase
        .from("push_subscriptions")
        .update({
          morning_hour: mh,
          morning_minute: mm,
          evening_hour: eh,
          evening_minute: em,
        })
        .eq("user_id", user.id);
    },
    [user],
  );

  return {
    enabled,
    loading,
    supported: isPushSupported(),
    morningHour,
    morningMinute,
    eveningHour,
    eveningMinute,
    subscribe,
    unsubscribe,
    saveTimes,
  };
};
