# Stashcord: Gemini CLI Project Brief (v2)

## 1. Project Overview

**Stashcord** is a full-stack monorepo application that provides a cloud storage service with a file-explorer UI styled like Discord. It uniquely uses Discord's own infrastructure for file storage. All interactions with Discord are handled by a backend bot via the REST API; there are **no slash commands or direct user interactions within the Discord client**.

### Core Logic

-   **Folder**: A new Discord Text Channel created in a designated server.
-   **File**: A new Discord Thread created inside the corresponding folder's channel.
-   **File Storage**: The file is split into chunks (max 25MB) and each chunk is uploaded as a message attachment within the file's thread.
-   **Metadata**: All mapping between folders, files, chunks, and Discord IDs is stored in a local SQLite database.

---

## 2. Technology Stack

-   **Monorepo**: pnpm Workspaces
-   **Backend**: Node.js, Express, `discord.js` (REST only), `multer`, Drizzle ORM, `better-sqlite3`
-   **Frontend**: Next.js (App Router), TypeScript, TailwindCSS, ShadCN UI
-   **Authentication**: Discord OAuth2, managed by the backend with JWTs for session control.

---

## 3. Project Structure

The project will be a pnpm monorepo with the following structure:

```bash
stashcord/
├── apps/
│   ├── frontend/    # Next.js Frontend
│   └── backend/     # Node.js/Express Backend & Discord Bot
├── packages/
│   ├── db/          # Drizzle ORM schema, migrations, and DB client
│   └── api/         # Type-safe API client for frontend/backend communication
├── .env.example
├── pnpm-workspace.yaml
└── package.json
```

---

## 4. Phase 1: Setup & Configuration

### 4.1. Environment Variables

Create a `.env` file based on this example:

```ini
# Discord Bot Application (Backend)
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_GUILD_ID= # The ID of the server where the bot will operate

# Next.js Application (Frontend)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api # Backend URL
NEXT_PUBLIC_DISCORD_CLIENT_ID= # Same as above for frontend login link

# Application Security
JWT_SECRET=generate-a-strong-random-secret-key
```

### 4.2. Database Schema (`packages/db/schema.ts`)

Use Drizzle ORM with `better-sqlite3`. The schema is as follows:

```typescript
import { sql } from "drizzle-orm";
import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";

// User authenticated via Discord OAuth2
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // Discord User ID
  username: text('username').notNull(),
  discriminator: text('discriminator').notNull(),
  avatar: text('avatar'),
});

// Maps to a Discord Text Channel
export const folders = sqliteTable('folders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  discordChannelId: text('discord_channel_id').notNull().unique(),
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`),
});

// Maps to a Discord Thread
export const files = sqliteTable('files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  folderId: integer('folder_id').notNull().references(() => folders.id, { onDelete: 'cascade' }),
  discordThreadId: text('discord_thread_id').notNull().unique(),
  userId: text('user_id').notNull().references(() => users.id),
  size: integer('size').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`),
});

// Maps to a Message with an Attachment in a Thread
export const chunks = sqliteTable('chunks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fileId: integer('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  discordMessageId: text('discord_message_id').notNull(),
  cdnUrl: text('cdn_url').notNull(),
});
```

---

## 5. Phase 2: Backend API (`apps/backend`)

Build an Express API server. All protected routes must be authenticated via a JWT middleware that validates the token and attaches the user's Discord ID to the request.

### 5.1. Authentication Endpoints

- **`GET /api/auth/discord`**: Redirects to the Discord OAuth2 authorization URL.
- **`GET /api/auth/discord/callback`**:
    1. Handles the callback from Discord, exchanging the `code` for an `access_token`.
    2. Fetches user profile from Discord (`/users/@me`).
    3. Creates or updates the user in the `users` table.
    4. Generates a JWT containing the user's ID.
    5. Redirects to the frontend homepage (`/`), setting the JWT in an `httpOnly` cookie.

### 5.2. Core API Endpoints

- **`GET /api/folders`** `(Authenticated)`
  - Fetches all folders from the `folders` table belonging to the authenticated user.
  - Returns a JSON array of folders.

- **`POST /api/folders`** `(Authenticated)`
  - Body: `{ "name": "My New Folder" }`
  - Uses the `discord.js` REST client to create a new text channel in the `DISCORD_GUILD_ID`.
  - Saves the new folder's `name` and the returned `channel.id` to the `folders` table.
  - Returns the newly created folder object.

- **`GET /api/files?folderId=:folderId`** `(Authenticated)`
  - Fetches all files from the `files` table for the given `folderId`, ensuring the folder belongs to the user.
  - Returns a JSON array of files.

- **`POST /api/upload`** `(Authenticated)`
  - Handles `multipart/form-data` with `multer`.
  - Expects fields: `file` (the file data), `folderId` (database ID).
  - **Logic**:
        1. Retrieve the `discordChannelId` from the `folderId`.
        2. Create a new Discord **thread** in that channel, named after the file.
        3. Insert a record into the `files` table and get the new `fileId`.
        4. Split the file buffer into chunks (max **24MB**).
        5. For each chunk, send a message with the chunk as an attachment to the thread.
        6. Save the returned `message.id` and `attachment.url` (the CDN link) to the `chunks` table for each chunk.
  - Returns the final file metadata upon completion.

- **`GET /api/download/:fileId`** `(Authenticated)`
  - Validates the user owns the file.
  - Fetches all `chunks` for the `fileId`, ordered by `chunkIndex`.
  - Sets appropriate `Content-Disposition` headers for download.
  - **Streams** each chunk from its `cdnUrl` directly to the client response. **Do not buffer the entire file in memory.**

- **`DELETE /api/file/:fileId`** `(Authenticated)`
  - Validates the user owns the file.
  - Retrieves the `discordThreadId` from the `files` table.
  - Uses the `discord.js` REST client to delete the entire thread.
  - Deletes the file record from the database (chunks will be deleted via `onDelete: 'cascade'`).
  - Returns a 200 OK status.

---

## 6. Phase 3: Frontend UI (`apps/frontend`)

Build the interface using Next.js (App Router) and ShadCN UI components.

- **API Client**: This frontend will consume the shared `packages/api` client to make type-safe requests to the backend.
- **Login Page (`/login`)**: Contains a single "Login with Discord" button that links to the backend's `/api/auth/discord` route.
- **Auth Provider**: A client-side context to manage user state and JWT, protecting client-side routes.
- **Main Layout**: A two-panel layout (Resizable Sidebar + Main Content Area).
- **Sidebar (`FolderList`)**:
  - Fetches and displays folders from `GET /api/folders`.
  - Highlights the active folder.
  - Includes a "+" button to open a `Dialog` for creating a new folder (`POST /api/folders`).
- **Main View (`FileList`)**:
  - When a folder is selected, fetches and displays its files from `GET /api/files?folderId=...`.
  - Renders `FileCard` components for each file.
  - Each `FileCard` has a **Download** button (links to `/api/download/:fileId`) and a **Delete** button (triggers `DELETE /api/file/:fileId` after `AlertDialog` confirmation).
- **Upload Modal**:
  - Triggered by an "Upload" button.
  - Uses a drag-and-drop area (`react-dropzone`).
  - On file drop, shows a list of files to be uploaded with progress indicators.
  - Submits each file via a `FormData` POST request to `/api/upload`, including the active `folderId`.

---

## 7. Instructions for Gemini

Based on this brief, generate the complete source code for the Stashcord application.

- Organize the output by file path, respecting the updated monorepo structure.
- Implement the Drizzle schema and API endpoints exactly as specified.
- Ensure the `discord.js` client is used in **REST-only mode**.
- Implement the chunking and streaming logic correctly to handle large files efficiently.
