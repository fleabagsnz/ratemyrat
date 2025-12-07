// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type ProfileStats = {
  rats_submitted: number;
  ratings_given: number;
  ratings_received: number;
  avg_rating_received: number;
};

type Profile = {
  id: string;
  username: string;
  is_banned: boolean;
  is_admin: boolean;
  push_opt_in: boolean;
  entitlements: Record<string, boolean> | null;
  streak_current: number;
  streak_best: number;
  stats: ProfileStats | null;
  is_evil: boolean; // <<< NEW
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const normalizeProfile = (raw: any): Profile => {
    return {
      id: raw.id,
      username: raw.username,
      is_banned: raw.is_banned ?? false,
      is_admin: raw.is_admin ?? false,
      push_opt_in: raw.push_opt_in ?? true,
      entitlements: raw.entitlements ?? {},
      streak_current: raw.streak_current ?? 0,
      streak_best: raw.streak_best ?? 0,
      stats:
        raw.stats ?? {
          rats_submitted: 0,
          ratings_given: 0,
          ratings_received: 0,
          avg_rating_received: 0,
        },
      is_evil: raw.is_evil ?? false, // <<< NEW: read from DB, default false
    };
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }

    if (data) {
      setProfile(normalizeProfile(data));
    } else {
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);

        if (data.session?.user) {
          await fetchProfile(data.session.user.id);
        }
      } catch (e) {
        console.error('Error initializing auth:', e);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        (async () => {
          setSession(newSession);
          setUser(newSession?.user ?? null);

          if (newSession?.user) {
            await fetchProfile(newSession.user.id);
          } else {
            setProfile(null);
          }

          setLoading(false);
        })();
      }
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
