"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '../store';

interface SetupStatus {
  serverCreated: boolean;
  botInServer: boolean;
  botHasAdminPerms: boolean;
  guildId: string | null;
  setupComplete: boolean;
  lastChecked: Date | null;
}

interface UseSetupResult {
  setupStatus: SetupStatus | null;
  isLoading: boolean;
  checkSetup: (forceRefresh?: boolean) => Promise<void>;
  error: string | null;
}

export const useSetup = (): UseSetupResult => {
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAppStore((state) => ({
    isAuthenticated: state.isAuthenticated,
  }));
  const router = useRouter();

  const checkSetup = async (forceRefresh = false) => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';
      const endpoint = forceRefresh ? '/auth/refresh-server-status' : '/auth/setup-status';
      const method = forceRefresh ? 'POST' : 'GET';

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSetupStatus({
          serverCreated: data.serverCreated || false,
          botInServer: data.botInServer || false,
          botHasAdminPerms: data.botHasAdminPerms || false,
          guildId: data.guildId || null,
          setupComplete: data.setupComplete || false,
          lastChecked: data.lastChecked ? new Date(data.lastChecked) : null,
        });
      } else if (response.status === 401) {
        // Not authenticated, redirect to login
        router.push('/login');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to check setup status');
      }
    } catch (err) {
      console.error('Setup check failed:', err);
      setError('Failed to check setup status');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      checkSetup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return {
    setupStatus,
    isLoading,
    checkSetup,
    error,
  };
};
