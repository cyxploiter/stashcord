---
title: Stashcord
sdk: docker
app_port: 3000
---

# Stashcord

Stashcord is a self-hosted cloud storage solution that cleverly uses Discord's infrastructure as a free and robust file backend. It provides a sleek, Discord-style file explorer UI for managing your files and folders, while all the magic happens behind the scenes.

## How It Works

Stashcord transforms your Discord server into a personal file storage system:

-   **Folders** become Discord **Text Channels**.
-   **Files** become Discord **Threads** within those channels.
-   **File Storage**: Large files are automatically split into chunks (up to 25MB each) and uploaded as message attachments within the corresponding thread.
-   **Metadata**: A local SQLite database keeps track of all your files, folders, and the Discord IDs associated with them, ensuring everything is organized and easily accessible.

All interactions are handled by a backend bot using the Discord REST API. There are no slash commands or direct user interactions required within the Discord client itself—everything is managed through the web interface.

## Tech Stack

-   **Monorepo**: pnpm Workspaces
-   **Backend**: Node.js, Express, `discord.js` (REST only)
-   **Frontend**: Next.js (App Router), TypeScript, TailwindCSS, ShadCN UI
-   **Database**: Drizzle ORM with `better-sqlite3`
-   **Authentication**: Secure authentication via Discord OAuth2, with sessions managed by JWTs.

This project demonstrates an innovative approach to creating a personal cloud storage service by leveraging existing, reliable platforms.