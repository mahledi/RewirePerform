import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Copy, Loader2, Share2, MessageCircle } from "lucide-react";

interface Team {
  id: string;
  name: string;
  sport: string | null;
  access_code: string;
}

interface TeamManagementProps {
  teams: Team[];
  onTeamCreated: () => void;
}

const TeamManagement = ({ teams, onTeamCreated }: TeamManagementProps) => {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamSport, setTeamSport] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleCreate = async () => {
    if (!teamName.trim() || !user) return;
    setCreating(true);

    const { error } = await supabase.from("teams").insert({
      name: teamName.trim(),
      sport: teamSport.trim() || null,
      created_by: user.id,
    });

    if (error) {
      toast.error("Fehler beim Erstellen: " + error.message);
    } else {
      const { data: newTeam } = await supabase
        .from("teams")
        .select("id")
        .eq("created_by", user.id)
        .eq("name", teamName.trim())
        .maybeSingle();

      if (newTeam) {
        await supabase.from("team_members").insert({
          team_id: newTeam.id,
          user_id: user.id,
        });
      }

      toast.success("Team erstellt!");
      setTeamName("");
      setTeamSport("");
      setShowForm(false);
      onTeamCreated();
    }
    setCreating(false);
  };

  const getShareMessage = (team: Team) =>
    `Hey! Ich lade dich ein, unserem Mentaltraining beizutreten 🧠💪\n\nTeam: ${team.name}\nDein Zugangscode: ${team.access_code}\n\nRegistriere dich in der App und gib diesen Code bei der Anmeldung ein, um dem Team beizutreten.`;

  const shareWhatsApp = (team: Team) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(getShareMessage(team))}`, "_blank");
  };

  const shareNative = async (team: Team) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Team ${team.name} beitreten`, text: getShareMessage(team) });
      } catch {
        // user cancelled
      }
    } else {
      navigator.clipboard.writeText(getShareMessage(team));
      toast.success("Einladungstext kopiert!");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Zugangscode kopiert!");
  };

  return (
    <div className="space-y-4">
      {teams.map((team) => (
        <div key={team.id} className="bg-card border border-border/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-heading font-semibold text-foreground">{team.name}</h3>
              {team.sport && <p className="text-xs text-muted-foreground">{team.sport}</p>}
            </div>
          </div>

          {/* Access Code */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 bg-secondary/50 rounded-xl px-4 py-3 font-mono text-lg tracking-[0.3em] text-center text-primary font-bold">
              {team.access_code}
            </div>
            <button
              onClick={() => copyCode(team.access_code)}
              className="p-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>

          {/* Share Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => shareWhatsApp(team)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors text-sm font-medium"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
            <button
              onClick={() => shareNative(team)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
            >
              <Share2 className="w-4 h-4" />
              Teilen
            </button>
          </div>

          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            Teile diesen Code mit deinen Sportlern
          </p>
        </div>
      ))}

      {showForm ? (
        <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-3">
          <input
            type="text"
            placeholder="Teamname"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
          />
          <input
            type="text"
            placeholder="Sportart (optional)"
            value={teamSport}
            onChange={(e) => setTeamSport(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-3 rounded-xl border border-border/50 text-muted-foreground text-sm hover:bg-secondary/50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !teamName.trim()}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Erstellen"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-border/50 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="w-5 h-5" />
          Neues Team erstellen
        </button>
      )}
    </div>
  );
};

export default TeamManagement;
