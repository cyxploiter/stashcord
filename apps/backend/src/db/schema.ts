import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  real,
  index,
  boolean,
  timestamp,
  varchar,
  bigint,
} from "drizzle-orm/pg-core";

// =====================================
// CORE ENTITIES
// =====================================

// Users authenticated via Discord OAuth2
export const users = pgTable(
  "users",
  {
    id: varchar("id").primaryKey(), // Discord User ID
    username: varchar("username").notNull(),
    globalName: varchar("global_name"), // Discord global display name
    avatar: varchar("avatar"),
    email: varchar("email"),
    verified: boolean("verified").default(false),

    // Discord OAuth tokens
    discordAccessToken: text("discord_access_token"),
    discordRefreshToken: text("discord_refresh_token"),
    discordTokenExpiry: timestamp("discord_token_expiry"),

    // Session management
    currentSessionId: varchar("current_session_id"),
    sessionExpiresAt: timestamp("session_expires_at"),

    // Guild/Server info
    hasStashcordGuild: boolean("has_stashcord_guild").default(false),
    stashcordGuildId: varchar("stashcord_guild_id"),
    lastGuildCheck: timestamp("last_guild_check"),

    // User preferences
    defaultViewMode: text("default_view_mode").default("explorer"),
    storageQuotaUsed: bigint("storage_quota_used", { mode: "number" }).default(
      0
    ), // in bytes
    storageQuotaLimit: bigint("storage_quota_limit", {
      mode: "number",
    }).default(16106127360), // 15GB default

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    lastLoginAt: timestamp("last_login_at"),
  },
  (table) => ({
    usernameIdx: index("users_username_idx").on(table.username),
    guildIdx: index("users_guild_idx").on(table.stashcordGuildId),
  })
);

// File type definitions for normalization
export const fileTypes = pgTable("file_types", {
  name: varchar("name").primaryKey(), // e.g., "document", "image", "video" - use semantic name as PK
  displayName: varchar("display_name").notNull(), // e.g., "Document", "Image", "Video"
  mimeTypes: text("mime_types").notNull(), // JSON array of supported MIME types
  maxSize: integer("max_size"), // max file size for this type in bytes
  iconName: varchar("icon_name"), // Lucide icon name
  color: varchar("color"), // Tailwind color class

  createdAt: timestamp("created_at").defaultNow(),
});

// Folders (Forums) - Maps to Discord forum channels
export const folders = pgTable(
  "folders",
  {
    discordForumId: varchar("discord_forum_id").primaryKey(), // Discord forum channel ID as primary key
    name: varchar("name").notNull(),
    slug: varchar("slug").notNull(), // URL-safe identifier
    description: text("description"),

    // Ownership
    ownerId: varchar("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Discord mapping
    discordWebhookUrl: text("discord_webhook_url"), // Discord webhook for uploading larger files

    // Settings
    isArchived: boolean("is_archived").default(false),
    sortOrder: integer("sort_order").default(0),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    ownerIdx: index("folders_owner_idx").on(table.ownerId),
    slugIdx: index("folders_slug_idx").on(table.slug),
  })
);

// Files - Individual files stored in folders
export const files = pgTable(
  "files",
  {
    threadId: varchar("thread_id").primaryKey(), // Discord forum thread ID (primary key)
    name: varchar("name").notNull(),
    originalName: varchar("original_name").notNull(), // Original filename when uploaded
    slug: varchar("slug").notNull(), // URL-safe identifier

    // File metadata
    size: bigint("size", { mode: "number" }).notNull(), // File size in bytes
    mimeType: varchar("mime_type").notNull(),
    fileTypeId: varchar("file_type_id").references(() => fileTypes.name), // Reference to fileTypes.name
    hash: varchar("hash"), // File hash for deduplication

    // Relationships
    folderId: varchar("folder_id")
      .notNull()
      .references(() => folders.discordForumId, { onDelete: "cascade" }), // Reference to folders.discordForumId
    ownerId: varchar("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Discord mapping - forum thread information
    threadName: varchar("thread_name"), // Discord forum thread name

    // File status and metadata
    uploadStatus: text("upload_status").default("pending"),
    isStarred: boolean("is_starred").default(false),
    downloadCount: integer("download_count").default(0),

    // Optional thumbnail/preview
    thumbnailUrl: text("thumbnail_url"),
    previewUrl: text("preview_url"),

    // Sharing
    shareToken: varchar("share_token").unique(),
    shareExpiresAt: timestamp("share_expires_at"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    lastAccessedAt: timestamp("last_accessed_at"),
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
export const fileChunks = pgTable(
  "file_chunks",
  {
    discordMessageId: varchar("discord_message_id").primaryKey(), // Discord message ID as primary key
    fileThreadId: varchar("file_thread_id")
      .notNull()
      .references(() => files.threadId, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(), // 0-based chunk order
    size: integer("size").notNull(), // Chunk size in bytes

    // Discord mapping
    discordAttachmentId: varchar("discord_attachment_id").notNull(),
    cdnUrl: text("cdn_url").notNull(),

    // Chunk metadata
    checksum: varchar("checksum"), // Chunk checksum for integrity
    uploadedAt: timestamp("uploaded_at").defaultNow(),
  },
  (table) => ({
    fileIdx: index("file_chunks_file_idx").on(table.fileThreadId),
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
export const permissions = pgTable("permissions", {
  name: varchar("name").primaryKey(), // e.g., "read", "write", "delete", "admin" - use semantic name as PK
  displayName: varchar("display_name").notNull(),
  description: text("description"),

  createdAt: timestamp("created_at").defaultNow(),
});

// Folder permissions - More granular permissions at folder level
export const folderPermissions = pgTable(
  "folder_permissions",
  {
    id: varchar("id").primaryKey(), // Generate unique ID like "user_folder_permission_{userId}_{folderId}_{permission}"
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    folderId: varchar("folder_id")
      .notNull()
      .references(() => folders.discordForumId, { onDelete: "cascade" }),
    permissionId: varchar("permission_id")
      .notNull()
      .references(() => permissions.name, { onDelete: "cascade" }),

    grantedBy: varchar("granted_by")
      .notNull()
      .references(() => users.id),
    grantedAt: timestamp("granted_at").defaultNow(),
    expiresAt: timestamp("expires_at"),
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
export const shareLinks = pgTable(
  "share_links",
  {
    token: varchar("token").primaryKey(), // UUID for public sharing - use as primary key

    // What's being shared
    resourceType: text("resource_type").notNull(),
    resourceId: varchar("resource_id").notNull(), // Can be thread ID or forum ID

    // Share settings
    ownerId: varchar("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isPublic: boolean("is_public").default(false),
    requiresAuth: boolean("requires_auth").default(false),
    allowDownload: boolean("allow_download").default(true),

    // Access control
    accessCount: integer("access_count").default(0),
    maxAccess: integer("max_access"), // Null = unlimited
    password: text("password"), // Hashed password for protected shares

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    expiresAt: timestamp("expires_at"),
    lastAccessedAt: timestamp("last_accessed_at"),
  },
  (table) => ({
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
export const auditLog = pgTable(
  "audit_log",
  {
    id: varchar("id").primaryKey(), // Generate unique ID like "audit_{timestamp}_{userId}_{action}"

    // Who did what
    userId: varchar("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: varchar("action").notNull(), // e.g., "create", "update", "delete", "download"
    resourceType: varchar("resource_type").notNull(), // e.g., "file", "folder", "category"
    resourceId: varchar("resource_id"), // ID of the affected resource (thread ID, forum ID, etc.)

    // Context
    details: text("details"), // JSON object with additional details
    ipAddress: varchar("ip_address"),
    userAgent: text("user_agent"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
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
export const userSessions = pgTable(
  "user_sessions",
  {
    id: varchar("id").primaryKey(), // Session token
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Session metadata
    ipAddress: varchar("ip_address"),
    userAgent: text("user_agent"),
    isActive: boolean("is_active").default(true),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    lastActivityAt: timestamp("last_activity_at").defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
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
export const storageUsage = pgTable(
  "storage_usage",
  {
    id: varchar("id").primaryKey(), // Generate unique ID like "usage_{userId}_{date}"
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Usage breakdown
    totalFiles: integer("total_files").default(0),
    totalSize: bigint("total_size", { mode: "number" }).default(0), // in bytes
    folderBreakdown: text("folder_breakdown"), // JSON with per-folder usage
    typeBreakdown: text("type_breakdown"), // JSON with per-file-type usage

    // Timestamps
    recordedAt: timestamp("recorded_at").defaultNow(),
  },
  (table) => ({
    userIdx: index("storage_usage_user_idx").on(table.userId),
    dateIdx: index("storage_usage_date_idx").on(table.recordedAt),
  })
);

// System-wide statistics
export const systemStats = pgTable("system_stats", {
  recordedAt: timestamp("recorded_at").primaryKey(), // Use timestamp as primary key

  // Counters
  totalUsers: integer("total_users").default(0),
  totalFolders: integer("total_folders").default(0),
  totalFiles: integer("total_files").default(0),
  totalStorage: bigint("total_storage", { mode: "number" }).default(0), // in bytes

  // Activity metrics
  dailyUploads: integer("daily_uploads").default(0),
  dailyDownloads: integer("daily_downloads").default(0),
  activeUsers: integer("active_users").default(0), // users active in last 24h
});

// =====================================
// TRANSFER AND SHARING SYSTEM
// =====================================

// Transfer logs for tracking upload/download activities
export const transferLogs = pgTable(
  "transfer_logs",
  {
    id: varchar("id").primaryKey(), // UUID
    fileThreadId: varchar("file_thread_id").references(() => files.threadId, {
      onDelete: "set null",
    }),
    userId: varchar("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    // Transfer details
    type: text("type").notNull(),
    status: text("status").notNull().default("pending"),

    // File information
    fileName: text("file_name").notNull(),
    fileSize: bigint("file_size", { mode: "number" }), // in bytes
    mimeType: varchar("mime_type"),

    // Progress tracking
    bytesTransferred: bigint("bytes_transferred", { mode: "number" }).default(
      0
    ),
    progressPercentage: real("progress_percentage").default(0),

    // Speed and timing
    transferSpeed: real("transfer_speed"), // bytes per second
    estimatedTimeRemaining: integer("estimated_time_remaining"), // seconds

    // Context
    ipAddress: varchar("ip_address"),
    userAgent: text("user_agent"),
    shareToken: varchar("share_token"), // if accessed via share link

    // Error information
    errorMessage: text("error_message"),
    errorCode: varchar("error_code"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    updatedAt: timestamp("updated_at").defaultNow(),
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
export const filePermissions = pgTable(
  "file_permissions",
  {
    id: varchar("id").primaryKey(), // UUID
    fileThreadId: varchar("file_thread_id")
      .notNull()
      .references(() => files.threadId, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    grantedById: varchar("granted_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Permissions
    canView: boolean("can_view").default(true),
    canDownload: boolean("can_download").default(false),
    canShare: boolean("can_share").default(false),
    canDelete: boolean("can_delete").default(false),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    expiresAt: timestamp("expires_at"),
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
export const userSettings = pgTable(
  "user_settings",
  {
    userId: varchar("user_id")
      .primaryKey() // Use userId as primary key since it's unique
      .references(() => users.id, { onDelete: "cascade" }),

    // Transfer settings
    maxConcurrentUploads: integer("max_concurrent_uploads").default(3), // 1-50
    maxConcurrentDownloads: integer("max_concurrent_downloads").default(5), // 1-20
    chunkSize: integer("chunk_size").default(25), // MB, 1-100
    retryAttempts: integer("retry_attempts").default(3), // 1-10
    timeoutDuration: integer("timeout_duration").default(30), // seconds, 10-300

    // UI/UX settings
    showTransferNotifications: boolean("show_transfer_notifications").default(
      false
    ), // Disable popup notifications
    autoCloseCompletedTransfers: boolean(
      "auto_close_completed_transfers"
    ).default(true),
    defaultView: text("default_view").default("list"),
    theme: text("theme").default("auto"),
    compactMode: boolean("compact_mode").default(false),

    // File management settings
    autoGenerateThumbnails: boolean("auto_generate_thumbnails").default(true),
    thumbnailQuality: integer("thumbnail_quality").default(85), // 50-100
    deleteConfirmation: boolean("delete_confirmation").default(true),
    showHiddenFiles: boolean("show_hidden_files").default(false),

    // Storage settings
    autoCleanupFailedUploads: boolean("auto_cleanup_failed_uploads").default(
      true
    ),
    maxStorageAlertThreshold: integer("max_storage_alert_threshold").default(
      90
    ), // percentage
    compressionEnabled: boolean("compression_enabled").default(false),
    duplicateDetection: boolean("duplicate_detection").default(true),

    // Privacy settings
    defaultShareExpiry: integer("default_share_expiry").default(168), // hours, 1-8760 (1 year)
    allowPublicSharing: boolean("allow_public_sharing").default(true),
    sharePasswordRequired: boolean("share_password_required").default(false),

    // Stashcord specific settings
    defaultStashFolderId: varchar("default_stash_folder_id").references(
      () => folders.discordForumId,
      { onDelete: "set null" }
    ),

    // Advanced settings
    enableDebugMode: boolean("enable_debug_mode").default(false),
    logLevel: text("log_level").default("info"),
    cacheDuration: integer("cache_duration").default(3600), // seconds

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userIdx: index("user_settings_user_idx").on(table.userId),
  })
);

// =====================================
// APPLICATION SETTINGS
// =====================================

// Key-value store for global application settings
export const appSettings = pgTable("app_settings", {
  key: varchar("key").primaryKey(),
  value: text("value"),
});
