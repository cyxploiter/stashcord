"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface UserSettings {
     // Transfer settings
     maxConcurrentUploads: number;
     maxConcurrentDownloads: number;
     chunkSize: number;
     retryAttempts: number;
     timeoutDuration: number;

     // UI settings
     showTransferNotifications: boolean;
     autoCloseCompletedTransfers: boolean;
     defaultView: "grid" | "list";
     theme: "light" | "dark" | "auto";
     compactMode: boolean;

     // File management
     autoGenerateThumbnails: boolean;
     thumbnailQuality: number;
     deleteConfirmation: boolean;
     showHiddenFiles: boolean;

     // Storage settings
     autoCleanupFailedUploads: boolean;
     maxStorageAlertThreshold: number;
     compressionEnabled: boolean;
     duplicateDetection: boolean;

     // Privacy & sharing
     defaultShareExpiry: number;
     allowPublicSharing: boolean;
     sharePasswordRequired: boolean;

     // Advanced settings
     enableDebugMode: boolean;
     logLevel: "error" | "warn" | "info" | "debug";
     cacheDuration: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
     // Transfer settings
     maxConcurrentUploads: 3,
     maxConcurrentDownloads: 5,
     chunkSize: 25,
     retryAttempts: 3,
     timeoutDuration: 30,

     // UI settings
     showTransferNotifications: false,
     autoCloseCompletedTransfers: true,
     defaultView: "list",
     theme: "light",
     compactMode: false,

     // File management
     autoGenerateThumbnails: true,
     thumbnailQuality: 85,
     deleteConfirmation: true,
     showHiddenFiles: false,

     // Storage settings
     autoCleanupFailedUploads: true,
     maxStorageAlertThreshold: 90,
     compressionEnabled: false,
     duplicateDetection: true,

     // Privacy & sharing
     defaultShareExpiry: 168, // 7 days in hours
     allowPublicSharing: true,
     sharePasswordRequired: false,

     // Advanced settings
     enableDebugMode: false,
     logLevel: "info",
     cacheDuration: 3600, // 1 hour in seconds
};

interface SettingsContextType {
     settings: UserSettings;
     loading: boolean;
     error: string | null;
     updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
     resetSettings: () => Promise<void>;
     refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function useSettings() {
     const context = useContext(SettingsContext);
     if (context === undefined) {
          throw new Error("useSettings must be used within a SettingsProvider");
     }
     return context;
}

interface SettingsProviderProps {
     children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
     const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState<string | null>(null);

     const fetchSettings = async () => {
          try {
               setLoading(true);
               setError(null);

               const response = await fetch("http://localhost:3001/api/settings", {
                    credentials: "include",
                    headers: {
                         "Content-Type": "application/json",
                    },
               });

               if (!response.ok) {
                    throw new Error(`Failed to fetch settings: ${response.statusText}`);
               }

               const data = await response.json();
               if (data.success && data.data) {
                    setSettings({ ...DEFAULT_SETTINGS, ...data.data });
               } else {
                    throw new Error("Invalid settings response format");
               }
          } catch (err) {
               console.error("Error fetching settings:", err);
               setError(err instanceof Error ? err.message : "Failed to fetch settings");
               // Use default settings on error
               setSettings(DEFAULT_SETTINGS);
          } finally {
               setLoading(false);
          }
     };

     const updateSettings = async (updates: Partial<UserSettings>) => {
          try {
               setError(null);

               const response = await fetch("http://localhost:3001/api/settings", {
                    method: "PUT",
                    credentials: "include",
                    headers: {
                         "Content-Type": "application/json",
                    },
                    body: JSON.stringify(updates),
               });

               if (!response.ok) {
                    throw new Error(`Failed to update settings: ${response.statusText}`);
               }

               const data = await response.json();
               if (data.success && data.data) {
                    setSettings({ ...DEFAULT_SETTINGS, ...data.data });
               } else {
                    throw new Error("Invalid update response format");
               }
          } catch (err) {
               console.error("Error updating settings:", err);
               setError(err instanceof Error ? err.message : "Failed to update settings");
               throw err;
          }
     };

     const resetSettings = async () => {
          try {
               setError(null);

               const response = await fetch("http://localhost:3001/api/settings/reset", {
                    method: "POST",
                    credentials: "include",
                    headers: {
                         "Content-Type": "application/json",
                    },
               });

               if (!response.ok) {
                    throw new Error(`Failed to reset settings: ${response.statusText}`);
               }

               const data = await response.json();
               if (data.success && data.data) {
                    setSettings({ ...DEFAULT_SETTINGS, ...data.data });
               } else {
                    throw new Error("Invalid reset response format");
               }
          } catch (err) {
               console.error("Error resetting settings:", err);
               setError(err instanceof Error ? err.message : "Failed to reset settings");
               throw err;
          }
     };

     const refreshSettings = () => fetchSettings();

     // Fetch settings on mount
     useEffect(() => {
          fetchSettings();
     }, []);

     // Apply theme changes to document
     useEffect(() => {
          const applyTheme = () => {
               const root = document.documentElement;
               const body = document.body;

               // Add transition class for smooth theme switching
               body.classList.add('theme-transition');

               if (settings.theme === "auto") {
                    // Use system preference
                    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                    root.classList.toggle("dark", isDark);
               } else {
                    // Use explicit theme setting
                    root.classList.toggle("dark", settings.theme === "dark");
               }

               // Add data attribute for CSS targeting
               root.setAttribute('data-theme', settings.theme);

               // Remove transition class after animation completes
               setTimeout(() => {
                    body.classList.remove('theme-transition');
               }, 300);
          };

          applyTheme();

          // Listen for system theme changes if auto theme is selected
          if (settings.theme === "auto") {
               const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
               mediaQuery.addEventListener("change", applyTheme);

               return () => {
                    mediaQuery.removeEventListener("change", applyTheme);
               };
          }
     }, [settings.theme]);

     // Apply compact mode to document
     useEffect(() => {
          document.documentElement.classList.toggle("compact", settings.compactMode);
     }, [settings.compactMode]);

     const value: SettingsContextType = {
          settings,
          loading,
          error,
          updateSettings,
          resetSettings,
          refreshSettings,
     };

     return (
          <SettingsContext.Provider value={value}>
               {children}
          </SettingsContext.Provider>
     );
}

// Utility hooks for specific settings
export function useTheme() {
     const { settings, updateSettings } = useSettings();
     return {
          theme: settings.theme,
          setTheme: (theme: "light" | "dark" | "auto") => updateSettings({ theme }),
     };
}

export function useViewMode() {
     const { settings, updateSettings } = useSettings();
     return {
          viewMode: settings.defaultView,
          setViewMode: (defaultView: "grid" | "list") => updateSettings({ defaultView }),
     };
}

export function useTransferSettings() {
     const { settings } = useSettings();
     return {
          maxConcurrentUploads: settings.maxConcurrentUploads,
          maxConcurrentDownloads: settings.maxConcurrentDownloads,
          chunkSize: settings.chunkSize,
          retryAttempts: settings.retryAttempts,
          timeoutDuration: settings.timeoutDuration,
     };
}

export function useFileManagementSettings() {
     const { settings } = useSettings();
     return {
          autoGenerateThumbnails: settings.autoGenerateThumbnails,
          thumbnailQuality: settings.thumbnailQuality,
          deleteConfirmation: settings.deleteConfirmation,
          showHiddenFiles: settings.showHiddenFiles,
     };
}

export function usePrivacySettings() {
     const { settings } = useSettings();
     return {
          defaultShareExpiry: settings.defaultShareExpiry,
          allowPublicSharing: settings.allowPublicSharing,
          sharePasswordRequired: settings.sharePasswordRequired,
     };
}

export function useAdvancedSettings() {
     const { settings } = useSettings();
     return {
          enableDebugMode: settings.enableDebugMode,
          logLevel: settings.logLevel,
          cacheDuration: settings.cacheDuration,
     };
}
