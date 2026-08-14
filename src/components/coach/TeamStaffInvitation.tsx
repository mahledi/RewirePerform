import { useEffect, useState } from "react";
import { Check, Copy, Link2, Loader2, MessageCircle, Share2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { buildCoachInvitationShare } from "@/lib/invitationShare";
import { formatCoachInviteCode } from "@/lib/organizationInvite";

type TeamCoachInvitationRpcClient = {
  rpc: (
    name: "create_team_coach_invitation",
    args: { _team_id: string },
  ) => Promise<{
    data: { invitation_code?: unknown; expires_at?: unknown } | null;
    error: { message?: string } | null;
  }>;
};

const TeamStaffInvitation = ({ teamId, teamName }: { teamId: string; teamName: string }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [canInvite, setCanInvite] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Draft RPC is unavailable until the reviewed migration is activated.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (supabase as any).rpc("can_administer_team", { _team_id: teamId })
      .then(({ data, error }: { data: unknown; error: unknown }) => {
        if (!cancelled) setCanInvite(!error && data === true);
      });
    return () => { cancelled = true; };
  }, [teamId]);

  const createInvite = async () => {
    if (loading) return;
    setLoading(true);
    const { data, error } = await (
      supabase as unknown as TeamCoachInvitationRpcClient
    ).rpc("create_team_coach_invitation", { _team_id: teamId });
    setLoading(false);

    const code = typeof data?.invitation_code === "string" ? data.invitation_code : "";
    if (error || !formatCoachInviteCode(code)) {
      toast.error("Die Co-Coach-Einladung konnte nicht sicher erstellt werden.");
      return;
    }
    setInviteCode(code);
    toast.success("Co-Coach-Einladung ist bereit.");
  };

  const invitation = inviteCode ? buildCoachInvitationShare(teamName, inviteCode) : null;
  const formattedCode = inviteCode ? formatCoachInviteCode(inviteCode) : null;

  const copyCode = async () => {
    if (!formattedCode) return;
    await navigator.clipboard.writeText(formattedCode);
    toast.success("Coach-Code kopiert.");
  };

  const copyInvite = async () => {
    if (!invitation) return;
    await navigator.clipboard.writeText(invitation.url);
    toast.success("Einladungslink kopiert.");
  };

  const shareInvite = async () => {
    if (!invitation) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: invitation.title,
          text: invitation.text,
          url: invitation.url,
        });
        return;
      } catch {
        return;
      }
    }
    await navigator.clipboard.writeText(invitation.message);
    toast.success("Einladungstext kopiert.");
  };

  const shareWhatsApp = () => {
    if (!invitation) return;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(invitation.message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <section className="mt-4 rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Users className="h-5 w-5" /></span>
          <div><p className="font-heading font-semibold">Coach-Team</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Weitere Coaches erhalten nur Zugriff auf dieses Team und werden ausdrücklich eingeladen.</p></div>
        </div>
        {canInvite === null ? (
          <span className="inline-flex min-h-9 items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin text-primary" />Rolle wird geprüft.</span>
        ) : canInvite ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen((current) => !current)}><UserPlus className="h-4 w-4" />Co-Coach einladen</Button>
        ) : (
          <span className="rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">Co-Coach-Zugang</span>
        )}
      </div>

      {open && (
        <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
              Erstelle einen einmaligen Coach-Code. Danach kannst du die Einladung genauso direkt über WhatsApp,
              Teilen oder als Link weitergeben wie eine Athleten-Einladung.
            </p>
            <Button type="button" onClick={() => void createInvite()} disabled={loading} className="shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {inviteCode ? "Neuen Code erstellen" : "Einladung erstellen"}
            </Button>
          </div>

          {invitation && formattedCode && (
            <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Check className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Einladung ist bereit</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Einmalig · sieben Tage gültig · nach Annahme automatisch mit diesem Team verbunden
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void copyCode()}
                className="mt-4 flex min-h-12 w-full items-center justify-between rounded-xl border border-border/70 bg-background/70 px-4 text-left"
                aria-label="Coach-Code kopieren"
              >
                <span>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Coach-Code</span>
                  <span className="mt-1 block font-mono text-base font-semibold tracking-[0.08em] text-foreground">{formattedCode}</span>
                </span>
                <Copy className="h-4 w-4 text-primary" />
              </button>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button type="button" variant="outline" className="min-h-10 border-[#25D366]/30 text-[#25D366]" onClick={shareWhatsApp}>
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
                <Button type="button" className="min-h-10" onClick={() => void shareInvite()}>
                  <Share2 className="h-4 w-4" />
                  Teilen
                </Button>
                <Button type="button" variant="outline" className="min-h-10" onClick={() => void copyInvite()}>
                  <Link2 className="h-4 w-4" />
                  Link kopieren
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default TeamStaffInvitation;
