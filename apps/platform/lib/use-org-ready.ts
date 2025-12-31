'use client';

import { useMemo } from 'react';
import { useUser } from './user-context';

export function useOrgReady(orgSlug: string) {
  const { activeOrg, organizations, loading } = useUser();

  const org = useMemo(
    () => organizations.find((item) => item.slug === orgSlug) || null,
    [organizations, orgSlug]
  );

  const isReady = !loading && Boolean(org) && activeOrg?.id === org?.id;

  return { org, activeOrg, loading, isReady };
}
