// Auth state for the whole app. AuthProvider subscribes once to Supabase's
// auth events; every screen reads the result through useAuth(). Screens never
// talk to supabase.auth for *state* themselves — one subscription, one truth.
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { supabase } from '@/lib/supabase';

type AuthState = {
  /** The logged-in session, or null when signed out. */
  session: Session | null;
  /**
   * True only during the first moments after launch, while the persisted
   * session is being loaded from AsyncStorage. Used to avoid flashing the
   * sign-in screen at someone who is actually logged in.
   */
  isLoading: boolean;
};

const AuthContext = createContext<AuthState>({ session: null, isLoading: true });

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial load: restore whatever session was persisted on disk.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    // From then on: react to sign-in, sign-out, and token refreshes.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ session, isLoading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
