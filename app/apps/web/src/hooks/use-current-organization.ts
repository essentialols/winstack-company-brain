'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { UserOrganization } from '@app-starter/shared';
import { organizationsApi } from '@/lib/organizations-api';

const STORAGE_KEY = 'oib:current-organization-id';

const readStoredId = (): string | null => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeStoredId = (id: string) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Storage can be blocked (private mode); the choice then lasts for this page only.
  }
};

/**
 * The workspace (organization) the brain UI is showing. Built on the starter's
 * `user-organizations` query, so it shares its cache with the rest of the app;
 * only the last-picked id is remembered locally.
 */
export const useCurrentOrganization = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user-organizations'],
    queryFn: () => organizationsApi.getUserOrganizations(),
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedId(readStoredId());
  }, []);

  const organizations: UserOrganization[] = useMemo(() => data?.organizations ?? [], [data]);

  const organization =
    organizations.find((candidate) => candidate.id === selectedId) ?? organizations[0] ?? null;

  const selectOrganization = useCallback((id: string) => {
    writeStoredId(id);
    setSelectedId(id);
  }, []);

  return { organization, organizations, isLoading, error, selectOrganization };
};

export const rememberOrganization = writeStoredId;
