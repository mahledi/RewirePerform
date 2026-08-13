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
import {
  beginPostSignupOnboarding,
  completePostSignupOnboarding,
  queuePostAuthorizationTeamJoin,
} from "@/lib/postSignupOnboarding";
import { parseTeamInviteUrl, teamInviteAuthRoute } from "@/lib/teamInvite";
import { parseOrganizationInviteUrl } from "@/lib/organizationInvite";

const safeErrorCode = (code: string) =>
  code === "otp_expired" || code === "access_denied" ? code : "invalid_callback";

const callbackIdentity = (
  value: Extract<NativeSignupReturn, { kind: "session" | "code" }>,
) => value.kind === "session" ? value.refreshToken : value.authCode;

const NativeAuthReturnHandler = () => {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  const handledCallbacks = useRef(new Set<string>());

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let disposed = false;
    let listener: PluginListenerHandle | null = null;

    const handleUrl = async (rawUrl: string) => {
      if (disposed) return;
      const coachInvite = parseOrganizationInviteUrl(rawUrl);
      if (coachInvite.kind === "invite") {
        navigateRef.current(coachInvite.route, { replace: true });
        return;
      }
      if (coachInvite.kind === "invalid") {
        navigateRef.current("/organization/invite", { replace: true });
        return;
      }
      const invite = parseTeamInviteUrl(rawUrl);
      if (invite.kind === "invite") {
        navigateRef.current(teamInviteAuthRoute(invite.teamCode), { replace: true });
        return;
      }
      if (invite.kind === "invalid") {
        navigateRef.current("/auth?mode=signup&intent=join&invite_error=invalid", { replace: true });
        return;
      }

      const parsed = parseNativeSignupReturn(rawUrl);
      if (parsed.kind === "ignore") return;
      if (parsed.kind === "error") {
        navigateRef.current(`/auth?flow=signup&error_code=${encodeURIComponent(safeErrorCode(parsed.errorCode))}`, {
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
          navigateRef.current("/auth?flow=signup&error_code=invalid_callback", { replace: true });
        }
        return;
      }

      if (disposed) return;
      if (result.error || !result.data.session) {
        handledCallbacks.current.delete(identity);
        navigateRef.current("/auth?flow=signup&error_code=invalid_callback", { replace: true });
        return;
      }

      const userId = result.data.session.user.id;
      if (parsed.intent !== "organization") {
        if (parsed.intro === "athlete") completePostSignupOnboarding(userId, parsed.intent);
        else beginPostSignupOnboarding(userId, parsed.intent);
      }
      if (
        parsed.intent === "join"
        && parsed.teamCode
        && !queuePostAuthorizationTeamJoin(userId, parsed.teamCode, parsed.intro !== "athlete")
      ) {
        navigateRef.current("/auth?mode=signup&intent=join&invite_error=invalid", { replace: true });
        return;
      }
      navigateRef.current(nativeSignupContinuationRoute(parsed), { replace: true });
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
  }, []);

  return null;
};

export default NativeAuthReturnHandler;
