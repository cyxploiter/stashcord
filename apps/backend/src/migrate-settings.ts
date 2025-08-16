import { db } from "./db";

// Migration to add missing user_settings columns
async function migrateUserSettings() {
  console.log("Starting user_settings migration...");

  try {
    // Get current table structure using $client
    const tableInfo = db.$client
      .prepare("PRAGMA table_info(user_settings)")
      .all();
    const existingColumns = tableInfo.map((col: any) => col.name);

    console.log("Existing columns:", existingColumns);

    // Define all expected columns with their SQL definitions
    const expectedColumns = [
      { name: "max_concurrent_uploads", sql: "INTEGER DEFAULT 3" },
      { name: "max_concurrent_downloads", sql: "INTEGER DEFAULT 5" },
      { name: "chunk_size", sql: "INTEGER DEFAULT 26214400" }, // 25MB
      { name: "retry_attempts", sql: "INTEGER DEFAULT 3" },
      { name: "timeout_duration", sql: "INTEGER DEFAULT 30000" },
      { name: "show_transfer_notifications", sql: "INTEGER DEFAULT 1" },
      { name: "auto_close_completed_transfers", sql: "INTEGER DEFAULT 1" },
      { name: "default_view", sql: 'TEXT DEFAULT "list"' },
      { name: "theme", sql: 'TEXT DEFAULT "auto"' },
      { name: "compact_mode", sql: "INTEGER DEFAULT 0" },
      { name: "auto_generate_thumbnails", sql: "INTEGER DEFAULT 1" },
      { name: "thumbnail_quality", sql: "INTEGER DEFAULT 85" },
      { name: "delete_confirmation", sql: "INTEGER DEFAULT 1" },
      { name: "show_hidden_files", sql: "INTEGER DEFAULT 0" },
      { name: "auto_cleanup_failed_uploads", sql: "INTEGER DEFAULT 1" },
      { name: "max_storage_alert_threshold", sql: "INTEGER DEFAULT 90" },
      { name: "compression_enabled", sql: "INTEGER DEFAULT 0" },
      { name: "duplicate_detection", sql: "INTEGER DEFAULT 1" },
      { name: "default_share_expiry", sql: "INTEGER DEFAULT 168" },
      { name: "allow_public_sharing", sql: "INTEGER DEFAULT 1" },
      { name: "share_password_required", sql: "INTEGER DEFAULT 0" },
      { name: "enable_debug_mode", sql: "INTEGER DEFAULT 0" },
      { name: "log_level", sql: 'TEXT DEFAULT "info"' },
      { name: "cache_duration", sql: "INTEGER DEFAULT 3600" },
    ];

    // Add missing columns
    for (const column of expectedColumns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`Adding column: ${column.name}`);
        try {
          db.$client
            .prepare(
              `ALTER TABLE user_settings ADD COLUMN ${column.name} ${column.sql}`
            )
            .run();
          console.log(`✓ Added column: ${column.name}`);
        } catch (error) {
          console.error(`✗ Failed to add column ${column.name}:`, error);
        }
      }
    }

    console.log("Migration completed successfully!");

    // Verify the final table structure
    const finalTableInfo = db.$client
      .prepare("PRAGMA table_info(user_settings)")
      .all();
    console.log(
      "Final columns:",
      finalTableInfo.map((col: any) => col.name)
    );
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

// Run migration
migrateUserSettings()
  .then(() => {
    console.log("Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });
