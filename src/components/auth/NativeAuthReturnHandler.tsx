import { useEffect, useRef } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  nativeSignupContinuationRoute,
  parseNativeSignupReturn,
  type NativeSignupReturn,
} from "@/lib/nativeAuthReturn";

const safeErrorCode = (code: string) =>
  code === "otp_expired" || code === "access_denied" ? code : "invalid_callback";

const callbackIdentity = (
  value: Extract<NativeSignupReturn, { kind: "session" | "code" }>,
) => value.kind === "session" ? value.refreshToken : value.authCode;

const NativeAuthReturnHandler = () => {
  const navigate = useNavigate();
  const handledCallbacks = useRef(new Set<string>());

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let disposed = false;
    let listener: PluginListenerHandle | null = null;

    const handleUrl = async (rawUrl: string) => {
      const parsed = parseNativeSignupReturn(rawUrl);
      if (disposed || parsed.kind === "ignore") return;
      if (parsed.kind === "error") {
        navigate(`/auth?flow=signup&error_code=${encodeURIComponent(safeErrorCode(parsed.errorCode))}`, {
          replace: true,
        });
        return;
      }

      const identity = callbackIdentity(parsed);
      if (handledCallbacks.current.has(identity)) return;
      handledCallbacks.current.add(identity);

      let result: Awaited<ReturnType<typeof supabase.auth.setSession>>;
      try {
        result = parsed.kind === "session"
          ? await supabase.auth.setSession({
              access_token: parsed.accessToken,
              refresh_token: parsed.refreshToken,
            })
          : await supabase.auth.exchangeCodeForSession(parsed.authCode);
      } catch {
        handledCallbacks.current.delete(identity);
        if (!disposed) {
          navigate("/auth?flow=signup&error_code=invalid_callback", { replace: true });
        }
        return;
      }

      if (disposed) return;
      if (result.error || !result.data.session) {
        handledCallbacks.current.delete(identity);
        navigate("/auth?flow=signup&error_code=invalid_callback", { replace: true });
        return;
      }

      navigate(nativeSignupContinuationRoute(parsed), { replace: true });
    };

    void CapacitorApp.addListener("appUrlOpen", ({ url }) => {
      void handleUrl(url);
    }).then((handle) => {
      if (disposed) void handle.remove();
      else listener = handle;
    }).catch(() => undefined);

    void CapacitorApp.getLaunchUrl().then((launch) => {
      if (launch?.url) void handleUrl(launch.url);
    }).catch(() => undefined);

    return () => {
      disposed = true;
      if (listener) void listener.remove();
    };
  }, [navigate]);

  return null;
};

export default NativeAuthReturnHandler;
