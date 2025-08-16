"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { setupApi } from 'api';
import { ServerSelectionModal } from '@/components/common/ServerSelectionModal';
import { Guild } from 'api';

export default function SetupPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: status, isLoading: isStatusLoading, error: statusError } = useQuery({
    queryKey: ['setupStatus'],
    queryFn: setupApi.getStatus,
    refetchOnWindowFocus: true,
  });

  // Log the setup status for debugging
  useEffect(() => {
    if (status) {
      console.log('Setup Status:', {
        serverCreated: status.serverCreated,
        botInServer: status.botInServer,
        botHasAdminPerms: status.botHasAdminPerms,
        setupComplete: status.setupComplete,
        guildId: status.guildId
      });
    }
  }, [status]);

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
      <div className="min-h-screen bg-background flex items-center justify-center theme-transition">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading setup status...</p>
        </div>
      </div>
    );
  }

  if (statusError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center theme-transition">
        <div className="text-center">
          <p className="text-destructive">Failed to load setup status. Please try again later.</p>
        </div>
      </div>
    );
  }

  const step1Complete = status?.serverCreated ?? false;
  const step2Complete = status?.botInServer ?? false;
  const step3Complete = status?.botHasAdminPerms ?? false;

  return (
    <div className="min-h-screen bg-background theme-transition">
      <ServerSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectServer={handleSelectServer}
      />

      {/* Header */}
      <div className="border-b border-border px-6 py-4 theme-transition">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-foreground rounded flex items-center justify-center">
            <span className="text-background text-xs font-bold">◆</span>
          </div>
          <h1 className="text-lg font-semibold text-foreground">Stashcord</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto py-16 px-6">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Let&#39;s get you set up
            </h2>
            <p className="text-muted-foreground leading-relaxed">
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
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step1Complete ? 'bg-success/20' : 'bg-surface'}`}>
                    {step1Complete ? <CheckCircle className="w-4 h-4 text-success" /> : <div className="w-2 h-2 bg-muted-foreground rounded-full" />}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Select a Server</h3>
                </div>
                <div className="ml-9">
                  <p className="text-sm text-muted-foreground mb-1">Step 1</p>
                  <p className="text-muted-foreground text-sm mb-2">
                    Choose an existing server you own, or create a new one to be your private space for Stashcord.
                  </p>
                </div>
              </div>
              <div className="ml-6 flex gap-2">
                <Button onClick={() => setIsModalOpen(true)} variant={step1Complete ? "outline" : "default"} className={step1Complete ? "border-success text-success hover:bg-success/10" : "bg-surface hover:bg-surface-hover text-foreground font-medium border border-border"}>
                  {step1Complete ? 'Server Selected' : 'Select Server'}
                </Button>
              </div>
            </div>

            {/* Step 2 - Invite Bot */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step2Complete ? 'bg-success/20' : 'bg-surface'}`}>
                    {step2Complete ? <CheckCircle className="w-4 h-4 text-success" /> : <div className="w-2 h-2 bg-muted-foreground rounded-full" />}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Invite Stashcord Bot</h3>
                </div>
                <div className="ml-9">
                  <p className="text-sm text-muted-foreground mb-1">Step 2</p>
                  <p className="text-muted-foreground text-sm">
                    Invite the Stashcord bot to your chosen server.
                  </p>
                </div>
              </div>
              <div className="ml-6 flex gap-2">
                <Button onClick={handleInviteBot} variant={step2Complete ? "outline" : "default"} className={step2Complete ? "border-success text-success hover:bg-success/10" : "bg-surface hover:bg-surface-hover text-foreground font-medium border border-border"} disabled={!step1Complete}>
                  {step2Complete ? 'Invited' : 'Invite Bot'}
                </Button>
                {step1Complete && !step2Complete && (
                  <Button onClick={() => refreshStatus()} variant="outline" className="bg-card hover:bg-surface-hover text-muted-foreground font-medium border border-border" disabled={isRefreshingStatus}>
                    {isRefreshingStatus ? 'Checking...' : 'Refresh'}
                  </Button>
                )}
              </div>
            </div>

            {/* Step 3 - Bot Admin Permissions */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step3Complete ? 'bg-success/20' : 'bg-surface'}`}>
                    {step3Complete ? <CheckCircle className="w-4 h-4 text-success" /> : <div className="w-2 h-2 bg-muted-foreground rounded-full" />}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Verify Bot Permissions</h3>
                </div>
                <div className="ml-9">
                  <p className="text-sm text-muted-foreground mb-1">Step 3</p>
                  <p className="text-muted-foreground text-sm mb-2">
                    Ensure the Stashcord bot has Administrator permissions in your server.
                  </p>
                  {status?.errorMessage && (
                    <p className="text-xs text-warning bg-warning/10 border border-warning/30 rounded px-2 py-1">
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
