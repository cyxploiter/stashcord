-- Migration: Use specific IDs instead of generic auto-increment IDs
-- This migration updates the database schema to use Discord-specific identifiers

-- ==========================================
-- BACKUP EXISTING DATA
-- ==========================================

-- Create backup tables for existing data
CREATE TABLE folders_backup AS SELECT * FROM folders;
CREATE TABLE files_backup AS SELECT * FROM files;
CREATE TABLE file_chunks_backup AS SELECT * FROM file_chunks;

-- ==========================================
-- RECREATE TABLES WITH NEW SCHEMA
-- ==========================================

-- Drop existing tables (in reverse dependency order)
DROP TABLE IF EXISTS file_chunks;
DROP TABLE IF EXISTS files;
DROP TABLE IF EXISTS folders;
DROP TABLE IF EXISTS file_types;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS folder_permissions;
DROP TABLE IF EXISTS share_links;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS storage_usage;
DROP TABLE IF EXISTS system_stats;
DROP TABLE IF EXISTS user_settings;

-- Recreate file_types with name as primary key
CREATE TABLE file_types (
    name TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    mime_types TEXT NOT NULL,
    max_size INTEGER,
    icon_name TEXT,
    color TEXT,
    created_at INTEGER DEFAULT (CURRENT_TIMESTAMP)
);

-- Recreate folders with discordForumId as primary key
CREATE TABLE folders (
    discord_forum_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    discord_webhook_url TEXT,
    is_archived INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (CURRENT_TIMESTAMP),
    updated_at INTEGER DEFAULT (CURRENT_TIMESTAMP)
);

-- Recreate files table (threadId is already primary key)
CREATE TABLE files (
    thread_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    slug TEXT NOT NULL,
    size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    file_type_id TEXT REFERENCES file_types(name),
    hash TEXT,
    folder_id TEXT NOT NULL REFERENCES folders(discord_forum_id) ON DELETE CASCADE,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    thread_name TEXT,
    upload_status TEXT DEFAULT 'pending',
    is_starred INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    thumbnail_url TEXT,
    preview_url TEXT,
    share_token TEXT UNIQUE,
    share_expires_at INTEGER,
    created_at INTEGER DEFAULT (CURRENT_TIMESTAMP),
    updated_at INTEGER DEFAULT (CURRENT_TIMESTAMP),
    last_accessed_at INTEGER
);

-- Recreate file_chunks with discordMessageId as primary key
CREATE TABLE file_chunks (
    discord_message_id TEXT PRIMARY KEY,
    file_thread_id TEXT NOT NULL REFERENCES files(thread_id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    size INTEGER NOT NULL,
    discord_attachment_id TEXT NOT NULL,
    cdn_url TEXT NOT NULL,
    checksum TEXT,
    uploaded_at INTEGER DEFAULT (CURRENT_TIMESTAMP)
);

-- Recreate permissions with name as primary key
CREATE TABLE permissions (
    name TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER DEFAULT (CURRENT_TIMESTAMP)
);

-- Recreate folder_permissions with composite ID
CREATE TABLE folder_permissions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    folder_id TEXT NOT NULL REFERENCES folders(discord_forum_id) ON DELETE CASCADE,
    permission_id TEXT NOT NULL REFERENCES permissions(name) ON DELETE CASCADE,
    granted_by TEXT NOT NULL REFERENCES users(id),
    granted_at INTEGER DEFAULT (CURRENT_TIMESTAMP),
    expires_at INTEGER
);

-- Recreate share_links with token as primary key
CREATE TABLE share_links (
    token TEXT PRIMARY KEY,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_public INTEGER DEFAULT 0,
    requires_auth INTEGER DEFAULT 0,
    allow_download INTEGER DEFAULT 1,
    access_count INTEGER DEFAULT 0,
    max_access INTEGER,
    password TEXT,
    created_at INTEGER DEFAULT (CURRENT_TIMESTAMP),
    expires_at INTEGER,
    last_accessed_at INTEGER
);

-- Recreate audit_log with generated ID
CREATE TABLE audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at INTEGER DEFAULT (CURRENT_TIMESTAMP)
);

-- Recreate storage_usage with generated ID
CREATE TABLE storage_usage (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_files INTEGER DEFAULT 0,
    total_size INTEGER DEFAULT 0,
    folder_breakdown TEXT,
    type_breakdown TEXT,
    recorded_at INTEGER DEFAULT (CURRENT_TIMESTAMP)
);

-- Recreate system_stats with timestamp as primary key
CREATE TABLE system_stats (
    recorded_at INTEGER PRIMARY KEY,
    total_users INTEGER DEFAULT 0,
    total_folders INTEGER DEFAULT 0,
    total_files INTEGER DEFAULT 0,
    total_storage INTEGER DEFAULT 0,
    daily_uploads INTEGER DEFAULT 0,
    daily_downloads INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0
);

-- Recreate user_settings with userId as primary key
CREATE TABLE user_settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    max_concurrent_uploads INTEGER DEFAULT 3,
    max_concurrent_downloads INTEGER DEFAULT 5,
    chunk_size INTEGER DEFAULT 25,
    retry_attempts INTEGER DEFAULT 3,
    timeout_duration INTEGER DEFAULT 30,
    show_transfer_notifications INTEGER DEFAULT 0,
    auto_close_completed_transfers INTEGER DEFAULT 1,
    default_view TEXT DEFAULT 'list',
    theme TEXT DEFAULT 'auto',
    compact_mode INTEGER DEFAULT 0,
    auto_generate_thumbnails INTEGER DEFAULT 1,
    thumbnail_quality INTEGER DEFAULT 85,
    delete_confirmation INTEGER DEFAULT 1,
    show_hidden_files INTEGER DEFAULT 0,
    auto_cleanup_failed_uploads INTEGER DEFAULT 1,
    max_storage_alert_threshold INTEGER DEFAULT 90,
    created_at INTEGER DEFAULT (CURRENT_TIMESTAMP),
    updated_at INTEGER DEFAULT (CURRENT_TIMESTAMP)
);

-- ==========================================
-- RECREATE INDEXES
-- ==========================================

-- Folders indexes
CREATE INDEX folders_owner_idx ON folders(owner_id);
CREATE INDEX folders_slug_idx ON folders(slug);

-- Files indexes
CREATE INDEX files_folder_idx ON files(folder_id);
CREATE INDEX files_owner_idx ON files(owner_id);
CREATE INDEX files_type_idx ON files(file_type_id);
CREATE INDEX files_hash_idx ON files(hash);
CREATE INDEX files_discord_idx ON files(thread_id);
CREATE INDEX files_status_idx ON files(upload_status);
CREATE INDEX files_starred_idx ON files(is_starred);
CREATE INDEX files_share_token_idx ON files(share_token);

-- File chunks indexes
CREATE INDEX file_chunks_file_idx ON file_chunks(file_thread_id);
CREATE INDEX file_chunks_order_idx ON file_chunks(file_thread_id, chunk_index);

-- Folder permissions indexes
CREATE INDEX folder_permissions_user_folder_idx ON folder_permissions(user_id, folder_id);
CREATE INDEX folder_permissions_folder_idx ON folder_permissions(folder_id);
CREATE INDEX folder_permissions_user_idx ON folder_permissions(user_id);

-- Share links indexes
CREATE INDEX share_links_owner_idx ON share_links(owner_id);
CREATE INDEX share_links_resource_idx ON share_links(resource_type, resource_id);

-- Audit log indexes
CREATE INDEX audit_log_user_idx ON audit_log(user_id);
CREATE INDEX audit_log_action_idx ON audit_log(action);
CREATE INDEX audit_log_resource_idx ON audit_log(resource_type, resource_id);
CREATE INDEX audit_log_date_idx ON audit_log(created_at);

-- Storage usage indexes
CREATE INDEX storage_usage_user_idx ON storage_usage(user_id);
CREATE INDEX storage_usage_date_idx ON storage_usage(recorded_at);

-- User sessions indexes (if exists)
CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS user_sessions_active_idx ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS user_sessions_expires_idx ON user_sessions(expires_at);

-- ==========================================
-- MIGRATE EXISTING DATA
-- ==========================================

-- Migrate folders data (only if discordForumId exists)
INSERT INTO folders (discord_forum_id, name, slug, description, owner_id, discord_webhook_url, is_archived, sort_order, created_at, updated_at)
SELECT 
    discord_forum_id,
    name,
    slug,
    description,
    owner_id,
    discord_webhook_url,
    is_archived,
    sort_order,
    created_at,
    updated_at
FROM folders_backup 
WHERE discord_forum_id IS NOT NULL AND discord_forum_id != '';

-- Migrate files data (update folder references)
INSERT INTO files (thread_id, name, original_name, slug, size, mime_type, file_type_id, hash, folder_id, owner_id, thread_name, upload_status, is_starred, download_count, thumbnail_url, preview_url, share_token, share_expires_at, created_at, updated_at, last_accessed_at)
SELECT 
    f.thread_id,
    f.name,
    f.original_name,
    f.slug,
    f.size,
    f.mime_type,
    f.file_type_id,
    f.hash,
    fb.discord_forum_id,  -- Map to new folder primary key
    f.owner_id,
    f.thread_name,
    f.upload_status,
    f.is_starred,
    f.download_count,
    f.thumbnail_url,
    f.preview_url,
    f.share_token,
    f.share_expires_at,
    f.created_at,
    f.updated_at,
    f.last_accessed_at
FROM files_backup f
JOIN folders_backup fb ON f.folder_id = fb.id
WHERE fb.discord_forum_id IS NOT NULL AND fb.discord_forum_id != '';

-- Migrate file chunks data
INSERT INTO file_chunks (discord_message_id, file_thread_id, chunk_index, size, discord_attachment_id, cdn_url, checksum, uploaded_at)
SELECT 
    discord_message_id,
    file_thread_id,
    chunk_index,
    size,
    discord_attachment_id,
    cdn_url,
    checksum,
    uploaded_at
FROM file_chunks_backup;

-- ==========================================
-- CLEANUP
-- ==========================================

-- Drop backup tables
DROP TABLE folders_backup;
DROP TABLE files_backup;
DROP TABLE file_chunks_backup;

-- Insert default file types if they don't exist
INSERT OR IGNORE INTO file_types (name, display_name, mime_types, icon_name, color) VALUES
('document', 'Document', '["application/pdf", "text/plain", "application/msword"]', 'FileText', 'blue'),
('image', 'Image', '["image/jpeg", "image/png", "image/gif", "image/webp"]', 'Image', 'green'),
('video', 'Video', '["video/mp4", "video/avi", "video/mov", "video/wmv"]', 'Video', 'red'),
('audio', 'Audio', '["audio/mp3", "audio/wav", "audio/flac"]', 'Music', 'purple'),
('archive', 'Archive', '["application/zip", "application/x-tar", "application/x-rar"]', 'Archive', 'orange');

-- Insert default permissions if they don't exist
INSERT OR IGNORE INTO permissions (name, display_name, description) VALUES
('read', 'Read', 'Can view and download files'),
('write', 'Write', 'Can upload and modify files'),
('delete', 'Delete', 'Can delete files and folders'),
('admin', 'Admin', 'Full access to folder and permissions');
