import { useState } from "react";
import {
  ChevronLeft,
  ExternalLink,
  KeyRound,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AccountDeletionDialog } from "@/components/settings/AccountDeletionDialog";
import { PasswordChangeDialog } from "@/components/settings/PasswordChangeDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const feedbackTypes = [
  { value: "bug", label: "Bug melden" },
  { value: "suggestion", label: "Vorschlag" },
  { value: "general", label: "Allgemein" },
] as const;

export const CoachAccountPanel = ({ onBack }: { onBack: () => void }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [feedbackType, setFeedbackType] = useState<(typeof feedbackTypes)[number]["value"]>("general");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deletionOpen, setDeletionOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const submitFeedback = async () => {
    if (!user || feedbackMessage.trim().length < 5 || sendingFeedback) return;
    setSendingFeedback(true);
    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      type: feedbackType,
      message: feedbackMessage.trim().slice(0, 2000),
    });
    setSendingFeedback(false);
    if (error) {
      toast.error("Feedback konnte nicht gesendet werden.");
      return;
    }
    setFeedbackMessage("");
    setFeedbackType("general");
    toast.success("Danke für dein Feedback!");
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate("/", { replace: true });
    } catch {
      setSigningOut(false);
      toast.error("Abmelden ist gerade nicht möglich. Bitte versuche es erneut.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Zurück zum Coach-Dashboard"
          className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/[0.07] bg-white/[0.025] text-white/62 transition-colors hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Coach Console</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#EEF0F2]">Konto & Feedback</h1>
        </div>
      </div>

      <section className="rounded-[24px] border border-white/[0.075] bg-white/[0.025] p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-primary/[0.10] text-primary"><Mail className="h-5 w-5" /></span>
          <div className="min-w-0"><p className="text-xs text-white/42">E-Mail-Adresse</p><p className="truncate text-sm font-medium text-[#EEF0F2]">{user?.email ?? "Keine E-Mail hinterlegt"}</p></div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => setPasswordOpen(true)} className="min-h-11 border-white/[0.10] bg-white/[0.025] text-[#EEF0F2] hover:bg-white/[0.065] hover:text-white"><KeyRound className="h-4 w-4" />Passwort ändern</Button>
          <Button variant="outline" onClick={() => navigate("/privacy")} className="min-h-11 border-white/[0.10] bg-white/[0.025] text-[#EEF0F2] hover:bg-white/[0.065] hover:text-white"><ShieldCheck className="h-4 w-4" />Datenschutz<ExternalLink className="h-3.5 w-3.5" /></Button>
        </div>
      </section>

      <section className="rounded-[24px] border border-white/[0.075] bg-white/[0.025] p-5">
        <div className="flex items-center gap-3"><MessageSquare className="h-5 w-5 text-primary" /><div><h2 className="font-semibold text-[#EEF0F2]">Feedback senden</h2><p className="mt-1 text-sm leading-6 text-white/44">Melde einen Bug, teile eine Idee oder beschreibe, was im Coach-Alltag besser werden soll.</p></div></div>
        <div className="mt-4 flex flex-wrap gap-2">
          {feedbackTypes.map((item) => <button key={item.value} type="button" onClick={() => setFeedbackType(item.value)} className={`min-h-9 rounded-full px-3 text-xs font-medium transition-colors ${feedbackType === item.value ? "bg-primary text-primary-foreground" : "border border-white/[0.10] bg-white/[0.025] text-white/58 hover:bg-white/[0.065] hover:text-white"}`}>{item.label}</button>)}
        </div>
        <Textarea value={feedbackMessage} onChange={(event) => setFeedbackMessage(event.target.value)} placeholder="Was möchtest du uns mitteilen?" maxLength={2000} className="mt-4 min-h-28 border-white/[0.10] bg-black/10 text-[#EEF0F2] placeholder:text-white/30" />
        <Button onClick={() => void submitFeedback()} disabled={sendingFeedback || feedbackMessage.trim().length < 5} className="mt-3 min-h-11 w-full">
          {sendingFeedback ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Feedback absenden
        </Button>
      </section>

      <section className="rounded-[24px] border border-white/[0.075] bg-white/[0.025] p-5">
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => navigate("/support")} className="min-h-11 border-white/[0.10] bg-white/[0.025] text-[#EEF0F2] hover:bg-white/[0.065] hover:text-white"><MessageCircle className="h-4 w-4" />Support</Button>
          <Button variant="outline" disabled={signingOut} onClick={() => void handleSignOut()} className="min-h-11 border-white/[0.10] bg-white/[0.025] text-[#EEF0F2] hover:bg-white/[0.065] hover:text-white">{signingOut && <Loader2 className="h-4 w-4 animate-spin" />}Abmelden</Button>
        </div>
        <Button variant="outline" onClick={() => setDeletionOpen(true)} className="mt-4 min-h-11 w-full border-destructive/35 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" />Account löschen</Button>
      </section>

      <PasswordChangeDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
      {user && <AccountDeletionDialog open={deletionOpen} onOpenChange={setDeletionOpen} userId={user.id} email={user.email ?? ""} />}
    </div>
  );
};
