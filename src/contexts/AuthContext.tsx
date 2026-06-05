import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { setMonitoringUser } from "@/lib/monitoring";

type AppRole = "athlete" | "coach" | "admin" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole;
  isTestUser: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: null,
  isTestUser: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole>(null);
  const [isTestUser, setIsTestUser] = useState(false);
  const activeUserIdRef = useRef<string | null>(null);

  const readCachedRole = (): AppRole => {
    const cached = window.localStorage.getItem("cached_user_role");
    return cached === "athlete" || cached === "coach" || cached === "admin" ? cached : null;
  };

  const fetchUserContext = async (userId: string): Promise<AppRole> => {
    try {
      const [{ data: roleData, error: roleError }, { data: profileData, error: profileError }] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("is_test_user")
          .eq("id", userId)
          .maybeSingle(),
      ]);
      if (roleError) throw roleError;
      if (profileError) throw profileError;
      const r = (roleData?.role as AppRole) ?? null;
      const testFlag = Boolean(profileData?.is_test_user);
      setRole(r);
      setIsTestUser(testFlag);
      setMonitoringUser({ userId, role: r, isTest: testFlag });
      if (r) window.localStorage.setItem("cached_user_role", r);
      return r;
    } catch (err) {
      console.error("Failed to fetch user role", err);
      // Offline-Fallback: gecachte Rolle aus localStorage verwenden
      const cached = readCachedRole();
      if (cached) {
        setRole(cached);
        setMonitoringUser({ userId, role: cached, isTest: false });
        return cached;
      }
      setMonitoringUser({ userId, role: null, isTest: false });
      return null;
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const sameUser = activeUserIdRef.current === session.user.id;
          activeUserIdRef.current = session.user.id;
          const cachedRole = readCachedRole();
          if (cachedRole) {
            setRole(cachedRole);
            setMonitoringUser({ userId: session.user.id, role: cachedRole, isTest: false });
          }
          if (!sameUser && !cachedRole) setLoading(true);
          else setLoading(false);
          setTimeout(async () => {
            await fetchUserContext(session.user.id);
            setLoading(false);
          }, 0);
        } else {
          activeUserIdRef.current = null;
          setRole(null);
          setIsTestUser(false);
          setMonitoringUser({ userId: null });
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        activeUserIdRef.current = session.user.id;
        const cachedRole = readCachedRole();
        if (cachedRole) {
          setRole(cachedRole);
          setMonitoringUser({ userId: session.user.id, role: cachedRole, isTest: false });
          setLoading(false);
          await fetchUserContext(session.user.id);
          return;
        }
        await fetchUserContext(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    activeUserIdRef.current = null;
    setRole(null);
    setIsTestUser(false);
    setMonitoringUser({ userId: null });
    try { window.localStorage.removeItem("cached_user_role"); } catch { /* noop */ }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, isTestUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
