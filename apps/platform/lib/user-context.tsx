'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified: Date | null;
  createdAt: Date;
  keycloakSync?: {
    status: 'HEALTHY' | 'DEGRADED';
    lastSyncedAt?: string | null;
    lastAttemptAt?: string | null;
    nextRetryAt?: string | null;
    lastError?: string | null;
  };
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface UserContextType {
  user: User | null;
  organizations: Organization[];
  activeOrg: Organization | null;
  orgId: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  switchActiveOrg: (orgIdOrSlug: string) => Promise<boolean>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrgState] = useState<Organization | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/v1/profile', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      console.log('Profile API response:', data);
      setUser(data.user);
      setOrganizations(data.organizations);
      setActiveOrgState(data.activeOrg);
      setOrgId(data.activeOrg?.id || null);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const switchActiveOrg = async (orgIdOrSlug: string) => {
    try {
      const matchedOrg = organizations.find(
        (org) => org.id === orgIdOrSlug || org.slug === orgIdOrSlug
      );
      const payload = matchedOrg
        ? { orgId: matchedOrg.id }
        : { orgSlug: orgIdOrSlug };

      const response = await fetch('/api/v1/orgs/active', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to switch organization');
      }

      const data = await response.json();
      if (data.activeOrg) {
        setActiveOrgState(data.activeOrg);
        setOrgId(data.activeOrg.id);
      }

      return true;
    } catch (err) {
      console.error('Error switching organization:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch organization');
      return false;
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        organizations,
        activeOrg,
        orgId,
        loading,
        error,
        refetch: fetchUserData,
        switchActiveOrg,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
