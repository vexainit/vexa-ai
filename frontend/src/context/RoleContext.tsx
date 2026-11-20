import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch, getStoredToken, setStoredToken } from '../lib/api';
import { signOutFirebase } from '../lib/firebase';
import type { UserProfile, UserRole } from '../types/vexa';

export interface ActiveSession {
  userId: string;
  role: UserRole;
  fullName: string;
  email: string;
  isVerified: boolean;
}

export const ROLE_DEFAULT_ROUTE: Record<UserRole, string> = {
  BUSINESS: '/business',
  STUDENT: '/student',
  MENTOR: '/mentor',
  ADMIN: '/admin',
};

interface AuthContextValue {
  user: UserProfile | null;
  session: ActiveSession;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  setAuthSession: (token: string, user: UserProfile) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const EMPTY_SESSION: ActiveSession = {
  userId: '',
  role: 'BUSINESS',
  fullName: '',
  email: '',
  isVerified: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);
const USER_STORAGE_KEY = 'vexa_bridge_user_profile_v2';

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as UserProfile) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(() => Boolean(getStoredToken()));

  const setAuthSession = (nextToken: string, nextUser: UserProfile) => {
    setStoredToken(nextToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
    setLoading(false);
    queryClient.clear();
  };

  const refreshUser = async () => {
    const active = getStoredToken();
    if (!active) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch<{ user: UserProfile }>('/auth/me', { token: active });
      // Guard against race if a newer token was saved while /auth/me was in flight
      if (getStoredToken() !== active) return;
      setUser(res.user);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
    } catch {
      if (getStoredToken() !== active) return;
      setStoredToken(null);
      localStorage.removeItem(USER_STORAGE_KEY);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const logout = async () => {
    await signOutFirebase();
    setStoredToken(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
    queryClient.clear();
  };

  const session: ActiveSession = user
    ? {
        userId: user.id,
        role: user.role,
        fullName: user.full_name,
        email: user.email,
        isVerified: user.is_verified,
      }
    : EMPTY_SESSION;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        token,
        loading,
        isAuthenticated: Boolean(token && user),
        setAuthSession,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}
