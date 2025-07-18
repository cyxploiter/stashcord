import { db, sqlite } from "./db";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./db/schema";
import { seedDatabase } from "./db/seed";

async function initializeDatabase(forceReset = false) {
  try {
    console.log("Initializing Stashcord database...");

    // Safety check - never drop tables in production unless explicitly forced
    const NODE_ENV = process.env.NODE_ENV || "development";
    const FORCE_DB_RESET = process.env.FORCE_DB_RESET === "true" || forceReset;

    if (FORCE_DB_RESET && NODE_ENV === "production") {
      console.error(
        "❌ FORCE_DB_RESET is not allowed in production environment!"
      );
      throw new Error("Database reset not allowed in production");
    }

    if (FORCE_DB_RESET) {
      console.log("⚠️ FORCE_DB_RESET detected - dropping all tables!");
      const dropStatements = [
        "DROP TABLE IF EXISTS file_permissions",
        "DROP TABLE IF EXISTS transfer_logs",
        "DROP TABLE IF EXISTS file_chunks",
        "DROP TABLE IF EXISTS files",
        "DROP TABLE IF EXISTS folders",
        "DROP TABLE IF EXISTS categories",
        "DROP TABLE IF EXISTS file_types",
        "DROP TABLE IF EXISTS users",
      ];

      for (const statement of dropStatements) {
        try {
          sqlite.exec(statement);
        } catch (error) {
          // Ignore errors if tables don't exist
        }
      }
      console.log("✓ All tables dropped (forced reset)");
    }

    // Enable foreign key constraints
    sqlite.pragma("foreign_keys = ON");

    // Enable WAL mode for better concurrency
    sqlite.pragma("journal_mode = WAL");

    // Optimize SQLite settings
    sqlite.pragma("synchronous = NORMAL");
    sqlite.pragma("cache_size = 10000");
    sqlite.pragma("temp_store = MEMORY");

    console.log("✓ Database pragmas configured");

    // Create tables by executing the schema
    console.log("📝 Creating database tables...");

    // Check if this is a fresh database or needs migration
    const tablesExist = sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users', 'folders', 'files')"
      )
      .all() as { name: string }[];

    const isNewDatabase = tablesExist.length === 0;

    if (isNewDatabase) {
      console.log("🆕 Detected new database, creating fresh schema...");
    } else {
      console.log(
        "📊 Detected existing database, checking for schema updates..."
      );

      // Handle migration from old category-based schema to forum-based schema
      const oldCategoriesTable = sqlite
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='categories'"
        )
        .get() as { name: string } | undefined;

      if (oldCategoriesTable) {
        console.log(
          "🔄 Migrating from old category-based schema to forum-based schema..."
        );

        // Drop old category table and related data (this is a one-time migration)
        sqlite.exec("DROP TABLE IF EXISTS categories");

        // Remove discord_category_id column from folders if it exists
        try {
          // Create new folders table with correct schema
          sqlite.exec(`
            CREATE TABLE IF NOT EXISTS "folders_new" (
              "id" integer PRIMARY KEY AUTOINCREMENT,
              "name" text NOT NULL,
              "slug" text NOT NULL,
              "description" text,
              "owner_id" text NOT NULL,
              "discord_forum_id" text UNIQUE,
              "discord_webhook_url" text,
              "is_archived" integer DEFAULT 0,
              "sort_order" integer DEFAULT 0,
              "created_at" integer DEFAULT (CURRENT_TIMESTAMP),
              "updated_at" integer DEFAULT (CURRENT_TIMESTAMP),
              FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE CASCADE
            )
          `);

          // Copy data from old folders table (excluding discord_category_id)
          sqlite.exec(`
            INSERT INTO folders_new (id, name, slug, description, owner_id, is_archived, sort_order, created_at, updated_at)
            SELECT id, name, slug, description, owner_id, is_archived, sort_order, created_at, updated_at
            FROM folders
          `);

          // Replace old table
          sqlite.exec("DROP TABLE folders");
          sqlite.exec("ALTER TABLE folders_new RENAME TO folders");

          console.log(
            "✓ Migrated folders from category-based to forum-based schema"
          );
        } catch (error) {
          console.log("⚠️ Folders table already has correct schema");
        }
      }

      // Check if users table needs session fields
      try {
        const userTableInfo = sqlite
          .prepare("PRAGMA table_info(users)")
          .all() as Array<{
          cid: number;
          name: string;
          type: string;
          notnull: number;
          dflt_value: any;
          pk: number;
        }>;

        const hasSessionFields = userTableInfo.some(
          (col) => col.name === "current_session_id"
        );

        if (!hasSessionFields) {
          console.log("🔄 Adding session fields to users table...");

          // Add session columns to existing users table
          sqlite.exec(`ALTER TABLE users ADD COLUMN current_session_id text`);
          sqlite.exec(
            `ALTER TABLE users ADD COLUMN session_expires_at integer`
          );

          console.log("✓ Added session fields to users table");
        }
      } catch (error) {
        console.log("⚠️ Could not check/add session fields:", error);
      }

      // Check and migrate files table from id to threadId
      try {
        const filesTableInfo = sqlite
          .prepare("PRAGMA table_info(files)")
          .all() as Array<{
          cid: number;
          name: string;
          type: string;
          notnull: number;
          dflt_value: string | null;
          pk: number;
        }>;

        const hasThreadId = filesTableInfo.some(
          (col) => col.name === "thread_id"
        );
        const hasOldId = filesTableInfo.some(
          (col) => col.name === "id" && col.pk === 1
        );

        if (hasOldId && !hasThreadId) {
          console.log("🔄 Migrating files table from id to threadId...");

          // For simplicity in development, we'll recreate the table
          // In production, you'd want a more careful migration
          const NODE_ENV = process.env.NODE_ENV || "development";

          if (NODE_ENV === "development") {
            console.log(
              "⚠️ Development mode: recreating files table with new schema"
            );

            // Drop dependent tables first
            sqlite.exec("DROP TABLE IF EXISTS file_permissions");
            sqlite.exec("DROP TABLE IF EXISTS transfer_logs");
            sqlite.exec("DROP TABLE IF EXISTS file_chunks");
            sqlite.exec("DROP TABLE IF EXISTS files");

            console.log("✓ Recreated files table with threadId schema");
          } else {
            console.log(
              "⚠️ Production mode: manual migration required for files table"
            );
            console.log(
              "Please run a manual migration to convert from id to threadId"
            );
          }
        } else if (hasThreadId) {
          console.log("✓ Files table already uses threadId schema");
        }
      } catch (error) {
        console.log("⚠️ Could not check/migrate files table:", error);
      }
    }

    // Get all table creation SQL from schema
    const createTableStatements = [
      // Users table
      `CREATE TABLE IF NOT EXISTS "users" (
        "id" text PRIMARY KEY NOT NULL,
        "username" text NOT NULL,
        "global_name" text,
        "avatar" text,
        "email" text,
        "verified" integer DEFAULT 0,
        "discord_access_token" text,
        "discord_refresh_token" text,
        "discord_token_expiry" integer,
        "current_session_id" text,
        "session_expires_at" integer,
        "has_stashcord_guild" integer DEFAULT 0,
        "stashcord_guild_id" text,
        "last_guild_check" integer,
        "default_view_mode" text DEFAULT 'explorer',
        "storage_quota_used" integer DEFAULT 0,
        "storage_quota_limit" integer DEFAULT 16106127360,
        "created_at" integer DEFAULT (CURRENT_TIMESTAMP),
        "updated_at" integer DEFAULT (CURRENT_TIMESTAMP),
        "last_login_at" integer
      )`,

      // File types table
      `CREATE TABLE IF NOT EXISTS "file_types" (
        "id" integer PRIMARY KEY AUTOINCREMENT,
        "name" text NOT NULL UNIQUE,
        "display_name" text NOT NULL,
        "mime_types" text NOT NULL,
        "max_size" integer,
        "icon_name" text,
        "color" text,
        "created_at" integer DEFAULT (CURRENT_TIMESTAMP)
      )`,

      // Folders table (now maps to Discord forums instead of categories)
      `CREATE TABLE IF NOT EXISTS "folders" (
        "id" integer PRIMARY KEY AUTOINCREMENT,
        "name" text NOT NULL,
        "slug" text NOT NULL,
        "description" text,
        "owner_id" text NOT NULL,
        "discord_forum_id" text UNIQUE,
        "discord_webhook_url" text,
        "is_archived" integer DEFAULT 0,
        "sort_order" integer DEFAULT 0,
        "created_at" integer DEFAULT (CURRENT_TIMESTAMP),
        "updated_at" integer DEFAULT (CURRENT_TIMESTAMP),
        FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE CASCADE
      )`,

      // Files table (now uses threadId as primary key)
      `CREATE TABLE IF NOT EXISTS "files" (
        "thread_id" text PRIMARY KEY,
        "name" text NOT NULL,
        "original_name" text NOT NULL,
        "slug" text NOT NULL,
        "size" integer NOT NULL,
        "mime_type" text NOT NULL,
        "file_type_id" integer,
        "hash" text,
        "folder_id" integer NOT NULL,
        "owner_id" text NOT NULL,
        "thread_name" text,
        "upload_status" text DEFAULT 'pending',
        "is_starred" integer DEFAULT 0,
        "download_count" integer DEFAULT 0,
        "thumbnail_url" text,
        "preview_url" text,
        "share_token" text UNIQUE,
        "share_expires_at" integer,
        "created_at" integer DEFAULT (CURRENT_TIMESTAMP),
        "updated_at" integer DEFAULT (CURRENT_TIMESTAMP),
        "last_accessed_at" integer,
        FOREIGN KEY ("folder_id") REFERENCES "folders" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("file_type_id") REFERENCES "file_types" ("id")
      )`,

      // File chunks table
      `CREATE TABLE IF NOT EXISTS "file_chunks" (
        "id" integer PRIMARY KEY AUTOINCREMENT,
        "file_thread_id" text NOT NULL,
        "chunk_index" integer NOT NULL,
        "size" integer NOT NULL,
        "discord_message_id" text NOT NULL,
        "discord_attachment_id" text NOT NULL,
        "cdn_url" text NOT NULL,
        "checksum" text,
        "uploaded_at" integer DEFAULT (CURRENT_TIMESTAMP),
        FOREIGN KEY ("file_thread_id") REFERENCES "files" ("thread_id") ON DELETE CASCADE
      )`,

      // Transfer logs table for tracking activities
      `CREATE TABLE IF NOT EXISTS "transfer_logs" (
        "id" text PRIMARY KEY,
        "file_thread_id" text,
        "user_id" text,
        "type" text NOT NULL,
        "status" text NOT NULL DEFAULT 'pending',
        "file_name" text NOT NULL,
        "file_size" integer,
        "mime_type" text,
        "bytes_transferred" integer DEFAULT 0,
        "progress_percentage" real DEFAULT 0,
        "transfer_speed" real,
        "estimated_time_remaining" integer,
        "ip_address" text,
        "user_agent" text,
        "share_token" text,
        "error_message" text,
        "error_code" text,
        "created_at" integer DEFAULT (CURRENT_TIMESTAMP),
        "started_at" integer,
        "completed_at" integer,
        "updated_at" integer DEFAULT (CURRENT_TIMESTAMP),
        FOREIGN KEY ("file_thread_id") REFERENCES "files" ("thread_id") ON DELETE SET NULL,
        FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL
      )`,

      // File permissions table for granular sharing
      `CREATE TABLE IF NOT EXISTS "file_permissions" (
        "id" text PRIMARY KEY,
        "file_thread_id" text NOT NULL,
        "user_id" text NOT NULL,
        "granted_by_id" text NOT NULL,
        "can_view" integer DEFAULT 1,
        "can_download" integer DEFAULT 0,
        "can_share" integer DEFAULT 0,
        "can_delete" integer DEFAULT 0,
        "created_at" integer DEFAULT (CURRENT_TIMESTAMP),
        "expires_at" integer,
        FOREIGN KEY ("file_thread_id") REFERENCES "files" ("thread_id") ON DELETE CASCADE,
        FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("granted_by_id") REFERENCES "users" ("id") ON DELETE CASCADE
      )`,

      // Permissions table for permission definitions
      `CREATE TABLE IF NOT EXISTS "permissions" (
        "id" integer PRIMARY KEY AUTOINCREMENT,
        "name" text NOT NULL UNIQUE,
        "display_name" text NOT NULL,
        "description" text,
        "created_at" integer DEFAULT (CURRENT_TIMESTAMP)
      )`,

      // Folder permissions table for granular permissions at folder level
      `CREATE TABLE IF NOT EXISTS "folder_permissions" (
        "id" integer PRIMARY KEY AUTOINCREMENT,
        "folder_id" integer NOT NULL,
        "user_id" text NOT NULL,
        "permission_id" integer NOT NULL,
        "granted_by_id" text NOT NULL,
        "created_at" integer DEFAULT (CURRENT_TIMESTAMP),
        "expires_at" integer,
        FOREIGN KEY ("folder_id") REFERENCES "folders" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("granted_by_id") REFERENCES "users" ("id") ON DELETE CASCADE
      )`,

      // App settings table
      `CREATE TABLE IF NOT EXISTS "app_settings" (
        "key" text PRIMARY KEY,
        "value" text
      )`,
    ];

    // Execute each table creation statement
    for (const statement of createTableStatements) {
      sqlite.exec(statement);
    }

    console.log("✓ Database tables created");

    // Create indexes
    console.log("📊 Creating indexes...");
    const indexStatements = [
      `CREATE INDEX IF NOT EXISTS "users_username_idx" ON "users" ("username")`,
      `CREATE INDEX IF NOT EXISTS "users_guild_idx" ON "users" ("stashcord_guild_id")`,
      `CREATE INDEX IF NOT EXISTS "users_session_idx" ON "users" ("current_session_id")`,
      `CREATE INDEX IF NOT EXISTS "folders_owner_idx" ON "folders" ("owner_id")`,
      `CREATE INDEX IF NOT EXISTS "folders_discord_idx" ON "folders" ("discord_forum_id")`,
      `CREATE INDEX IF NOT EXISTS "folders_slug_idx" ON "folders" ("slug")`,
      `CREATE INDEX IF NOT EXISTS "files_folder_idx" ON "files" ("folder_id")`,
      `CREATE INDEX IF NOT EXISTS "files_owner_idx" ON "files" ("owner_id")`,
      `CREATE INDEX IF NOT EXISTS "files_type_idx" ON "files" ("file_type_id")`,
      `CREATE INDEX IF NOT EXISTS "files_hash_idx" ON "files" ("hash")`,
      `CREATE INDEX IF NOT EXISTS "files_discord_idx" ON "files" ("thread_id")`,
      `CREATE INDEX IF NOT EXISTS "files_status_idx" ON "files" ("upload_status")`,
      `CREATE INDEX IF NOT EXISTS "files_starred_idx" ON "files" ("is_starred")`,
      `CREATE INDEX IF NOT EXISTS "files_share_token_idx" ON "files" ("share_token")`,
      `CREATE INDEX IF NOT EXISTS "file_chunks_file_idx" ON "file_chunks" ("file_thread_id")`,
      `CREATE INDEX IF NOT EXISTS "file_chunks_message_idx" ON "file_chunks" ("discord_message_id")`,
      `CREATE INDEX IF NOT EXISTS "file_chunks_order_idx" ON "file_chunks" ("file_thread_id", "chunk_index")`,

      // Transfer logs indexes
      `CREATE INDEX IF NOT EXISTS "transfer_logs_file_idx" ON "transfer_logs" ("file_thread_id")`,
      `CREATE INDEX IF NOT EXISTS "transfer_logs_user_idx" ON "transfer_logs" ("user_id")`,
      `CREATE INDEX IF NOT EXISTS "transfer_logs_type_idx" ON "transfer_logs" ("type")`,
      `CREATE INDEX IF NOT EXISTS "transfer_logs_status_idx" ON "transfer_logs" ("status")`,
      `CREATE INDEX IF NOT EXISTS "transfer_logs_created_idx" ON "transfer_logs" ("created_at")`,
      `CREATE INDEX IF NOT EXISTS "transfer_logs_share_token_idx" ON "transfer_logs" ("share_token")`,

      // File permissions indexes
      `CREATE INDEX IF NOT EXISTS "file_permissions_file_user_idx" ON "file_permissions" ("file_thread_id", "user_id")`,
      `CREATE INDEX IF NOT EXISTS "file_permissions_user_idx" ON "file_permissions" ("user_id")`,
      `CREATE INDEX IF NOT EXISTS "file_permissions_file_idx" ON "file_permissions" ("file_thread_id")`,

      // Permissions indexes
      `CREATE INDEX IF NOT EXISTS "permissions_name_idx" ON "permissions" ("name")`,

      // Folder permissions indexes
      `CREATE INDEX IF NOT EXISTS "folder_permissions_user_folder_idx" ON "folder_permissions" ("user_id", "folder_id")`,
      `CREATE INDEX IF NOT EXISTS "folder_permissions_folder_idx" ON "folder_permissions" ("folder_id")`,
      `CREATE INDEX IF NOT EXISTS "folder_permissions_user_idx" ON "folder_permissions" ("user_id")`,
    ];

    for (const statement of indexStatements) {
      sqlite.exec(statement);
    }

    console.log("✓ Database indexes created");

    // Seed initial data (file types, permissions, etc.)
    console.log("🌱 Seeding initial data...");
    try {
      await seedDatabase();
      console.log("✓ Database seeding completed");
    } catch (error) {
      console.error("⚠️ Database seeding failed:", error);
      // Don't exit on seeding failure, just warn
    }

    console.log("✅ Database initialization completed successfully!");

    // Test the database connection
    const result = sqlite.prepare("SELECT 1 as test").get() as { test: number };
    console.log(
      `📊 Database connection test: ${result.test === 1 ? "SUCCESS" : "FAILED"}`
    );

    // Verify tables exist
    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    console.log(`📋 Tables created: ${tables.map((t) => t.name).join(", ")}`);
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
}

// Run initialization if this file is executed directly
if (require.main === module) {
  // Check for command line arguments
  const args = process.argv.slice(2);
  const forceReset = args.includes("--force-reset") || args.includes("--reset");

  if (forceReset) {
    console.log("⚠️ Force reset requested via command line argument");
  }

  initializeDatabase(forceReset)
    .then(() => {
      console.log("Database ready!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed to initialize database:", error);
      process.exit(1);
    });
}

export { initializeDatabase };
