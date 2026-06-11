import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import supabase from './supabase';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: 'buyer' | 'seller' | 'admin';
  seller_verified: boolean;
  rating: number | null;
  total_sales: number;
  total_purchases: number;
  created_at: string;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) setProfile(data as Profile);
    } catch (err) {
      console.warn('Failed to fetch profile:', err);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    setSession(data.session);
    setUser(data.user);
    await fetchProfile(data.user.id);
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw new Error(error.message);

    // Create profile row directly
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        email: email.toLowerCase(),
        full_name: fullName,
        role: 'buyer',
        seller_verified: false,
        total_sales: 0,
        total_purchases: 0,
      });
      if (profileError) console.warn('Profile creation error:', profileError.message);
    }

    // Auto sign in after registration
    if (data.session) {
      setSession(data.session);
      setUser(data.user);
      if (data.user) await fetchProfile(data.user.id);
    } else if (data.user) {
      // Email confirmation may be required — attempt silent sign in
      try {
        await signIn(email, password);
      } catch (signInErr: any) {
        // If sign in fails (e.g., email confirmation required), surface a helpful message
        throw new Error('Account created! Please check your email to confirm your account, then sign in.');
      }
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  return React.createElement(
    AuthContext.Provider,
    { value: { user, profile, session, loading, signIn, signUp, signOut, refreshProfile } },
    children
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
