/**
 * Authentication Context
 * Provides auth state and methods throughout the app
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '../services/authService';
import {
  authService,
  signIn,
  signUp,
  signOut,
  signInWithGoogle,
  onAuthStateChange,
  getUserProfile,
  canGenerate,
  incrementGenerationCount,
} from '../services/authService';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  canGenerate: () => Promise<{ allowed: boolean; remaining: number; limit: number }>;
  recordGeneration: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isProUser: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const userProfile = await getUserProfile(user.id);
      setProfile(userProfile);
    } else {
      setProfile(null);
    }
  }, [user]);

  useEffect(() => {
    // Get initial session
    authService.getSession().then((session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [user, refreshProfile]);

  const handleSignIn = async (email: string, password: string) => {
    const { error } = await signIn(email, password);
    return { error: error?.message ?? null };
  };

  const handleSignUp = async (email: string, password: string) => {
    const { error } = await signUp(email, password);
    return { error: error?.message ?? null };
  };

  const handleSignInWithGoogle = async () => {
    const { error } = await signInWithGoogle();
    return { error: error?.message ?? null };
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setProfile(null);
  };

  const handleCanGenerate = async () => {
    if (!user) {
      return { allowed: false, remaining: 0, limit: 0 };
    }
    return canGenerate(user.id);
  };

  const handleRecordGeneration = async () => {
    if (user) {
      await incrementGenerationCount(user.id);
      await refreshProfile();
    }
  };

  const isProUser = profile?.tier === 'pro' || profile?.tier === 'enterprise';

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signInWithGoogle: handleSignInWithGoogle,
    signOut: handleSignOut,
    canGenerate: handleCanGenerate,
    recordGeneration: handleRecordGeneration,
    refreshProfile,
    isProUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
