# Stashcord Database Management

## Database Initialization

The Stashcord backend now safely initializes the database without dropping existing tables on startup. This prevents data loss during development and production deployments.

## Available Commands

### Development Scripts (Backend Directory)

```bash
# Initialize database (safe - doesn't drop existing tables)
npm run db:init

# Reset database (DESTRUCTIVE - drops all tables and data)
npm run db:reset

# Seed database with initial data only
npm run db:seed
```

### Safety Features

1. **No Table Dropping on Startup**: The application will never drop tables during normal startup
2. **Environment Protection**: Database reset is blocked in production environment
3. **Confirmation Required**: Manual reset requires user confirmation
4. **Migration Support**: Automatic migration from old schema to new forum-based schema

### Database Schema

The database uses the following main tables:

- `users` - Discord user accounts and preferences
- `folders` - Discord forum channels for file organization
- `files` - Individual files stored as Discord forum posts
- `file_chunks` - File chunks for large file support
- `file_types` - Supported file type definitions
- `transfer_logs` - Real-time transfer activity tracking
- `file_permissions` - Granular file access permissions
- `permissions` - Permission type definitions
- `folder_permissions` - Folder-level access control

### Environment Variables

```bash
# Force database reset (development only)
FORCE_DB_RESET=true

# Environment setting (prevents reset in production)
NODE_ENV=production
```

### Manual Database Reset

If you need to reset the database during development:

```bash
# Option 1: Use the reset script (recommended)
npm run db:reset

# Option 2: Use init script with --force-reset flag
npx ts-node src/init-db.ts --force-reset

# Option 3: Set environment variable
FORCE_DB_RESET=true npm run db:init
```

**⚠️ Warning**: Database reset will permanently delete all user data, files, and settings. Only use during development.

### Migration Notes

The system automatically handles migration from the old category-based schema to the new forum-based schema. This migration:

- Removes the old `categories` table
- Updates the `folders` table to use `discord_forum_id` instead of `discord_category_id`
- Preserves existing folder and file data
- Only runs once when needed

### Production Deployment

For production deployments:

1. Set `NODE_ENV=production`
2. Never set `FORCE_DB_RESET=true`
3. The database will initialize safely without dropping tables
4. Existing data will be preserved
5. Schema migrations will run automatically if needed

This ensures zero-downtime deployments and data preservation in production environments.
