import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "athlete" | "coach" | "admin" | null;

const roleCacheKey = (userId: string) => `cached_user_role:${userId}`;

const readCachedRole = (userId: string): AppRole => {
  const cached = window.localStorage.getItem(roleCacheKey(userId));
  return cached === "athlete" || cached === "coach" || cached === "admin" ? cached : null;
};

const writeCachedRole = (userId: string, nextRole: AppRole) => {
  if (!nextRole) return;
  window.localStorage.setItem(roleCacheKey(userId), nextRole);
  window.localStorage.setItem("cached_user_role", nextRole);
  window.localStorage.setItem("cached_user_id", userId);
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole;
  roleVerified: boolean;
  isTestUser: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: null,
  roleVerified: false,
  isTestUser: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole>(null);
  const [roleVerified, setRoleVerified] = useState(false);
  const [isTestUser, setIsTestUser] = useState(false);
  const activeUserIdRef = useRef<string | null>(null);
  const authGenerationRef = useRef(0);

  const fetchUserContext = useCallback(async (userId: string, generation: number): Promise<AppRole> => {
    const isCurrentContext = () =>
      activeUserIdRef.current === userId && authGenerationRef.current === generation;

    if (!isCurrentContext()) return null;
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
      if (!isCurrentContext()) return null;
      const r = (roleData?.role as AppRole) ?? null;
      const testFlag = Boolean(profileData?.is_test_user);
      setRole(r);
      setRoleVerified(true);
      setIsTestUser(testFlag);
      writeCachedRole(userId, r);
      return r;
    } catch (err) {
      if (!isCurrentContext()) return null;
      console.error("Failed to fetch user role", err);
      // Offline-Fallback: gecachte Rolle aus localStorage verwenden
      const cached = readCachedRole(userId);
      if (cached) {
        setRole(cached);
        return cached;
      }
      return null;
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const generation = ++authGenerationRef.current;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const userId = session.user.id;
          const sameUser = activeUserIdRef.current === userId;
          activeUserIdRef.current = userId;
          const cachedRole = readCachedRole(userId);
          if (!sameUser) {
            setRoleVerified(false);
            setRole(cachedRole);
            setIsTestUser(false);
            setLoading(!cachedRole);
          }
          setTimeout(async () => {
            if (activeUserIdRef.current !== userId || authGenerationRef.current !== generation) return;
            await fetchUserContext(userId, generation);
            if (activeUserIdRef.current === userId && authGenerationRef.current === generation) {
              setLoading(false);
            }
          }, 0);
        } else {
          activeUserIdRef.current = null;
          setRole(null);
          setRoleVerified(false);
          setIsTestUser(false);
          setLoading(false);
        }
      }
    );

    return () => {
      authGenerationRef.current += 1;
      subscription.unsubscribe();
    };
  }, [fetchUserContext]);

  const signOut = async () => {
    const previousUserId = activeUserIdRef.current;
    await supabase.auth.signOut();
    activeUserIdRef.current = null;
    setRole(null);
    setRoleVerified(false);
    setIsTestUser(false);
    try { window.localStorage.removeItem("cached_user_role"); } catch { /* noop */ }
    try { window.localStorage.removeItem("cached_user_id"); } catch { /* noop */ }
    if (previousUserId) {
      try { window.localStorage.removeItem(roleCacheKey(previousUserId)); } catch { /* noop */ }
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, roleVerified, isTestUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
