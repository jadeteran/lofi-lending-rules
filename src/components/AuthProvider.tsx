import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

import { getBrowserSupabase } from "@/lib/supabase-browser";
import { seedAdminUser } from "@/lib/auth.functions";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  role: string | null;
  accessToken: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const seeded = useRef(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let active = true;

    (async () => {
      // Best-effort seed of the founding admin so first login works.
      if (!seeded.current) {
        seeded.current = true;
        void seedAdminUser().catch(() => {});
      }

      const supabase = await getBrowserSupabase();
      if (!active) return;
      setClient(supabase);

      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      setLoading(false);

      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          setSession(newSession);
        },
      );
      unsub = () => listener.subscription.unsubscribe();
    })().catch(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      unsub?.();
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const supabase = client ?? (await getBrowserSupabase());
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? error.message : null };
    },
    [client],
  );

  const signOut = useCallback(async () => {
    const supabase = client ?? (await getBrowserSupabase());
    await supabase.auth.signOut();
    setSession(null);
  }, [client]);

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null;
    return {
      session,
      user,
      role: (user?.user_metadata?.role as string | undefined) ?? null,
      accessToken: session?.access_token ?? null,
      loading,
      signIn,
      signOut,
    };
  }, [session, loading, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
