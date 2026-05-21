import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FlaskConical } from "lucide-react";

/**
 * Small visible banner shown only to QA test users / test teams.
 * Real users never see it (gated by profiles.is_test_user).
 */
const QATestBanner = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [show, setShow] = useState(false);
  const [label, setLabel] = useState("QA TEST USER");

  useEffect(() => {
    if (!user?.id || location.pathname === "/auth") {
      setShow(false);
      setLabel("QA TEST USER");
      return;
    }
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("is_test_user").eq("id", user.id).maybeSingle();
      if (!prof?.is_test_user) {
        setShow(false);
        return;
      }
      const { data: memberships } = await supabase
        .from("team_members")
        .select("team_id, teams!inner(name, is_test_team)")
        .eq("user_id", user.id);
      const testTeam = (memberships ?? []).find((m: any) => m.teams?.is_test_team);
      if (testTeam) setLabel(`QA TEST TEAM · ${(testTeam as any).teams.name}`);
      setShow(true);
    })();
  }, [user?.id, location.pathname]);

  if (!show) return null;
  return (
    <div className="w-full bg-yellow-500/15 border-b border-yellow-500/40 text-yellow-200 text-xs font-semibold tracking-wider px-4 py-2 flex items-center justify-center gap-2">
      <FlaskConical className="w-3.5 h-3.5" />
      {label}
    </div>
  );
};

export default QATestBanner;
