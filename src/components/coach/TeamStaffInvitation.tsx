import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Share2, ShieldCheck, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { buildCoachInvitationShare } from "@/lib/invitationShare";

const TeamStaffInvitation = ({ teamId }: { teamId: string }) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
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
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@") || loading) return;
    setLoading(true);
    // Draft RPC is unavailable until the reviewed migration is activated.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("create_team_staff_invitation", {
      _team_id: teamId,
      _email: normalizedEmail,
      _team_role: "co_coach",
    });
    setLoading(false);
    if (error || !data?.invitation_token) {
      toast.error("Die Co-Coach-Einladung konnte nicht sicher erstellt werden.");
      return;
    }
    setInviteUrl(`${window.location.origin}/organization/invite?token=${encodeURIComponent(String(data.invitation_token))}`);
    toast.success("Einmalige Co-Coach-Einladung vorbereitet.");
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    toast.success("Einladungslink kopiert.");
  };

  const shareInvite = async () => {
    if (!inviteUrl) return;
    const invitation = buildCoachInvitationShare(inviteUrl);
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
          <div className="space-y-2"><Label htmlFor={`co-coach-${teamId}`}>Bestätigte berufliche E-Mail</Label><div className="flex flex-col gap-2 sm:flex-row"><Input id={`co-coach-${teamId}`} type="email" value={email} onChange={(event) => { setEmail(event.target.value); setInviteUrl(null); }} placeholder="coach@verein.de" /><Button type="button" onClick={() => void createInvite()} disabled={loading || !email.includes("@")} className="shrink-0">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}Einladung erstellen</Button></div></div>
          <p className="text-xs leading-relaxed text-muted-foreground">Der Link ist einmalig, sieben Tage gültig und funktioniert ausschließlich mit der eingeladenen bestätigten E-Mail-Adresse.</p>
          {inviteUrl && (
            <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Check className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Einladung ist bereit</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Einmaliger Link · sieben Tage gültig · an {email.trim().toLowerCase()} gebunden
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button type="button" variant="outline" className="min-h-10" onClick={() => void copyInvite()}>
                  <Copy className="h-4 w-4" />
                  Link kopieren
                </Button>
                <Button type="button" className="min-h-10" onClick={() => void shareInvite()}>
                  <Share2 className="h-4 w-4" />
                  Einladung teilen
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
