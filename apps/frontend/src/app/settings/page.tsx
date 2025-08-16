'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, RotateCcw, Zap, Shield, HardDrive, Eye, Settings as SettingsIcon } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'react-hot-toast';
import Header from '../../components/layout/Header';

interface UserSettings {
  // Transfer Settings
  maxConcurrentUploads: number;
  maxConcurrentDownloads: number;
  chunkSize: number;
  retryAttempts: number;
  timeoutDuration: number;

  // UI/UX Settings
  showTransferNotifications: boolean;
  autoCloseCompletedTransfers: boolean;
  defaultView: 'grid' | 'list';
  theme: 'light' | 'dark' | 'auto';
  compactMode: boolean;

  // File Management
  autoGenerateThumbnails: boolean;
  thumbnailQuality: number;
  deleteConfirmation: boolean;
  showHiddenFiles: boolean;

  // Storage
  autoCleanupFailedUploads: boolean;
  maxStorageAlertThreshold: number;
  compressionEnabled: boolean;
  duplicateDetection: boolean;

  // Privacy
  defaultShareExpiry: number;
  allowPublicSharing: boolean;
  sharePasswordRequired: boolean;

  // Advanced
  enableDebugMode: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  cacheDuration: number;
}

const defaultSettings: UserSettings = {
  // Transfer Settings
  maxConcurrentUploads: 3,
  maxConcurrentDownloads: 5,
  chunkSize: 25 * 1024 * 1024, // 25MB in bytes
  retryAttempts: 3,
  timeoutDuration: 30000, // 30 seconds in ms

  // UI/UX Settings
  showTransferNotifications: true,
  autoCloseCompletedTransfers: true,
  defaultView: 'list',
  theme: 'auto',
  compactMode: false,

  // File Management
  autoGenerateThumbnails: true,
  thumbnailQuality: 85,
  deleteConfirmation: true,
  showHiddenFiles: false,

  // Storage
  autoCleanupFailedUploads: true,
  maxStorageAlertThreshold: 90,
  compressionEnabled: false,
  duplicateDetection: true,

  // Privacy
  defaultShareExpiry: 168, // 7 days in hours
  allowPublicSharing: true,
  sharePasswordRequired: false,

  // Advanced
  enableDebugMode: false,
  logLevel: 'info',
  cacheDuration: 3600, // 1 hour in seconds
};

const SettingsSection = ({
  title,
  description,
  icon: Icon,
  children
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode
}) => (
  <Card className="p-6 settings-section">
    <div className="flex items-start gap-3 mb-6">
      <div className="bg-primary/10 p-2 rounded-lg">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
    {children}
  </Card>
);

const ToggleRow = ({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void
}) => (
  <div className="flex items-center justify-between py-3">
    <div>
      <label className="block text-sm font-medium text-gray-900">{label}</label>
      {description && <p className="text-xs text-gray-500">{description}</p>}
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
    </label>
  </div>
);

const SliderRow = ({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}: {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void
}) => (
  <div className="py-3">
    <div className="flex items-center justify-between mb-2">
      <label className="block text-sm font-medium text-gray-900">{label}</label>
      <span className="text-sm text-blue-600 font-medium">{value}{unit}</span>
    </div>
    {description && <p className="text-xs text-gray-500 mb-3">{description}</p>}
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
    />
    <div className="flex justify-between text-xs text-muted-foreground mt-1">
      <span>{min}{unit}</span>
      <span>{max}{unit}</span>
    </div>
  </div>
);

interface Folder {
  discordForumId: string;
  name: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState<UserSettings>(defaultSettings);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [defaultStashFolderId, setDefaultStashFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
    loadFolders();
    loadDefaultStashFolder();
  }, []);

  const loadSettings = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";
      const response = await fetch(`${apiUrl}/settings`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSettings({ ...defaultSettings, ...data.data });
          setOriginalSettings({ ...defaultSettings, ...data.data });
        }
      } else {
        console.log('No existing settings found, using defaults');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings. Using defaults.');
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";
      const response = await fetch(`${apiUrl}/folders`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setFolders(data);
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
      toast.error('Failed to load your folders.');
    }
  };

  const loadDefaultStashFolder = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";
      const response = await fetch(`${apiUrl}/stash/settings/default-folder`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setDefaultStashFolderId(data.defaultStashFolderId);
      }
    } catch (error) {
      console.error('Failed to load default stash folder:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";
      const response = await fetch(`${apiUrl}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOriginalSettings(settings);
          toast.success('Settings saved successfully');
        } else {
          throw new Error('Failed to save settings');
        }
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
    toast.success('Settings reset to last saved values');
  };

  const resetToDefaults = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";
      const response = await fetch(`${apiUrl}/settings/reset`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSettings({ ...defaultSettings, ...data.data });
          setOriginalSettings({ ...defaultSettings, ...data.data });
          toast.success('Settings reset to defaults');
        } else {
          // Fallback to local defaults
          setSettings(defaultSettings);
          toast.success('Settings reset to defaults');
        }
      } else {
        // Fallback to local defaults
        setSettings(defaultSettings);
        toast.success('Settings reset to defaults');
      }
    } catch (error) {
      console.error('Failed to reset settings:', error);
      // Fallback to local defaults
      setSettings(defaultSettings);
      toast.success('Settings reset to defaults');
    }
  };

  const handleDefaultFolderChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFolderId = e.target.value || null;
    setDefaultStashFolderId(newFolderId);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";
      const response = await fetch(`${apiUrl}/stash/settings/default-folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ folderId: newFolderId }),
      });

      if (response.ok) {
        toast.success('Default stash folder updated!');
      } else {
        throw new Error('Failed to update default folder');
      }
    } catch (error) {
      console.error('Failed to save default stash folder:', error);
      toast.error('Failed to save setting. Please try again.');
      // Revert on failure
      loadDefaultStashFolder();
    }
  };

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  if (loading) {
    return (
      <div className="min-h-screen bg-background theme-transition">
        <Header />
        <div className="max-w-4xl mx-auto p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background theme-transition">
      <Header />
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/stash')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600">Customize your Stashcord experience</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
            <Button
              variant="outline"
              onClick={resetToDefaults}
              disabled={saving}
            >
              Reset to Defaults
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Transfer Settings */}
          <SettingsSection
            title="Transfer & Performance"
            description="Configure upload/download behavior and performance settings"
            icon={Zap}
          >
            <div className="space-y-4">
              <SliderRow
                label="Max Concurrent Uploads"
                description="Number of files that can be uploaded simultaneously"
                value={settings.maxConcurrentUploads}
                min={1}
                max={10}
                onChange={(value) => updateSetting('maxConcurrentUploads', value)}
              />
              <SliderRow
                label="Max Concurrent Downloads"
                description="Number of files that can be downloaded simultaneously"
                value={settings.maxConcurrentDownloads}
                min={1}
                max={10}
                onChange={(value) => updateSetting('maxConcurrentDownloads', value)}
              />
              <SliderRow
                label="Chunk Size"
                description="Size of each file chunk sent to Discord (larger = faster but more memory)"
                value={Math.round(settings.chunkSize / (1024 * 1024))}
                min={1}
                max={25}
                unit="MB"
                onChange={(value) => updateSetting('chunkSize', value * 1024 * 1024)}
              />
              <SliderRow
                label="Retry Attempts"
                description="Number of times to retry failed transfers"
                value={settings.retryAttempts}
                min={1}
                max={10}
                onChange={(value) => updateSetting('retryAttempts', value)}
              />
              <div className="py-3">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Timeout Duration (seconds)
                </label>
                <Input
                  type="number"
                  value={Math.round(settings.timeoutDuration / 1000)}
                  onChange={(e) => updateSetting('timeoutDuration', parseInt(e.target.value) * 1000 || 30000)}
                  min={10}
                  max={300}
                  className="w-32"
                />
                <p className="text-xs text-gray-500 mt-1">Maximum time to wait for transfer operations</p>
              </div>
            </div>
          </SettingsSection>

          {/* Interface Settings */}
          <SettingsSection
            title="Interface & Experience"
            description="Customize the look and feel of your interface"
            icon={Eye}
          >
            <div className="space-y-4">
              <ToggleRow
                label="Transfer Notifications"
                description="Show notifications when transfers complete"
                checked={settings.showTransferNotifications}
                onChange={(checked) => updateSetting('showTransferNotifications', checked)}
              />
              <ToggleRow
                label="Auto-close Completed Transfers"
                description="Automatically hide completed transfer items"
                checked={settings.autoCloseCompletedTransfers}
                onChange={(checked) => updateSetting('autoCloseCompletedTransfers', checked)}
              />
              <ToggleRow
                label="Compact Mode"
                description="Use smaller interface elements to fit more content"
                checked={settings.compactMode}
                onChange={(checked) => updateSetting('compactMode', checked)}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Default View</label>
                  <select
                    value={settings.defaultView}
                    onChange={(e) => updateSetting('defaultView', e.target.value as 'grid' | 'list')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="list">List View</option>
                    <option value="grid">Grid View</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Theme</label>
                  <select
                    value={settings.theme}
                    onChange={(e) => updateSetting('theme', e.target.value as 'light' | 'dark' | 'auto')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="auto">Auto (System)</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
              </div>
            </div>
          </SettingsSection>

          {/* Stash It Settings */}
          <SettingsSection
            title="Stash It Feature"
            description="Settings for the &apos;Stash It&apos; Discord context menu feature"
            icon={Zap}
          >
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Default Stash Folder</label>
              <p className="text-xs text-gray-500 mb-3">
                Choose a default folder where files will be saved when you use the &apos;Stash It&apos; command in Discord.
              </p>
              <select
                value={defaultStashFolderId || ''}
                onChange={handleDefaultFolderChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- No Default --</option>
                {folders.map(folder => (
                  <option key={folder.discordForumId} value={folder.discordForumId}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
          </SettingsSection>

          {/* File Management */}
          <SettingsSection
            title="File Management"
            description="Configure how files are handled and displayed"
            icon={HardDrive}
          >
            <div className="space-y-4">
              <ToggleRow
                label="Auto-generate Thumbnails"
                description="Automatically create thumbnails for images and videos"
                checked={settings.autoGenerateThumbnails}
                onChange={(checked) => updateSetting('autoGenerateThumbnails', checked)}
              />
              <ToggleRow
                label="Delete Confirmation"
                description="Show confirmation dialog before deleting files"
                checked={settings.deleteConfirmation}
                onChange={(checked) => updateSetting('deleteConfirmation', checked)}
              />
              <ToggleRow
                label="Show Hidden Files"
                description="Display files that start with a dot (.)"
                checked={settings.showHiddenFiles}
                onChange={(checked) => updateSetting('showHiddenFiles', checked)}
              />

              <SliderRow
                label="Thumbnail Quality"
                description="Quality of generated thumbnails (higher = better quality but larger size)"
                value={settings.thumbnailQuality}
                min={50}
                max={100}
                step={5}
                unit="%"
                onChange={(value) => updateSetting('thumbnailQuality', value)}
              />
            </div>
          </SettingsSection>

          {/* Storage Settings */}
          <SettingsSection
            title="Storage & Optimization"
            description="Manage storage usage and optimization features"
            icon={HardDrive}
          >
            <div className="space-y-4">
              <ToggleRow
                label="Auto-cleanup Failed Uploads"
                description="Automatically remove incomplete upload data"
                checked={settings.autoCleanupFailedUploads}
                onChange={(checked) => updateSetting('autoCleanupFailedUploads', checked)}
              />
              <ToggleRow
                label="Enable Compression"
                description="Compress files before uploading to save space"
                checked={settings.compressionEnabled}
                onChange={(checked) => updateSetting('compressionEnabled', checked)}
              />
              <ToggleRow
                label="Duplicate Detection"
                description="Detect and prevent uploading duplicate files"
                checked={settings.duplicateDetection}
                onChange={(checked) => updateSetting('duplicateDetection', checked)}
              />

              <SliderRow
                label="Storage Alert Threshold"
                description="Show warning when storage usage exceeds this percentage"
                value={settings.maxStorageAlertThreshold}
                min={50}
                max={100}
                step={5}
                unit="%"
                onChange={(value) => updateSetting('maxStorageAlertThreshold', value)}
              />
            </div>
          </SettingsSection>

          {/* Privacy Settings */}
          <SettingsSection
            title="Privacy & Sharing"
            description="Control how your files can be shared and accessed"
            icon={Shield}
          >
            <div className="space-y-4">
              <ToggleRow
                label="Allow Public Sharing"
                description="Enable creating public links to share files"
                checked={settings.allowPublicSharing}
                onChange={(checked) => updateSetting('allowPublicSharing', checked)}
              />
              <ToggleRow
                label="Require Password for Shares"
                description="Force password protection on all shared files"
                checked={settings.sharePasswordRequired}
                onChange={(checked) => updateSetting('sharePasswordRequired', checked)}
              />

              <div className="py-3">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Default Share Expiry (hours)
                </label>
                <Input
                  type="number"
                  value={settings.defaultShareExpiry}
                  onChange={(e) => updateSetting('defaultShareExpiry', parseInt(e.target.value) || 168)}
                  min={1}
                  max={8760}
                  className="w-32"
                />
                <p className="text-xs text-gray-500 mt-1">How long shared links remain valid (1-8760 hours)</p>
              </div>
            </div>
          </SettingsSection>

          {/* Advanced Settings */}
          <SettingsSection
            title="Advanced Settings"
            description="Developer and power user options"
            icon={SettingsIcon}
          >
            <div className="space-y-4">
              <ToggleRow
                label="Enable Debug Mode"
                description="Show detailed debugging information and logs"
                checked={settings.enableDebugMode}
                onChange={(checked) => updateSetting('enableDebugMode', checked)}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Log Level</label>
                  <select
                    value={settings.logLevel}
                    onChange={(e) => updateSetting('logLevel', e.target.value as 'error' | 'warn' | 'info' | 'debug')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="error">Error</option>
                    <option value="warn">Warning</option>
                    <option value="info">Info</option>
                    <option value="debug">Debug</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Minimum level for console logs</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Cache Duration (seconds)
                  </label>
                  <Input
                    type="number"
                    value={settings.cacheDuration}
                    onChange={(e) => updateSetting('cacheDuration', parseInt(e.target.value) || 3600)}
                    min={60}
                    max={86400}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">How long to cache API responses</p>
                </div>
              </div>
            </div>
          </SettingsSection>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">
              Settings are saved automatically and applied to your account.
            </p>
            {hasChanges && (
              <p className="text-sm text-amber-600 font-medium">
                You have unsaved changes. Click &quot;Save Changes&quot; to apply them.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Custom CSS for slider styling */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}
