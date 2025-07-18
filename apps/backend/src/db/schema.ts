import { sql } from "drizzle-orm";
import {
  text,
  integer,
  sqliteTable,
  real,
  index,
} from "drizzle-orm/sqlite-core";

// =====================================
// CORE ENTITIES
// =====================================

// Users authenticated via Discord OAuth2
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(), // Discord User ID
    username: text("username").notNull(),
    globalName: text("global_name"), // Discord global display name
    avatar: text("avatar"),
    email: text("email"),
    verified: integer("verified", { mode: "boolean" }).default(false),

    // Discord OAuth tokens
    discordAccessToken: text("discord_access_token"),
    discordRefreshToken: text("discord_refresh_token"),
    discordTokenExpiry: integer("discord_token_expiry", { mode: "timestamp" }),

    // Session management
    currentSessionId: text("current_session_id"),
    sessionExpiresAt: integer("session_expires_at", { mode: "timestamp" }),

    // Guild/Server info
    hasStashcordGuild: integer("has_stashcord_guild", {
      mode: "boolean",
    }).default(false),
    stashcordGuildId: text("stashcord_guild_id"),
    lastGuildCheck: integer("last_guild_check", { mode: "timestamp" }),

    // User preferences
    defaultViewMode: text("default_view_mode", {
      enum: ["category", "explorer"],
    }).default("explorer"),
    storageQuotaUsed: integer("storage_quota_used").default(0), // in bytes
    storageQuotaLimit: integer("storage_quota_limit").default(16106127360), // 15GB default

    // Timestamps
    createdAt: integer("created_at", { mode: "timestamp" }).default(
      sql`(CURRENT_TIMESTAMP)`
    ),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(
      sql`(CURRENT_TIMESTAMP)`
    ),
    lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
  },
  (table) => ({
    usernameIdx: index("users_username_idx").on(table.username),
    guildIdx: index("users_guild_idx").on(table.stashcordGuildId),
  })
);

// File type definitions for normalization
export const fileTypes = sqliteTable("file_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(), // e.g., "document", "image", "video"
  displayName: text("display_name").notNull(), // e.g., "Document", "Image", "Video"
  mimeTypes: text("mime_types").notNull(), // JSON array of supported MIME types
  maxSize: integer("max_size"), // max file size for this type in bytes
  iconName: text("icon_name"), // Lucide icon name
  color: text("color"), // Tailwind color class

  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`
  ),
});

// Folders (Forums) - Maps to Discord forum channels
export const folders = sqliteTable(
  "folders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    slug: text("slug").notNull(), // URL-safe identifier
    description: text("description"),

    // Ownership
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Discord mapping - now maps to forum channels
    discordForumId: text("discord_forum_id").unique(), // Discord forum channel ID
    discordWebhookUrl: text("discord_webhook_url"), // Discord webhook for uploading larger files

    // Settings
    isArchived: integer("is_archived", { mode: "boolean" }).default(false),
    sortOrder: integer("sort_order").default(0),

    // Timestamps
    createdAt: integer("created_at", { mode: "timestamp" }).default(
      sql`(CURRENT_TIMESTAMP)`
    ),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(
      sql`(CURRENT_TIMESTAMP)`
    ),
  },
  (table) => ({
    ownerIdx: index("folders_owner_idx").on(table.ownerId),
    discordIdx: index("folders_discord_idx").on(table.discordForumId),
    slugIdx: index("folders_slug_idx").on(table.slug),
  })
);

// Files - Individual files stored in folders
export const files = sqliteTable(
  "files",
  {
    threadId: text("thread_id").primaryKey(), // Discord forum thread ID (primary key)
    name: text("name").notNull(),
    originalName: text("original_name").notNull(), // Original filename when uploaded
    slug: text("slug").notNull(), // URL-safe identifier

    // File metadata
    size: integer("size").notNull(), // File size in bytes
    mimeType: text("mime_type").notNull(),
    fileTypeId: integer("file_type_id").references(() => fileTypes.id),
    hash: text("hash"), // File hash for deduplication

    // Relationships
    folderId: integer("folder_id")
      .notNull()
      .references(() => folders.id, { onDelete: "cascade" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Discord mapping - forum thread information
    threadName: text("thread_name"), // Discord forum thread name

    // File status and metadata
    uploadStatus: text("upload_status", {
      enum: ["pending", "uploading", "completed", "failed", "deleted"],
    }).default("pending"),
    isStarred: integer("is_starred", { mode: "boolean" }).default(false),
    downloadCount: integer("download_count").default(0),

    // Optional thumbnail/preview
    thumbnailUrl: text("thumbnail_url"),
    previewUrl: text("preview_url"),

    // Sharing
    shareToken: text("share_token").unique(),
    shareExpiresAt: integer("share_expires_at", { mode: "timestamp" }),

    // Timestamps
    createdAt: integer("created_at", { mode: "timestamp" }).default(
      sql`(CURRENT_TIMESTAMP)`
    ),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(
      sql`(CURRENT_TIMESTAMP)`
    ),
    lastAccessedAt: integer("last_accessed_at", { mode: "timestamp" }),
  },
  (table) => ({
    folderIdx: index("files_folder_idx").on(table.folderId),
    ownerIdx: index("files_owner_idx").on(table.ownerId),
    typeIdx: index("files_type_idx").on(table.fileTypeId),
    hashIdx: index("files_hash_idx").on(table.hash),
    discordIdx: index("files_discord_idx").on(table.threadId),
    statusIdx: index("files_status_idx").on(table.uploadStatus),
    starredIdx: index("files_starred_idx").on(table.isStarred),
    shareTokenIdx: index("files_share_token_idx").on(table.shareToken),
  })
);

// File chunks - Maps to Discord messages with attachments
export const fileChunks = sqliteTable(
  "file_chunks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fileThreadId: text("file_thread_id")
      .notNull()
      .references(() => files.threadId, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(), // 0-based chunk order
    size: integer("size").notNull(), // Chunk size in bytes

    // Discord mapping
    discordMessageId: text("discord_message_id").notNull(),
    discordAttachmentId: text("discord_attachment_id").notNull(),
    cdnUrl: text("cdn_url").notNull(),

    // Chunk metadata
    checksum: text("checksum"), // Chunk checksum for integrity
    uploadedAt: integer("uploaded_at", { mode: "timestamp" }).default(
      sql`(CURRENT_TIMESTAMP)`
    ),
  },
  (table) => ({
    fileIdx: index("file_chunks_file_idx").on(table.fileThreadId),
    messageIdx: index("file_chunks_message_idx").on(table.discordMessageId),
    chunkOrderIdx: index("file_chunks_order_idx").on(
      table.fileThreadId,
      table.chunkIndex
    ),
  })
);

// =====================================
// PERMISSION SYSTEM
// =====================================

// Permission definitions
export const permissions = sqliteTable("permissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(), // e.g., "read", "write", "delete", "admin"
  displayName: text("display_name").notNull(),
  description: text("description"),

  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`
  ),
});

// Folder permissions - More granular permissions at folder level
export const folderPermissions = sqliteTable(
  "folder_permissions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    folderId: integer("folder_id")
      .notNull()
      .references(() => folders.id, { onDelete: "cascade" }),
    permissionId: integer("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),

    grantedBy: text("granted_by")
      .notNull()
      .references(() => users.id),
    grantedAt: integer("granted_at", { mode: "timestamp" }).default(
      sql`(CURRENT_TIMESTAMP)`
    ),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
  },
  (table) => ({
    userFolderIdx: index("folder_permissions_user_folder_idx").on(
      table.userId,
      table.folderId
    ),
    folderIdx: index("folder_permissions_folder_idx").on(table.folderId),
    userIdx: index("folder_permissions_user_idx").on(table.userId),
  })
);

// =====================================
// SHARING AND COLLABORATION
// =====================================

// Share links for files/folders
export const shareLinks = sqliteTable(
  "share_links",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    token: text("token").notNull().unique(), // UUID for public sharing

    // What's being shared
    resourceType: text("resource_type", {
      enum: ["file", "folder"],
    }).notNull(),
    resourceId: integer("resource_id").notNull(),

    // Share settings
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isPublic: integer("is_public", { mode: "boolean" }).default(false),
    requiresAuth: integer("requires_auth", { mode: "boolean" }).default(false),
    allowDownload: integer("allow_download", { mode: "boolean" }).default(true),

    // Access control
    accessCount: integer("access_count").default(0),
    maxAccess: integer("max_access"), // Null = unlimited
    password: text("password"), // Hashed password for protected shares

    // Timestamps
    createdAt: integer("created_at", { mode: "timestamp" }).default(
      sql`(CURRENT_TIMESTAMP)`
    ),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    lastAccessedAt: integer("last_accessed_at", { mode: "timestamp" }),
  },
  (table) => ({
    tokenIdx: index("share_links_token_idx").on(table.token),
    ownerIdx: index("share_links_owner_idx").on(table.ownerId),
    resourceIdx: index("share_links_resource_idx").on(
      table.resourceType,
      table.resourceId
    ),
  })
);

// =====================================
// ACTIVITY AND AUDIT LOGGING
// =====================================

// Audit log for all actions
export const auditLog = sqliteTable(
  "audit_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    // Who did what
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(), // e.g., "create", "update", "delete", "download"
    resourceType: text("resource_type").notNull(), // e.g., "file", "folder", "category"
    resourceId: integer("resource_id"), // ID of the affected resource

    // Context
    details: text("details"), // JSON object with additional details
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),

    // Timestamps
    createdAt: integer("created_at", { mode: "timestamp" }).default(
      sql`(CURRENT_TIMESTAMP)`
    ),
  },
  (table) => ({
    userIdx: index("audit_log_user_idx").on(table.userId),
    actionIdx: index("audit_log_action_idx").on(table.action),
    resourceIdx: index("audit_log_resource_idx").on(
      table.resourceType,
      table.resourceId
    ),
    dateIdx: index("audit_log_date_idx").on(table.createdAt),
  })
);

// User sessions for enhanced security
export const userSessions = sqliteTable(
  "user_sessions",
  {
    id: text("id").primaryKey(), // Session token
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Session metadata
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    isActive: integer("is_active", { mode: "boolean" }).default(true),

    // Timestamps
    createdAt: integer("created_at", { mode: "timestamp" }).default(
      sql`(CURRENT_TIMESTAMP)`
    ),
    lastActivityAt: integer("last_activity_at", { mode: "timestamp" }).default(
      sql`(CURRENT_TIMESTAMP)`
    ),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    userIdx: index("user_sessions_user_idx").on(table.userId),
    activeIdx: index("user_sessions_active_idx").on(table.isActive),
    expiresIdx: index("user_sessions_expires_idx").on(table.expiresAt),
  })
);

// =====================================
// ANALYTICS AND METRICS
// =====================================

// Storage usage analytics
export const storageUsage = sqliteTable(
  "storage_usage",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Usage breakdown
    totalFiles: integer("total_files").default(0),
    totalSize: integer("total_size").default(0), // in bytes
    folderBreakdown: text("folder_breakdown"), // JSON with per-folder usage
    typeBreakdown: text("type_breakdown"), // JSON with per-file-type usage

    // Timestamps
    recordedAt: integer("recorded_at", { mode: "timestamp" }).default(
      sql`(CURRENT_TIMESTAMP)`
    ),
  },
  (table) => ({
    userIdx: index("storage_usage_user_idx").on(table.userId),
    dateIdx: index("storage_usage_date_idx").on(table.recordedAt),
  })
);

// System-wide statistics
export const systemStats = sqliteTable(
  "system_stats",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    // Counters
    totalUsers: integer("total_users").default(0),
    totalFolders: integer("total_folders").default(0),
    totalFiles: integer("total_files").default(0),
    totalStorage: integer("total_storage").default(0), // in bytes

    // Activity metrics
    dailyUploads: integer("daily_uploads").default(0),
    dailyDownloads: integer("daily_downloads").default(0),
    activeUsers: integer("active_users").default(0), // users active in last 24h

    // Timestamps
    recordedAt: integer("recorded_at", { mode: "timestamp" }).default(
      sql`(CURRENT_TIMESTAMP)`
    ),
  },
  (table) => ({
    dateIdx: index("system_stats_date_idx").on(table.recordedAt),
  })
);

// =====================================
// TRANSFER AND SHARING SYSTEM
// =====================================

// Transfer logs for tracking upload/download activities
export const transferLogs = sqliteTable(
  "transfer_logs",
  {
    id: text("id").primaryKey(), // UUID
    fileThreadId: text("file_thread_id").references(() => files.threadId, {
      onDelete: "set null",
    }),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    // Transfer details
    type: text("type", {
      enum: ["upload", "download", "delete", "share_create", "share_access"],
    }).notNull(),
    status: text("status", {
      enum: ["pending", "in_progress", "completed", "failed", "cancelled"],
    })
      .notNull()
      .default("pending"),

    // File information
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size"), // in bytes
    mimeType: text("mime_type"),

    // Progress tracking
    bytesTransferred: integer("bytes_transferred").default(0),
    progressPercentage: real("progress_percentage").default(0),

    // Speed and timing
    transferSpeed: real("transfer_speed"), // bytes per second
    estimatedTimeRemaining: integer("estimated_time_remaining"), // seconds

    // Context
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    shareToken: text("share_token"), // if accessed via share link

    // Error information
    errorMessage: text("error_message"),
    errorCode: text("error_code"),

    // Timestamps
    createdAt: integer("created_at", { mode: "timestamp" }).default(
      sql`(CURRENT_TIMESTAMP)`
    ),
    startedAt: integer("started_at", { mode: "timestamp" }),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(
      sql`(CURRENT_TIMESTAMP)`
    ),
  },
  (table) => ({
    fileIdx: index("transfer_logs_file_idx").on(table.fileThreadId),
    userIdx: index("transfer_logs_user_idx").on(table.userId),
    typeIdx: index("transfer_logs_type_idx").on(table.type),
    statusIdx: index("transfer_logs_status_idx").on(table.status),
    createdIdx: index("transfer_logs_created_idx").on(table.createdAt),
    shareTokenIdx: index("transfer_logs_share_token_idx").on(table.shareToken),
  })
);

// File access permissions for granular sharing
export const filePermissions = sqliteTable(
  "file_permissions",
  {
    id: text("id").primaryKey(), // UUID
    fileThreadId: text("file_thread_id")
      .notNull()
      .references(() => files.threadId, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    grantedById: text("granted_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Permissions
    canView: integer("can_view", { mode: "boolean" }).default(true),
    canDownload: integer("can_download", { mode: "boolean" }).default(false),
    canShare: integer("can_share", { mode: "boolean" }).default(false),
    canDelete: integer("can_delete", { mode: "boolean" }).default(false),

    // Timestamps
    createdAt: integer("created_at", { mode: "timestamp" }).default(
      sql`(CURRENT_TIMESTAMP)`
    ),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
  },
  (table) => ({
    fileUserIdx: index("file_permissions_file_user_idx").on(
      table.fileThreadId,
      table.userId
    ),
    userIdx: index("file_permissions_user_idx").on(table.userId),
    fileIdx: index("file_permissions_file_idx").on(table.fileThreadId),
  })
);

// User settings table for application preferences
export const userSettings = sqliteTable(
  "user_settings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),

    // Transfer settings
    maxConcurrentUploads: integer("max_concurrent_uploads").default(3), // 1-50
    maxConcurrentDownloads: integer("max_concurrent_downloads").default(5), // 1-20
    chunkSize: integer("chunk_size").default(25), // MB, 1-100
    retryAttempts: integer("retry_attempts").default(3), // 1-10
    timeoutDuration: integer("timeout_duration").default(30), // seconds, 10-300

    // UI/UX settings
    showTransferNotifications: integer("show_transfer_notifications", {
      mode: "boolean",
    }).default(false), // Disable popup notifications
    autoCloseCompletedTransfers: integer("auto_close_completed_transfers", {
      mode: "boolean",
    }).default(true),
    defaultView: text("default_view", {
      enum: ["grid", "list"],
    }).default("list"),
    theme: text("theme", {
      enum: ["light", "dark", "auto"],
    }).default("auto"),
    compactMode: integer("compact_mode", {
      mode: "boolean",
    }).default(false),

    // File management settings
    autoGenerateThumbnails: integer("auto_generate_thumbnails", {
      mode: "boolean",
    }).default(true),
    thumbnailQuality: integer("thumbnail_quality").default(85), // 50-100
    deleteConfirmation: integer("delete_confirmation", {
      mode: "boolean",
    }).default(true),
    showHiddenFiles: integer("show_hidden_files", {
      mode: "boolean",
    }).default(false),

    // Storage settings
    autoCleanupFailedUploads: integer("auto_cleanup_failed_uploads", {
      mode: "boolean",
    }).default(true),
    maxStorageAlertThreshold: integer("max_storage_alert_threshold").default(
      90
    ), // percentage
    compressionEnabled: integer("compression_enabled", {
      mode: "boolean",
    }).default(false),
    duplicateDetection: integer("duplicate_detection", {
      mode: "boolean",
    }).default(true),

    // Privacy settings
    defaultShareExpiry: integer("default_share_expiry").default(168), // hours, 1-8760 (1 year)
    allowPublicSharing: integer("allow_public_sharing", {
      mode: "boolean",
    }).default(true),
    sharePasswordRequired: integer("share_password_required", {
      mode: "boolean",
    }).default(false),

    // Advanced settings
    enableDebugMode: integer("enable_debug_mode", {
      mode: "boolean",
    }).default(false),
    logLevel: text("log_level", {
      enum: ["error", "warn", "info", "debug"],
    }).default("info"),
    cacheDuration: integer("cache_duration").default(3600), // seconds

    // Timestamps
    createdAt: integer("created_at", { mode: "timestamp" }).default(
      sql`(CURRENT_TIMESTAMP)`
    ),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(
      sql`(CURRENT_TIMESTAMP)`
    ),
  },
  (table) => ({
    userIdx: index("user_settings_user_idx").on(table.userId),
  })
);

// =====================================
// APPLICATION SETTINGS
// =====================================

// Key-value store for global application settings
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value"),
});
