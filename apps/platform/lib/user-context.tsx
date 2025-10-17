'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified: Date | null;
  createdAt: Date;
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
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
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
      setActiveOrg(data.activeOrg);
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
