"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  accessRole: "public" | "contributor" | "admin";
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
  accessRole: "public",
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessRole, setAccessRole] = useState<"public" | "contributor" | "admin">("public");

  useEffect(() => {
    // If Supabase is not configured, skip auth entirely (local dev)
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function initAuth() {
      try {
        // Dynamic import to avoid errors when Supabase isn't configured
        const { createClient } = await import("@/lib/supabase");
        const supabase = createClient();

        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          // Fetch user profile for access role
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("access_role")
            .eq("id", initialSession.user.id)
            .single();
          if (profile && mounted) {
            setAccessRole(profile.access_role as "public" | "contributor" | "admin");
          }
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, newSession) => {
            if (!mounted) return;
            setSession(newSession);
            setUser(newSession?.user ?? null);

            if (newSession?.user) {
              const { data: profile } = await supabase
                .from("user_profiles")
                .select("access_role")
                .eq("id", newSession.user.id)
                .single();
              if (profile && mounted) {
                setAccessRole(profile.access_role as "public" | "contributor" | "admin");
              }
            } else {
              setAccessRole("public");
            }
          }
        );

        if (mounted) setLoading(false);
        return () => subscription.unsubscribe();
      } catch {
        // Supabase not available — continue without auth
        if (mounted) setLoading(false);
      }
    }

    initAuth();
    return () => { mounted = false; };
  }, []);

  const signOut = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { createClient } = await import("@/lib/supabase");
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore signout errors
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, accessRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
