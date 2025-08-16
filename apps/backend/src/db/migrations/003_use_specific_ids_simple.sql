-- Migration: Use specific IDs instead of generic auto-increment IDs
-- This migration updates the database schema to use Discord-specific identifiers
-- Only handles existing tables

BEGIN TRANSACTION;

-- ==========================================
-- BACKUP EXISTING DATA
-- ==========================================

-- Create backup tables for existing data
CREATE TABLE folders_backup AS SELECT * FROM folders;
CREATE TABLE files_backup AS SELECT * FROM files;
CREATE TABLE file_chunks_backup AS SELECT * FROM file_chunks;

-- ==========================================
-- RECREATE CORE TABLES
-- ==========================================

-- Drop existing tables (in reverse dependency order)
DROP TABLE file_chunks;
DROP TABLE files;
DROP TABLE folders;

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
    file_type_id TEXT,
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

COMMIT;
