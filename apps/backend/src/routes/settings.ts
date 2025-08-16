import { Router, Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import { settingsService } from "../services/settings";

const router = Router();

// Get user settings
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const settings = await settingsService.getUserSettings(userId);

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Error getting user settings:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Update user settings
router.put("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const updates = req.body;

    // Validate settings
    const validatedUpdates = validateSettings(updates);

    // Update settings using service
    const updatedSettings = await settingsService.updateUserSettings(
      userId,
      validatedUpdates
    );

    res.json({
      success: true,
      data: updatedSettings,
    });
  } catch (error) {
    console.error("Error updating user settings:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Reset settings to defaults
router.post(
  "/reset",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      // Reset settings using service
      const defaultSettings = await settingsService.resetUserSettings(userId);

      res.json({
        success: true,
        data: defaultSettings,
      });
    } catch (error) {
      console.error("Error resetting user settings:", error);
      res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  }
);

// Get settings schema (for frontend form generation)
router.get("/schema", async (req: Request, res: Response) => {
  try {
    const schema = {
      transfer: {
        title: "Transfer Settings",
        fields: {
          maxConcurrentUploads: {
            label: "Max Concurrent Uploads",
            type: "number",
            min: 1,
            max: 50,
            default: 3,
            description:
              "Maximum number of files that can be uploaded simultaneously",
          },
          maxConcurrentDownloads: {
            label: "Max Concurrent Downloads",
            type: "number",
            min: 1,
            max: 20,
            default: 5,
            description:
              "Maximum number of files that can be downloaded simultaneously",
          },
          chunkSize: {
            label: "Chunk Size (MB)",
            type: "number",
            min: 1,
            max: 100,
            default: 25,
            description: "Size of each chunk when uploading large files",
          },
          retryAttempts: {
            label: "Retry Attempts",
            type: "number",
            min: 1,
            max: 10,
            default: 3,
            description: "Number of times to retry failed transfers",
          },
          timeoutDuration: {
            label: "Timeout Duration (seconds)",
            type: "number",
            min: 10,
            max: 300,
            default: 30,
            description: "How long to wait before timing out a transfer",
          },
        },
      },
      ui: {
        title: "Interface Settings",
        fields: {
          showTransferNotifications: {
            label: "Show Transfer Notifications",
            type: "boolean",
            default: false,
            description: "Show popup notifications when transfers complete",
          },
          autoCloseCompletedTransfers: {
            label: "Auto-close Completed Transfers",
            type: "boolean",
            default: true,
            description: "Automatically hide completed transfers from the list",
          },
          defaultView: {
            label: "Default View",
            type: "select",
            options: [
              { value: "grid", label: "Grid View" },
              { value: "list", label: "List View" },
            ],
            default: "list",
            description: "Default view mode for file listings",
          },
          theme: {
            label: "Theme",
            type: "select",
            options: [
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
              { value: "auto", label: "Auto (System)" },
            ],
            default: "auto",
            description: "Application theme preference",
          },
          compactMode: {
            label: "Compact Mode",
            type: "boolean",
            default: false,
            description: "Use smaller spacing and controls",
          },
        },
      },
      files: {
        title: "File Management",
        fields: {
          autoGenerateThumbnails: {
            label: "Auto-generate Thumbnails",
            type: "boolean",
            default: true,
            description: "Automatically create thumbnails for video files",
          },
          thumbnailQuality: {
            label: "Thumbnail Quality",
            type: "number",
            min: 50,
            max: 100,
            default: 85,
            description:
              "Quality of generated thumbnails (higher = better quality, larger size)",
          },
          deleteConfirmation: {
            label: "Delete Confirmation",
            type: "boolean",
            default: true,
            description: "Show confirmation dialog before deleting files",
          },
          showHiddenFiles: {
            label: "Show Hidden Files",
            type: "boolean",
            default: false,
            description: "Display hidden files in file listings",
          },
        },
      },
      storage: {
        title: "Storage Settings",
        fields: {
          autoCleanupFailedUploads: {
            label: "Auto-cleanup Failed Uploads",
            type: "boolean",
            default: true,
            description: "Automatically remove failed upload records",
          },
          maxStorageAlertThreshold: {
            label: "Storage Alert Threshold (%)",
            type: "number",
            min: 50,
            max: 100,
            default: 90,
            description:
              "Show warning when storage usage exceeds this percentage",
          },
          compressionEnabled: {
            label: "Enable Compression",
            type: "boolean",
            default: false,
            description: "Compress files before uploading (may reduce quality)",
          },
          duplicateDetection: {
            label: "Duplicate Detection",
            type: "boolean",
            default: true,
            description: "Detect and prevent uploading duplicate files",
          },
        },
      },
      privacy: {
        title: "Privacy & Sharing",
        fields: {
          defaultShareExpiry: {
            label: "Default Share Expiry (hours)",
            type: "number",
            min: 1,
            max: 8760,
            default: 168,
            description: "Default expiration time for shared links",
          },
          allowPublicSharing: {
            label: "Allow Public Sharing",
            type: "boolean",
            default: true,
            description: "Allow creating public share links",
          },
          sharePasswordRequired: {
            label: "Require Password for Shares",
            type: "boolean",
            default: false,
            description: "Always require a password for shared links",
          },
        },
      },
      advanced: {
        title: "Advanced Settings",
        fields: {
          enableDebugMode: {
            label: "Enable Debug Mode",
            type: "boolean",
            default: false,
            description:
              "Show detailed debug information (for troubleshooting)",
          },
          logLevel: {
            label: "Log Level",
            type: "select",
            options: [
              { value: "error", label: "Error" },
              { value: "warn", label: "Warning" },
              { value: "info", label: "Info" },
              { value: "debug", label: "Debug" },
            ],
            default: "info",
            description: "Level of detail for logging",
          },
          cacheDuration: {
            label: "Cache Duration (seconds)",
            type: "number",
            min: 300,
            max: 86400,
            default: 3600,
            description: "How long to cache data locally",
          },
        },
      },
    };

    res.json({
      success: true,
      data: schema,
    });
  } catch (error) {
    console.error("Error getting settings schema:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Validation function for settings
function validateSettings(settings: any): any {
  const validated: any = {};

  // Transfer settings
  if (settings.maxConcurrentUploads !== undefined) {
    validated.maxConcurrentUploads = Math.max(
      1,
      Math.min(50, parseInt(settings.maxConcurrentUploads))
    );
  }
  if (settings.maxConcurrentDownloads !== undefined) {
    validated.maxConcurrentDownloads = Math.max(
      1,
      Math.min(20, parseInt(settings.maxConcurrentDownloads))
    );
  }
  if (settings.chunkSize !== undefined) {
    validated.chunkSize = Math.max(
      1,
      Math.min(100, parseInt(settings.chunkSize))
    );
  }
  if (settings.retryAttempts !== undefined) {
    validated.retryAttempts = Math.max(
      1,
      Math.min(10, parseInt(settings.retryAttempts))
    );
  }
  if (settings.timeoutDuration !== undefined) {
    validated.timeoutDuration = Math.max(
      10,
      Math.min(300, parseInt(settings.timeoutDuration))
    );
  }

  // UI settings
  if (settings.showTransferNotifications !== undefined) {
    validated.showTransferNotifications = Boolean(
      settings.showTransferNotifications
    );
  }
  if (settings.autoCloseCompletedTransfers !== undefined) {
    validated.autoCloseCompletedTransfers = Boolean(
      settings.autoCloseCompletedTransfers
    );
  }
  if (settings.defaultView !== undefined) {
    validated.defaultView = ["grid", "list"].includes(settings.defaultView)
      ? settings.defaultView
      : "list";
  }
  if (settings.theme !== undefined) {
    validated.theme = ["light", "dark", "auto"].includes(settings.theme)
      ? settings.theme
      : "auto";
  }
  if (settings.compactMode !== undefined) {
    validated.compactMode = Boolean(settings.compactMode);
  }

  // File management settings
  if (settings.autoGenerateThumbnails !== undefined) {
    validated.autoGenerateThumbnails = Boolean(settings.autoGenerateThumbnails);
  }
  if (settings.thumbnailQuality !== undefined) {
    validated.thumbnailQuality = Math.max(
      50,
      Math.min(100, parseInt(settings.thumbnailQuality))
    );
  }
  if (settings.deleteConfirmation !== undefined) {
    validated.deleteConfirmation = Boolean(settings.deleteConfirmation);
  }
  if (settings.showHiddenFiles !== undefined) {
    validated.showHiddenFiles = Boolean(settings.showHiddenFiles);
  }

  // Storage settings
  if (settings.autoCleanupFailedUploads !== undefined) {
    validated.autoCleanupFailedUploads = Boolean(
      settings.autoCleanupFailedUploads
    );
  }
  if (settings.maxStorageAlertThreshold !== undefined) {
    validated.maxStorageAlertThreshold = Math.max(
      50,
      Math.min(100, parseInt(settings.maxStorageAlertThreshold))
    );
  }
  if (settings.compressionEnabled !== undefined) {
    validated.compressionEnabled = Boolean(settings.compressionEnabled);
  }
  if (settings.duplicateDetection !== undefined) {
    validated.duplicateDetection = Boolean(settings.duplicateDetection);
  }

  // Privacy settings
  if (settings.defaultShareExpiry !== undefined) {
    validated.defaultShareExpiry = Math.max(
      1,
      Math.min(8760, parseInt(settings.defaultShareExpiry))
    );
  }
  if (settings.allowPublicSharing !== undefined) {
    validated.allowPublicSharing = Boolean(settings.allowPublicSharing);
  }
  if (settings.sharePasswordRequired !== undefined) {
    validated.sharePasswordRequired = Boolean(settings.sharePasswordRequired);
  }

  // Advanced settings
  if (settings.enableDebugMode !== undefined) {
    validated.enableDebugMode = Boolean(settings.enableDebugMode);
  }
  if (settings.logLevel !== undefined) {
    validated.logLevel = ["error", "warn", "info", "debug"].includes(
      settings.logLevel
    )
      ? settings.logLevel
      : "info";
  }
  if (settings.cacheDuration !== undefined) {
    validated.cacheDuration = Math.max(
      300,
      Math.min(86400, parseInt(settings.cacheDuration))
    );
  }

  return validated;
}

export default router;
