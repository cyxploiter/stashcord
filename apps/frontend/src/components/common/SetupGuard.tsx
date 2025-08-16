"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSetup } from '@/context/SetupContext';

interface SetupGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function SetupGuard({ children, fallback }: SetupGuardProps) {
  const { setupStatus, isLoading, error } = useSetup();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && setupStatus && !setupStatus.setupComplete) {
      console.log('Setup not complete, redirecting to setup page');
      router.push('/setup');
    }
  }, [setupStatus, isLoading, router]);

  if (isLoading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen bg-background theme-transition">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Checking setup status...</p>
          </div>
        </div>
      )
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Setup check failed: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!setupStatus?.setupComplete) {
    // This should trigger the redirect, but in case it doesn't, show a message
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Setup required. Redirecting...</p>
          <button
            onClick={() => router.push('/setup')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Setup
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
