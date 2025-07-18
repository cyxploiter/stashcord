"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { setupApi } from 'api';
import { ServerSelectionModal } from '@/components/ServerSelectionModal';
import { Guild } from 'api';

export default function SetupPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: status, isLoading: isStatusLoading, error: statusError } = useQuery({
    queryKey: ['setupStatus'],
    queryFn: setupApi.getStatus,
    refetchOnWindowFocus: true,
  });

  const { mutate: completeSetup } = useMutation({
    mutationFn: setupApi.completeSetup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setupStatus'] });
      setIsModalOpen(false);
    },
  });

  const { mutate: refreshStatus, isPending: isRefreshingStatus } = useMutation({
    mutationFn: setupApi.refreshStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setupStatus'] });
    },
  });

  const { mutate: checkBotPerms, isPending: isCheckingBotPerms } = useMutation({
    mutationFn: setupApi.checkBotAdminStatus,
    onSuccess: (data) => {
      queryClient.setQueryData(['setupStatus'], data);
    },
  });

  useEffect(() => {
    const isAxiosError = (error: unknown): error is { response: { status: number } } => {
      return typeof error === 'object' && error !== null && 'response' in error;
    }

    if (isAxiosError(statusError) && statusError.response?.status === 401) {
      window.location.href = '/login';
    }
  }, [statusError]);


  const handleSelectServer = (guild: Guild) => {
    completeSetup(guild.id);
  };

  const handleInviteBot = () => {
    if (status?.botInServer) return;
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1391323202176679987';
    const botInviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot`;
    window.open(botInviteUrl, '_blank');
  };

  const handleVerifyAndLaunch = () => {
    window.location.href = '/';
  };

  if (isStatusLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading setup status...</p>
        </div>
      </div>
    );
  }

  if (statusError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load setup status. Please try again later.</p>
        </div>
      </div>
    );
  }

  const step1Complete = status?.serverCreated ?? false;
  const step2Complete = status?.botInServer ?? false;
  const step3Complete = status?.botHasAdminPerms ?? false;

  return (
    <div className="min-h-screen bg-white">
      <ServerSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectServer={handleSelectServer}
      />

      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gray-900 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">◆</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Stashcord</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto py-16 px-6">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Let&#39;s get you set up
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Stashcord needs a dedicated, private server to securely store your files.
              Follow these steps to get started.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-6">
            {/* Step 1 - Select Server */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step1Complete ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {step1Complete ? <CheckCircle className="w-4 h-4 text-green-600" /> : <div className="w-2 h-2 bg-gray-400 rounded-full" />}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Select a Server</h3>
                </div>
                <div className="ml-9">
                  <p className="text-sm text-gray-500 mb-1">Step 1</p>
                  <p className="text-gray-600 text-sm mb-2">
                    Choose an existing server you own, or create a new one to be your private space for Stashcord.
                  </p>
                </div>
              </div>
              <div className="ml-6 flex gap-2">
                <Button onClick={() => setIsModalOpen(true)} variant={step1Complete ? "outline" : "default"} className={step1Complete ? "border-green-600 text-green-600 hover:bg-green-50" : "bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium border border-gray-200"}>
                  {step1Complete ? 'Server Selected' : 'Select Server'}
                </Button>
              </div>
            </div>

            {/* Step 2 - Invite Bot */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step2Complete ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {step2Complete ? <CheckCircle className="w-4 h-4 text-green-600" /> : <div className="w-2 h-2 bg-gray-400 rounded-full" />}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Invite Stashcord Bot</h3>
                </div>
                <div className="ml-9">
                  <p className="text-sm text-gray-500 mb-1">Step 2</p>
                  <p className="text-gray-600 text-sm">
                    Invite the Stashcord bot to your chosen server.
                  </p>
                </div>
              </div>
              <div className="ml-6 flex gap-2">
                <Button onClick={handleInviteBot} variant={step2Complete ? "outline" : "default"} className={step2Complete ? "border-green-600 text-green-600 hover:bg-green-50" : "bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium border border-gray-200"} disabled={!step1Complete}>
                  {step2Complete ? 'Invited' : 'Invite Bot'}
                </Button>
                {step1Complete && !step2Complete && (
                  <Button onClick={() => refreshStatus()} variant="outline" className="bg-white hover:bg-gray-50 text-gray-600 font-medium border border-gray-200" disabled={isRefreshingStatus}>
                    {isRefreshingStatus ? 'Checking...' : 'Refresh'}
                  </Button>
                )}
              </div>
            </div>

            {/* Step 3 - Bot Admin Permissions */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step3Complete ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {step3Complete ? <CheckCircle className="w-4 h-4 text-green-600" /> : <div className="w-2 h-2 bg-gray-400 rounded-full" />}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Verify Bot Permissions</h3>
                </div>
                <div className="ml-9">
                  <p className="text-sm text-gray-500 mb-1">Step 3</p>
                  <p className="text-gray-600 text-sm mb-2">
                    Ensure the Stashcord bot has Administrator permissions in your server.
                  </p>
                  {status?.errorMessage && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                      ⚠️ {status.errorMessage}
                    </p>
                  )}
                </div>
              </div>
              <div className="ml-6 flex gap-2">
                <Button onClick={() => checkBotPerms()} variant={step3Complete ? "outline" : "default"} className={step3Complete ? "border-green-600 text-green-600 hover:bg-green-50" : "bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium border border-gray-200"} disabled={!step2Complete || isCheckingBotPerms}>
                  {isCheckingBotPerms ? 'Checking...' : step3Complete ? 'Verified' : 'Check Permissions'}
                </Button>
              </div>
            </div>
          </div>

          {/* Launch Button */}
          <div className="text-center pt-6">
            <Button onClick={handleVerifyAndLaunch} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-8 py-3 rounded-lg border border-gray-200" disabled={!step1Complete || !step2Complete || !step3Complete}>
              Launch Stashcord
            </Button>
            {step1Complete && step2Complete && !step3Complete && (
              <p className="text-sm text-gray-500 mt-2">
                The bot has been invited, but it seems to be missing permissions. Please grant the bot Administrator permissions to continue.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
