'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'react-hot-toast';
import Header from '../../components/layout/Header';

interface UserSettings {
  id: string;
  userId: string;
  maxThreads: number;
  chunkSize: number;
  enableNotifications: boolean;
  theme: 'light' | 'dark' | 'auto';
  compactMode: boolean;
  autoCloseCompletedTransfers: boolean;
  deleteConfirmation: boolean;
  showHiddenFiles: boolean;
  storageAlertThreshold: number;
  enableCompression: boolean;
  duplicateDetection: boolean;
  privacyShareDefault: 'public' | 'private';
  debugMode: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  cacheDuration: number;
  transferConcurrency: number;
  retryAttempts: number;
  enableThumbnails: boolean;
  videoQuality: 'high' | 'medium' | 'low';
  createdAt: string;
  updatedAt: string;
}

interface SettingsSchema {
  maxThreads: { min: number; max: number; default: number; description: string };
  chunkSize: { min: number; max: number; default: number; description: string };
  enableNotifications: { default: boolean; description: string };
  theme: { options: string[]; default: string; description: string };
  compactMode: { default: boolean; description: string };
  autoCloseCompletedTransfers: { default: boolean; description: string };
  deleteConfirmation: { default: boolean; description: string };
  showHiddenFiles: { default: boolean; description: string };
  storageAlertThreshold: { min: number; max: number; default: number; description: string };
  enableCompression: { default: boolean; description: string };
  duplicateDetection: { default: boolean; description: string };
  privacyShareDefault: { options: string[]; default: string; description: string };
  debugMode: { default: boolean; description: string };
  logLevel: { options: string[]; default: string; description: string };
  cacheDuration: { min: number; max: number; default: number; description: string };
  transferConcurrency: { min: number; max: number; default: number; description: string };
  retryAttempts: { min: number; max: number; default: number; description: string };
  enableThumbnails: { default: boolean; description: string };
  videoQuality: { options: string[]; default: string; description: string };
}

export default function SettingsPage() {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [schema, setSchema] = useState<SettingsSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch settings and schema
  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) return;

      try {
        // Fetch settings
        const settingsResponse = await fetch('/api/settings', {
          credentials: 'include', // Use cookies instead of bearer token
        });

        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          setSettings(settingsData.data);
        }

        // Fetch schema
        const schemaResponse = await fetch('/api/settings/schema', {
          credentials: 'include', // Use cookies instead of bearer token
        });

        if (schemaResponse.ok) {
          const schemaData = await schemaResponse.json();
          setSchema(schemaData.data);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  const handleSave = async () => {
    if (!settings || !isAuthenticated) return;

    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Use cookies
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success('Settings saved successfully');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch('/api/settings/reset', {
        method: 'POST',
        credentials: 'include', // Use cookies
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.data);
        toast.success('Settings reset to defaults');
      } else {
        toast.error('Failed to reset settings');
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error('Failed to reset settings');
    }
  };

  const updateSetting = (key: keyof UserSettings, value: string | number | boolean) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!settings || !schema) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Settings</h1>
            <p className="text-gray-600">Failed to load settings</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Settings</h1>
          <div className="space-x-3">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={saving}
            >
              Reset to Defaults
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Performance Settings */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Threads ({schema.maxThreads?.min}-{schema.maxThreads?.max})
                </label>
                <Input
                  type="number"
                  min={schema.maxThreads?.min}
                  max={schema.maxThreads?.max}
                  value={settings.maxThreads}
                  onChange={(e) => updateSetting('maxThreads', parseInt(e.target.value))}
                />
                <p className="text-xs text-gray-500 mt-1">{schema.maxThreads?.description}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chunk Size (MB)
                </label>
                <Input
                  type="number"
                  min={schema.chunkSize?.min ? schema.chunkSize.min / (1024 * 1024) : 1}
                  max={schema.chunkSize?.max ? schema.chunkSize.max / (1024 * 1024) : 25}
                  value={settings.chunkSize / (1024 * 1024)}
                  onChange={(e) => updateSetting('chunkSize', parseInt(e.target.value) * 1024 * 1024)}
                />
                <p className="text-xs text-gray-500 mt-1">{schema.chunkSize?.description}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transfer Concurrency
                </label>
                <Input
                  type="number"
                  min={schema.transferConcurrency?.min}
                  max={schema.transferConcurrency?.max}
                  value={settings.transferConcurrency}
                  onChange={(e) => updateSetting('transferConcurrency', parseInt(e.target.value))}
                />
                <p className="text-xs text-gray-500 mt-1">{schema.transferConcurrency?.description}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Retry Attempts
                </label>
                <Input
                  type="number"
                  min={schema.retryAttempts?.min}
                  max={schema.retryAttempts?.max}
                  value={settings.retryAttempts}
                  onChange={(e) => updateSetting('retryAttempts', parseInt(e.target.value))}
                />
                <p className="text-xs text-gray-500 mt-1">{schema.retryAttempts?.description}</p>
              </div>
            </div>
          </Card>

          {/* Interface Settings */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Interface</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Theme
                </label>
                <select
                  value={settings.theme}
                  onChange={(e) => updateSetting('theme', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {schema.theme?.options.map((option) => (
                    <option key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">{schema.theme?.description}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video Quality
                </label>
                <select
                  value={settings.videoQuality}
                  onChange={(e) => updateSetting('videoQuality', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {schema.videoQuality?.options.map((option) => (
                    <option key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">{schema.videoQuality?.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Boolean Settings */}
              {[
                'compactMode',
                'enableNotifications',
                'autoCloseCompletedTransfers',
                'enableThumbnails'
              ].map((key) => (
                <div key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    id={key}
                    checked={settings[key as keyof UserSettings] as boolean}
                    onChange={(e) => updateSetting(key as keyof UserSettings, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={key} className="ml-2 block text-sm text-gray-900">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </label>
                </div>
              ))}
            </div>
          </Card>

          {/* Security & Privacy */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Security & Privacy</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Share Privacy
                </label>
                <select
                  value={settings.privacyShareDefault}
                  onChange={(e) => updateSetting('privacyShareDefault', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {schema.privacyShareDefault?.options.map((option) => (
                    <option key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">{schema.privacyShareDefault?.description}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cache Duration (hours)
                </label>
                <Input
                  type="number"
                  min={schema.cacheDuration?.min ? schema.cacheDuration.min / 3600 : 1}
                  max={schema.cacheDuration?.max ? schema.cacheDuration.max / 3600 : 168}
                  value={settings.cacheDuration / 3600}
                  onChange={(e) => updateSetting('cacheDuration', parseInt(e.target.value) * 3600)}
                />
                <p className="text-xs text-gray-500 mt-1">{schema.cacheDuration?.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {[
                'deleteConfirmation',
                'showHiddenFiles',
                'enableCompression',
                'duplicateDetection'
              ].map((key) => (
                <div key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    id={key}
                    checked={settings[key as keyof UserSettings] as boolean}
                    onChange={(e) => updateSetting(key as keyof UserSettings, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={key} className="ml-2 block text-sm text-gray-900">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </label>
                </div>
              ))}
            </div>
          </Card>

          {/* Advanced Settings */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Advanced</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Storage Alert Threshold (%)
                </label>
                <Input
                  type="number"
                  min={schema.storageAlertThreshold?.min}
                  max={schema.storageAlertThreshold?.max}
                  value={settings.storageAlertThreshold}
                  onChange={(e) => updateSetting('storageAlertThreshold', parseInt(e.target.value))}
                />
                <p className="text-xs text-gray-500 mt-1">{schema.storageAlertThreshold?.description}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Log Level
                </label>
                <select
                  value={settings.logLevel}
                  onChange={(e) => updateSetting('logLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {schema.logLevel?.options.map((option) => (
                    <option key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">{schema.logLevel?.description}</p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="debugMode"
                  checked={settings.debugMode}
                  onChange={(e) => updateSetting('debugMode', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="debugMode" className="ml-2 block text-sm text-gray-900">
                  Debug Mode
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">{schema.debugMode?.description}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
