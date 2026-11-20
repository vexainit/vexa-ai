import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import type { UserProfile, UserRole } from '../types/vexa';

export interface ActiveSession {
  userId: string;
  role: UserRole;
  fullName: string;
  email: string;
  isVerified: boolean;
}

const DEFAULT_ACCOUNTS: Record<string, ActiveSession> = {
  biz_kaya: {
    userId: 'biz_kaya',
    role: 'BUSINESS',
    fullName: 'Kaya Looms D2C',
    email: 'ops@kayalooms.in',
    isVerified: true,
  },
  stu_aarav: {
    userId: 'stu_aarav',
    role: 'STUDENT',
    fullName: 'Aarav Mehta',
    email: 'aarav.mehta@builder.in',
    isVerified: true,
  },
  men_priya: {
    userId: 'men_priya',
    role: 'MENTOR',
    fullName: 'Priya Shah',
    email: 'priya.shah@vexamentors.in',
    isVerified: true,
  },
  men_pending: {
    userId: 'men_pending',
    role: 'MENTOR',
    fullName: 'Vikram Desai (Unverified)',
    email: 'vikram.desai@mentors.in',
    isVerified: false,
  },
  adm_vexa: {
    userId: 'adm_vexa',
    role: 'ADMIN',
    fullName: 'Vexa Ops Admin',
    email: 'admin@vexabridge.in',
    isVerified: true,
  },
};

export const ROLE_DEFAULT_ROUTE: Record<UserRole, string> = {
  BUSINESS: '/business',
  STUDENT: '/student/challenges',
  MENTOR: '/mentor/reviews',
  ADMIN: '/admin',
};

interface RoleContextValue {
  session: ActiveSession;
  demoUsers: UserProfile[];
  switchRoleByUserId: (userId: string) => ActiveSession;
  switchRole: (role: UserRole) => ActiveSession;
  setCustomSession: (user: UserProfile) => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

const STORAGE_KEY = 'vexa_bridge_active_session_v2';

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ActiveSession>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved) as ActiveSession;
    } catch {
      // ignore storage errors
    }
    return DEFAULT_ACCOUNTS.biz_kaya;
  });

  const { data } = useQuery({
    queryKey: ['currentUser', 'demoUsers'],
    queryFn: () => apiFetch<{ users: UserProfile[] }>('/users/demo'),
    staleTime: 10_000,
    retry: 1,
  });

  const demoUsers = data?.users ?? [];

  // Keep active user's verification status synced with backend (e.g., when Admin verifies men_pending)
  useEffect(() => {
    if (!demoUsers.length) return;
    const match = demoUsers.find((u) => u.id === session.userId);
    if (match && (match.is_verified !== session.isVerified || match.full_name !== session.fullName)) {
      const updated: ActiveSession = {
        userId: match.id,
        role: match.role,
        fullName: match.full_name,
        email: match.email,
        isVerified: match.is_verified,
      };
      setSession(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  }, [demoUsers, session.userId, session.isVerified, session.fullName]);

  const switchRoleByUserId = (userId: string): ActiveSession => {
    const live = demoUsers.find((u) => u.id === userId);
    const next: ActiveSession = live
      ? {
          userId: live.id,
          role: live.role,
          fullName: live.full_name,
          email: live.email,
          isVerified: live.is_verified,
        }
      : DEFAULT_ACCOUNTS[userId] || DEFAULT_ACCOUNTS.biz_kaya;
    setSession(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  };

  const switchRole = (role: UserRole): ActiveSession => {
    const idMap: Record<UserRole, string> = {
      BUSINESS: 'biz_kaya',
      STUDENT: 'stu_aarav',
      MENTOR: 'men_priya',
      ADMIN: 'adm_vexa',
    };
    return switchRoleByUserId(idMap[role]);
  };

  const setCustomSession = (user: UserProfile) => {
    const next: ActiveSession = {
      userId: user.id,
      role: user.role,
      fullName: user.full_name,
      email: user.email,
      isVerified: user.is_verified,
    };
    setSession(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <RoleContext.Provider
      value={{ session, demoUsers, switchRoleByUserId, switchRole, setCustomSession }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}
