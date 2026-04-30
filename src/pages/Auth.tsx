import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Mail, Lock, User, ArrowRight, Loader2, Users, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [sport, setSport] = useState("");
  const [selectedRole, setSelectedRole] = useState<"athlete" | "coach">("athlete");
  const [teamCode, setTeamCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (password.length < 6) {
      toast.error("Passwort muss mindestens 6 Zeichen haben.");
      return;
    }

    setLoading(true);

    // Backfill profile sport from questionnaire answers if profiles.sport is null
    const backfillProfileSport = async (userId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("sport")
        .eq("id", userId)
        .maybeSingle();

      if (profile && !profile.sport) {
        const { data: qr } = await supabase
          .from("questionnaire_responses")
          .select("answers")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (qr?.answers && typeof qr.answers === "object") {
          const answers = qr.answers as Record<string, any>;
          const sport = answers["sport-01"] || null;
          const position = answers["sport-02"] || null;
          if (sport) {
            await supabase
              .from("profiles")
              .update({ sport, team: position })
              .eq("id", userId);
          }
        }
      }
    };

    if (isLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        toast.error(error.message === "Invalid login credentials" ? "Ungültige Anmeldedaten." : error.message);
      } else {
        await backfillProfileSport(data.user.id);
        toast.success("Willkommen zurück!");
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .maybeSingle();
        navigate(roleData?.role === "coach" ? "/coach" : "/dashboard");
      }
    } else {
      if (!fullName.trim()) {
        toast.error("Bitte gib deinen Namen ein.");
        setLoading(false);
        return;
      }
      if (!sport) {
        toast.error("Bitte wähle deine Sportart.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim(), sport: sport.trim(), role: selectedRole },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        toast.error(error.message);
      } else if (data.user) {
        await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: selectedRole,
        }).then(() => {});

        if (sport && data.user) {
          await supabase.from("profiles").update({ sport }).eq("id", data.user.id);
        }

        if (teamCode.trim()) {
          const { data: team } = await supabase
            .from("teams")
            .select("id")
            .eq("access_code", teamCode.trim().toUpperCase())
            .maybeSingle();
          if (team) {
            await supabase.from("team_members").insert({
              team_id: team.id,
              user_id: data.user.id,
            });
          } else {
            toast.error("Teamcode nicht gefunden. Du kannst ihn später eingeben.");
          }
        }

        toast.success("Konto erstellt! Willkommen.");
        navigate(selectedRole === "coach" ? "/coach" : "/dashboard");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-6 cursor-pointer" onClick={() => navigate("/")}>
            <Brain className="w-7 h-7 text-primary" />
            <span className="font-heading text-xl font-bold">RewirePerform</span>
          </div>
          <h1 className="font-heading text-3xl font-bold mb-2">
            {isLogin ? "Willkommen zurück." : "Deine Reise beginnt."}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isLogin ? "Melde dich an, um dein Programm fortzusetzen." : "Erstelle dein Konto für dein personalisiertes Mental-Performance-Programm."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              {/* Role Selection */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole("athlete")}
                  className={`flex items-center justify-center gap-2 py-3.5 rounded-xl border text-sm font-medium transition-all ${
                    selectedRole === "athlete"
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-secondary/50 border-border/50 text-muted-foreground hover:border-border"
                  }`}
                >
                  <User className="w-4 h-4" />
                  Sportler
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole("coach")}
                  className={`flex items-center justify-center gap-2 py-3.5 rounded-xl border text-sm font-medium transition-all ${
                    selectedRole === "coach"
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-secondary/50 border-border/50 text-muted-foreground hover:border-border"
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Trainer
                </button>
              </div>

              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Vollständiger Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                />
              </div>
              {/* Sport Selection */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSport("Fußball")}
                  className={`flex items-center justify-center gap-2 py-3.5 rounded-xl border text-sm font-medium transition-all ${
                    sport === "Fußball"
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-secondary/50 border-border/50 text-muted-foreground hover:border-border"
                  }`}
                >
                  ⚽ Fußball
                </button>
                <button
                  type="button"
                  onClick={() => setSport("American Football")}
                  className={`flex items-center justify-center gap-2 py-3.5 rounded-xl border text-sm font-medium transition-all ${
                    sport === "American Football"
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-secondary/50 border-border/50 text-muted-foreground hover:border-border"
                  }`}
                >
                  🏈 American Football
                </button>
              </div>

              {/* Team Code */}
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Teamcode (optional)"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm uppercase tracking-widest"
                />
              </div>
            </>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              placeholder="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-primary font-heading font-semibold text-primary-foreground hover:shadow-glow transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isLogin ? "Anmelden" : "Konto erstellen"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {isLogin ? "Noch kein Konto?" : "Bereits registriert?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-medium hover:underline"
          >
            {isLogin ? "Registrieren" : "Anmelden"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
