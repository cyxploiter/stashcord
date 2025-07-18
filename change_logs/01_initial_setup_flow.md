# Changelog: Initial Setup Flow Enhancement

This series of changes improves the initial setup experience for Stashcord administrators by allowing them to select their desired Discord server directly from the UI.

## Implemented Changes:

### Backend
- **New `app_settings` Table:** Added a new table to the database (`apps/backend/src/db/schema.ts`) to store global application settings in a key-value format.
- **Updated DB Init Script:** Modified `apps/backend/src/init-db.ts` to include the creation of the new `app_settings` table.
- **New Setup Route:** Created a new route file at `apps/backend/src/routes/setup.ts`.
- **`GET /api/setup/guilds`:** A new endpoint that fetches all Discord servers (guilds) owned by the authenticated user.
- **`POST /api/setup/complete`:** A new endpoint that saves the selected `guildId` to the database, finalizing the setup process.

### Frontend
- **Revamped Setup Page:** Completely rewrote the setup page at `apps/frontend/src/app/setup/page.tsx` to implement a new, three-step process.
- **Step 1: Server Selection:** The page now fetches and displays a list of the user's owned servers for them to choose from.
- **Step 2: Bot Invitation:** After selecting a server, the user is prompted to invite the bot directly to that server.
- **Step 3: Permission Verification:** The final step has the user confirm the bot's permissions before finalizing the setup.
- **Recommendation:** The UI includes a recommendation to use a new, empty server and provides a direct link to create one.