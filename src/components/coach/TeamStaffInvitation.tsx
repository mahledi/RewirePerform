import { useEffect, useState } from "react";
import { Clipboard, Loader2, ShieldCheck, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

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
          {inviteUrl && <div className="flex gap-2 rounded-xl border border-border bg-background p-2"><Input readOnly value={inviteUrl} className="font-mono text-xs" /><Button type="button" size="icon" variant="outline" aria-label="Co-Coach-Einladung kopieren" onClick={() => { void navigator.clipboard.writeText(inviteUrl); toast.success("Einladungslink kopiert."); }}><Clipboard className="h-4 w-4" /></Button></div>}
        </div>
      )}
    </section>
  );
};

export default TeamStaffInvitation;
