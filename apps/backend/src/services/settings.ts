import { db } from "../db";
import { userSettings } from "../db/schema";
import { eq } from "drizzle-orm";

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
  theme: "auto",
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

class SettingsService {
  private settingsCache = new Map<
    string,
    { settings: UserSettings; timestamp: number }
  >();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Convert database settings to UserSettings type
   */
  private convertDbToUserSettings(dbSettings: any): UserSettings {
    return {
      maxConcurrentUploads:
        dbSettings.maxConcurrentUploads ??
        DEFAULT_SETTINGS.maxConcurrentUploads,
      maxConcurrentDownloads:
        dbSettings.maxConcurrentDownloads ??
        DEFAULT_SETTINGS.maxConcurrentDownloads,
      chunkSize: dbSettings.chunkSize ?? DEFAULT_SETTINGS.chunkSize,
      retryAttempts: dbSettings.retryAttempts ?? DEFAULT_SETTINGS.retryAttempts,
      timeoutDuration:
        dbSettings.timeoutDuration ?? DEFAULT_SETTINGS.timeoutDuration,
      showTransferNotifications:
        dbSettings.showTransferNotifications ??
        DEFAULT_SETTINGS.showTransferNotifications,
      autoCloseCompletedTransfers:
        dbSettings.autoCloseCompletedTransfers ??
        DEFAULT_SETTINGS.autoCloseCompletedTransfers,
      defaultView:
        (dbSettings.defaultView as "grid" | "list") ??
        DEFAULT_SETTINGS.defaultView,
      theme:
        (dbSettings.theme as "light" | "dark" | "auto") ??
        DEFAULT_SETTINGS.theme,
      compactMode: dbSettings.compactMode ?? DEFAULT_SETTINGS.compactMode,
      autoGenerateThumbnails:
        dbSettings.autoGenerateThumbnails ??
        DEFAULT_SETTINGS.autoGenerateThumbnails,
      thumbnailQuality:
        dbSettings.thumbnailQuality ?? DEFAULT_SETTINGS.thumbnailQuality,
      deleteConfirmation:
        dbSettings.deleteConfirmation ?? DEFAULT_SETTINGS.deleteConfirmation,
      showHiddenFiles:
        dbSettings.showHiddenFiles ?? DEFAULT_SETTINGS.showHiddenFiles,
      autoCleanupFailedUploads:
        dbSettings.autoCleanupFailedUploads ??
        DEFAULT_SETTINGS.autoCleanupFailedUploads,
      maxStorageAlertThreshold:
        dbSettings.maxStorageAlertThreshold ??
        DEFAULT_SETTINGS.maxStorageAlertThreshold,
      compressionEnabled:
        dbSettings.compressionEnabled ?? DEFAULT_SETTINGS.compressionEnabled,
      duplicateDetection:
        dbSettings.duplicateDetection ?? DEFAULT_SETTINGS.duplicateDetection,
      defaultShareExpiry:
        dbSettings.defaultShareExpiry ?? DEFAULT_SETTINGS.defaultShareExpiry,
      allowPublicSharing:
        dbSettings.allowPublicSharing ?? DEFAULT_SETTINGS.allowPublicSharing,
      sharePasswordRequired:
        dbSettings.sharePasswordRequired ??
        DEFAULT_SETTINGS.sharePasswordRequired,
      enableDebugMode:
        dbSettings.enableDebugMode ?? DEFAULT_SETTINGS.enableDebugMode,
      logLevel:
        (dbSettings.logLevel as "error" | "warn" | "info" | "debug") ??
        DEFAULT_SETTINGS.logLevel,
      cacheDuration: dbSettings.cacheDuration ?? DEFAULT_SETTINGS.cacheDuration,
    };
  }

  /**
   * Get user settings with caching
   */
  async getUserSettings(userId: string): Promise<UserSettings> {
    // Check cache first
    const cached = this.settingsCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.settings;
    }

    try {
      let settings = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .get();

      // Create default settings if they don't exist
      if (!settings) {
        settings = await db
          .insert(userSettings)
          .values({
            userId,
            ...DEFAULT_SETTINGS,
          })
          .returning()
          .get();
      }

      // Merge with defaults to ensure all properties exist
      const mergedSettings = this.convertDbToUserSettings(settings);

      // Cache the settings
      this.settingsCache.set(userId, {
        settings: mergedSettings,
        timestamp: Date.now(),
      });

      return mergedSettings;
    } catch (error) {
      console.error("Error getting user settings:", error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Update user settings and clear cache
   */
  async updateUserSettings(
    userId: string,
    updates: Partial<UserSettings>
  ): Promise<UserSettings> {
    try {
      // Get current settings
      const currentSettings = await this.getUserSettings(userId);

      // Merge updates
      const newSettings = { ...currentSettings, ...updates };

      // Update in database
      const updatedSettings = await db
        .update(userSettings)
        .set({
          ...newSettings,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, userId))
        .returning()
        .get();

      // Clear cache
      this.settingsCache.delete(userId);

      return this.convertDbToUserSettings(updatedSettings);
    } catch (error) {
      console.error("Error updating user settings:", error);
      throw error;
    }
  }

  /**
   * Reset user settings to defaults
   */
  async resetUserSettings(userId: string): Promise<UserSettings> {
    try {
      const resetSettings = await db
        .update(userSettings)
        .set({
          ...DEFAULT_SETTINGS,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, userId))
        .returning()
        .get();

      // Clear cache
      this.settingsCache.delete(userId);

      return this.convertDbToUserSettings(resetSettings);
    } catch (error) {
      console.error("Error resetting user settings:", error);
      throw error;
    }
  }

  /**
   * Clear cache for a specific user
   */
  clearUserCache(userId: string): void {
    this.settingsCache.delete(userId);
  }

  /**
   * Clear all cached settings
   */
  clearAllCache(): void {
    this.settingsCache.clear();
  }

  /**
   * Get chunk size in bytes based on user settings
   */
  async getChunkSizeBytes(userId: string): Promise<number> {
    const settings = await this.getUserSettings(userId);
    return Math.min(settings.chunkSize * 1024 * 1024, MAX_CHUNK_SIZE);
  }

  /**
   * Check if compression should be enabled for user
   */
  async shouldCompress(userId: string): Promise<boolean> {
    const settings = await this.getUserSettings(userId);
    return settings.compressionEnabled;
  }

  /**
   * Check if duplicate detection should be enabled
   */
  async shouldDetectDuplicates(userId: string): Promise<boolean> {
    const settings = await this.getUserSettings(userId);
    return settings.duplicateDetection;
  }

  /**
   * Get thumbnail quality for user
   */
  async getThumbnailQuality(userId: string): Promise<number> {
    const settings = await this.getUserSettings(userId);
    return settings.thumbnailQuality;
  }

  /**
   * Check if thumbnails should be auto-generated
   */
  async shouldGenerateThumbnails(userId: string): Promise<boolean> {
    const settings = await this.getUserSettings(userId);
    return settings.autoGenerateThumbnails;
  }

  /**
   * Get default share expiry in hours
   */
  async getDefaultShareExpiry(userId: string): Promise<number> {
    const settings = await this.getUserSettings(userId);
    return settings.defaultShareExpiry;
  }

  /**
   * Check if public sharing is allowed
   */
  async isPublicSharingAllowed(userId: string): Promise<boolean> {
    const settings = await this.getUserSettings(userId);
    return settings.allowPublicSharing;
  }

  /**
   * Check if password is required for shares
   */
  async isSharePasswordRequired(userId: string): Promise<boolean> {
    const settings = await this.getUserSettings(userId);
    return settings.sharePasswordRequired;
  }

  /**
   * Get retry attempts for transfers
   */
  async getRetryAttempts(userId: string): Promise<number> {
    const settings = await this.getUserSettings(userId);
    return settings.retryAttempts;
  }

  /**
   * Get timeout duration for transfers
   */
  async getTimeoutDuration(userId: string): Promise<number> {
    const settings = await this.getUserSettings(userId);
    return settings.timeoutDuration * 1000; // Convert to milliseconds
  }

  /**
   * Check if debug mode is enabled
   */
  async isDebugMode(userId: string): Promise<boolean> {
    const settings = await this.getUserSettings(userId);
    return settings.enableDebugMode;
  }

  /**
   * Get log level for user
   */
  async getLogLevel(userId: string): Promise<string> {
    const settings = await this.getUserSettings(userId);
    return settings.logLevel;
  }
}

// Singleton instance
export const settingsService = new SettingsService();

// Constants
const MAX_CHUNK_SIZE = 7 * 1024 * 1024; // 7MB (Discord limit)
