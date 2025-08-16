# Stashcord 🚀

<div align="center">

![Stashcord Logo](https://img.shields.io/badge/Stashcord-Cloud%20Storage-5865f2?style=for-the-badge&logo=discord)

**A revolutionary self-hosted cloud storage solution that transforms Discord into your personal file storage backend**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Docker](https://img.shields.io/badge/Docker-Supported-2496ED?logo=docker)](./Dockerfile)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Powered-blue?logo=typescript)](https://www.typescriptlang.org/)

[Features](#features) • [Quick Start](#quick-start) • [Installation](#installation) • [Documentation](#documentation) • [Contributing](#contributing)

</div>

---

## 🎯 What is Stashcord?

Stashcord is an innovative self-hosted cloud storage solution that cleverly leverages Discord's robust infrastructure as a free and unlimited file backend. It provides a sleek, modern web interface for managing your files and folders while all the storage magic happens seamlessly behind the scenes using Discord's servers.

### 🧠 The Genius Behind It

- **Folders** → Discord **Forum Channels**
- **Files** → Discord **Forum Threads**
- **File Storage** → **Message Attachments** (auto-chunked up to 25MB each)
- **Metadata** → Local SQLite database for lightning-fast access

All Discord interactions are handled invisibly by a backend bot using Discord's REST API—no slash commands or manual Discord interactions required!

---

## ✨ Features

### 🗂️ **File Management**
- **Drag & Drop Upload** with real-time progress tracking
- **Chunked Storage** for files of any size (automatically splits large files)
- **Smart File Organization** with folder-based structure
- **Advanced Search** and filtering capabilities
- **File Previews** and thumbnail generation
- **Batch Operations** (upload, download, delete multiple files)

### 🔐 **Security & Privacy**
- **Discord OAuth2** authentication
- **Granular Permissions** system (read, write, delete, admin)
- **Secure File Sharing** with expiring links and password protection
- **Audit Logging** for all user actions
- **Session Management** with automatic expiry

### 🎨 **Modern Interface**
- **Discord-inspired** dark theme with AMOLED support
- **Responsive Design** that works on all devices
- **Real-time Updates** via WebSocket connections
- **Customizable Views** (grid, list, compact modes)
- **Transfer Manager** with progress tracking
- **Keyboard Shortcuts** for power users

### 📊 **Advanced Features**
- **Storage Analytics** and usage tracking
- **Duplicate Detection** and deduplication
- **Automatic Thumbnails** for images and videos
- **File Versioning** and backup capabilities
- **Team Workspaces** for collaboration
- **Public Link Sharing** with access controls

### ⚡ **Performance**
- **Streaming Downloads** (no memory buffering for large files)
- **Concurrent Uploads** for faster transfers
- **Smart Caching** for frequently accessed files
- **CDN Integration** via Discord's global CDN
- **Database Optimization** with proper indexing

---

## 🏗️ Architecture

### Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Monorepo** | pnpm Workspaces | Efficient dependency management |
| **Backend** | Node.js + Express + TypeScript | RESTful API server |
| **Frontend** | Next.js 15 + App Router | Modern React framework |
| **Database** | Drizzle ORM + SQLite | Type-safe database operations |
| **Discord Integration** | discord.js (REST mode) | File storage backend |
| **Authentication** | Discord OAuth2 + JWT | Secure user sessions |
| **UI Framework** | TailwindCSS + ShadCN/UI | Beautiful, accessible components |
| **Real-time** | Socket.IO | Live transfer updates |

### Project Structure

```
stashcord/
├── 📁 apps/
│   ├── 🖥️ backend/          # Node.js API server & Discord bot
│   │   ├── src/
│   │   │   ├── routes/      # API endpoints
│   │   │   ├── services/    # Business logic
│   │   │   ├── middleware/  # Auth, validation, etc.
│   │   │   ├── db/         # Database schema & migrations
│   │   │   └── bot/        # Discord bot client
│   │   └── uploads/        # Temporary file storage
│   └── 🌐 frontend/         # Next.js web application
│       ├── src/
│       │   ├── app/        # App Router pages
│       │   ├── components/ # Reusable UI components
│       │   ├── hooks/      # Custom React hooks
│       │   ├── store/      # Zustand state management
│       │   └── types/      # TypeScript definitions
├── 📦 packages/
│   └── api/                # Shared API client
├── 📋 docs/                # Documentation
├── 🐳 Dockerfile          # Container deployment
└── 📝 package.json        # Monorepo configuration
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+** and **pnpm**
- **Discord Application** ([Create one here](https://discord.com/developers/applications))
- **Discord Server** where the bot will operate

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/stashcord.git
cd stashcord

# Install dependencies
pnpm install
```

### 2. Environment Setup

Create a [`.env`](.env.example) file in the root directory:

```ini
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_discord_application_id
DISCORD_CLIENT_SECRET=your_discord_application_secret
DISCORD_GUILD_ID=your_discord_server_id

# Application URLs
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000

# Security
JWT_SECRET=your_super_secret_jwt_key_here

# Environment
NODE_ENV=development
```

### 3. Database Setup

```bash
# Initialize database
pnpm --filter backend db:init

# Optional: Seed with sample data
pnpm --filter backend db:seed
```

### 4. Start Development

```bash
# Start both frontend and backend
pnpm dev

# Or start individually
pnpm dev:backend    # API server (port 3001)
pnpm dev:frontend   # Web app (port 3000)
```

🎉 **That's it!** Visit [`http://localhost:3000`](http://localhost:3000) to access Stashcord.

---

## 📚 Installation Guide

### 🐳 Docker Deployment (Recommended)

The easiest way to deploy Stashcord is using Docker:

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t stashcord .
docker run -p 3000:3000 --env-file .env stashcord
```

### 🏗️ Manual Production Deployment

```bash
# 1. Build applications
pnpm build

# 2. Start production servers
pnpm --filter backend start    # API server
pnpm --filter frontend start   # Web application

# 3. Use a reverse proxy (nginx/caddy) to serve both
```

### 🔧 Discord Bot Setup

1. **Create Discord Application**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Note down the Application ID and Client Secret

2. **Create Bot User**
   - Navigate to "Bot" section
   - Create a bot and copy the token
   - Enable required intents (if needed)

3. **Invite Bot to Server**
   - Go to "OAuth2" → "URL Generator"
   - Select scopes: `bot`, `applications.commands`
   - Select permissions: `Manage Channels`, `Send Messages`, `Attach Files`
   - Use the generated URL to invite the bot

4. **Configure Bot Permissions**
   - Ensure the bot has access to create/manage forum channels
   - Grant file attachment permissions

---

## 🛠️ API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/auth/discord` | Initiate Discord OAuth2 flow |
| `GET` | `/api/auth/discord/callback` | Handle OAuth2 callback |
| `POST` | `/api/auth/logout` | Invalidate user session |

### Core API Endpoints

#### Folders (Forum Channels)

```typescript
GET    /api/folders              // List user folders
POST   /api/folders              // Create new folder
PUT    /api/folders/:id          // Update folder
DELETE /api/folders/:id          // Delete folder
GET    /api/folders/:id/files    // List files in folder
```

#### Files (Forum Threads)

```typescript
GET    /api/files                // List all user files
GET    /api/files/:id            // Get file metadata
POST   /api/files/upload         // Upload new file(s)
GET    /api/files/:id/download   // Download file
DELETE /api/files/:id            // Delete file
PUT    /api/files/:id            // Update file metadata
```

#### Sharing & Permissions

```typescript
POST   /api/share                // Create share link
GET    /api/share/:token         // Access shared resource
DELETE /api/share/:token         // Revoke share link
GET    /api/permissions          // List user permissions
POST   /api/permissions          // Grant permissions
```

#### Transfer Management

```typescript
GET    /api/transfers            // List transfer history
GET    /api/transfers/:id        // Get transfer status
POST   /api/transfers/cancel     // Cancel active transfer
```

### Request/Response Examples

#### Upload File

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('folderId', 'forum_channel_id');

const response = await fetch('/api/files/upload', {
  method: 'POST',
  body: formData,
  credentials: 'include'
});

const result = await response.json();
```

#### Create Share Link

```javascript
const shareLink = await fetch('/api/share', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    resourceType: 'file',
    resourceId: 'thread_id',
    expiresIn: 168, // hours
    requiresAuth: false,
    allowDownload: true
  }),
  credentials: 'include'
});
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DISCORD_BOT_TOKEN` | Discord bot token | - | ✅ |
| `DISCORD_CLIENT_ID` | Discord application ID | - | ✅ |
| `DISCORD_CLIENT_SECRET` | Discord application secret | - | ✅ |
| `DISCORD_GUILD_ID` | Target Discord server ID | - | ✅ |
| `JWT_SECRET` | JWT signing secret | - | ✅ |
| `NODE_ENV` | Environment mode | `development` | ❌ |
| `DATABASE_URL` | SQLite database path | `./data.db` | ❌ |
| `UPLOAD_TEMP_DIR` | Temporary upload directory | `./uploads` | ❌ |
| `MAX_FILE_SIZE` | Maximum file size (bytes) | `100MB` | ❌ |
| `MAX_CHUNK_SIZE` | Discord chunk size (bytes) | `25MB` | ❌ |

### User Settings

Users can customize their experience through the settings panel:

- **Transfer Settings**: Concurrent uploads, chunk size, retry attempts
- **UI Preferences**: Theme, view mode, notifications
- **Privacy**: Default share expiry, public sharing permissions
- **Storage**: Auto-cleanup, compression, duplicate detection

### System Settings

Administrators can configure system-wide settings:

- **File type restrictions**
- **Storage quotas**
- **Rate limiting**
- **Audit logging levels**

---

## 🧪 Development

### Getting Started

```bash
# Install dependencies
pnpm install

# Start development environment
pnpm dev

# Run database migrations
pnpm --filter backend db:init

# Seed test data
pnpm --filter backend db:seed
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start both frontend and backend in development |
| `pnpm build` | Build both applications for production |
| `pnpm --filter backend dev` | Start only the backend API server |
| `pnpm --filter frontend dev` | Start only the frontend application |
| `pnpm --filter backend db:init` | Initialize database schema |
| `pnpm --filter backend db:reset` | Reset database (⚠️ destructive) |
| `pnpm --filter backend db:seed` | Populate database with sample data |

### Database Operations

```bash
# Safe database initialization (preserves existing data)
pnpm --filter backend db:init

# Reset database (⚠️ DESTRUCTIVE - deletes all data)
pnpm --filter backend db:reset

# Seed with sample data
pnpm --filter backend db:seed
```

### Code Structure Guidelines

- **Backend**: Follow RESTful API principles
- **Frontend**: Use App Router with server components where possible
- **Database**: Leverage Drizzle ORM for type safety
- **Types**: Maintain shared types in [`packages/api`](packages/api)
- **Components**: Create reusable UI components in [`apps/frontend/src/components`](apps/frontend/src/components)

---

## 🐛 Troubleshooting

### Common Issues

#### Discord Bot Permissions
```
Error: Missing Access (50001)
```
**Solution**: Ensure your bot has the following permissions in your Discord server:
- Manage Channels
- Send Messages
- Attach Files
- Create Forum Posts
- Manage Threads

#### Database Connection Issues
```
Error: SQLITE_BUSY: database is locked
```
**Solution**: Make sure no other instance is running and restart the application:
```bash
pnpm --filter backend db:reset  # If safe to reset data
# OR
rm -f apps/backend/data.db     # Delete database file (⚠️ data loss)
pnpm --filter backend db:init  # Reinitialize
```

#### Upload Failures
```
Error: File too large or network timeout
```
**Solution**: Check your Discord server's upload limits and network connectivity:
- Discord Nitro servers: 100MB per file
- Regular Discord servers: 25MB per file
- Verify your `MAX_CHUNK_SIZE` environment variable

#### OAuth2 Redirect Issues
```
Error: redirect_uri_mismatch
```
**Solution**: Ensure your Discord application's redirect URLs match your environment:
- Development: `http://localhost:3001/api/auth/discord/callback`
- Production: `https://yourdomain.com/api/auth/discord/callback`

### Debug Mode

Enable debug logging by setting environment variables:

```bash
ENABLE_DEBUG_MODE=true
LOG_LEVEL=debug
pnpm dev
```

### Getting Help

1. Check the [Issues](https://github.com/yourusername/stashcord/issues) page
2. Review the [troubleshooting guide](./docs/troubleshooting.md)
3. Join our [Discord community](https://discord.gg/stashcord) for support
4. Consult the [FAQ](./docs/faq.md)

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help make Stashcord better:

### Quick Contribution Guide

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create** a new branch for your feature/fix
4. **Develop** your changes with proper tests
5. **Submit** a pull request

```bash
# Fork and clone
git clone https://github.com/yourusername/stashcord.git
cd stashcord

# Create feature branch
git checkout -b feature/amazing-new-feature

# Make changes and commit
git add .
git commit -m "feat: add amazing new feature"

# Push and create PR
git push origin feature/amazing-new-feature
```

### Development Guidelines

- **Code Style**: Follow the existing TypeScript/React patterns
- **Testing**: Add tests for new features (we use Jest)
- **Documentation**: Update relevant documentation
- **Commit Messages**: Use conventional commits (feat, fix, docs, etc.)

### Areas We Need Help

- 🔧 **Backend API improvements**
- 🎨 **UI/UX enhancements** 
- 📱 **Mobile responsiveness**
- 🧪 **Test coverage**
- 📚 **Documentation**
- 🌍 **Internationalization**
- 🔒 **Security auditing**

### Contribution Types

| Type | Description | Difficulty |
|------|-------------|------------|
| 🐛 **Bug Fixes** | Fix existing issues | Beginner |
| ✨ **Features** | Add new functionality | Intermediate |
| 📚 **Documentation** | Improve docs/guides | Beginner |
| 🎨 **UI/UX** | Design improvements | Intermediate |
| ⚡ **Performance** | Optimize speed/memory | Advanced |
| 🔒 **Security** | Security enhancements | Advanced |

---

## 📖 Additional Resources

### Documentation

- [📋 **Project Plan**](./PROJECT_PLAN.md) - Detailed project specifications
- [🎨 **Design System**](./DARK_MODE_PALETTE.md) - Color palette and theming
- [🗄️ **Database Schema**](./DATABASE.md) - Database structure and management
- [📋 **Roadmap**](./PLANS.md) - Future development plans
- [📝 **Change Log**](./change_logs/) - Version history

### Future Plans

- [🔗 **File Sharing System**](./future_plans/file_sharing_plan.md)
- [👁️ **In-app Previews**](./future_plans/in_app_previews_plan.md)
- [🌐 **Public Links**](./future_plans/public_links_plan.md)
- [👥 **Team Workspaces**](./future_plans/team_workspaces_plan.md)
- [🗑️ **Trash System**](./future_plans/trash_system_plan.md)

### Community

- [💬 **Discord Server (comming soon)**](https://discord.gg/stashcord) - Community support and discussions
- [🐛 **Bug Reports**](https://github.com/⚠️/stashcord/issues/new?template=bug_report.md)
- [💡 **Feature Requests**](https://github.com/yourusername/stashcord/issues/new?template=feature_request.md)
- [🔒 **Security Reports**](mailto:security@stashcord.com)

---

## 📄 License

This project is licensed under the **Apache License 2.0** - see the [LICENSE](LICENSE) file for details.

### What this means:
- ⚠️ **Commercial Use** - You can use this for business (Not Advised)
- ✅ **Modification** - You can modify the code
- ✅ **Distribution** - You can distribute the software
- ✅ **Private Use** - You can use it privately
- ⚠️ **Trademark** - Does not grant trademark rights
- ⚠️ **Liability** - No warranty or liability provided

---

## 🙏 Acknowledgments

Special thanks to:

- **Discord** for providing the robust infrastructure that makes this possible
- **Vercel** for the amazing Next.js framework
- **Drizzle Team** for the excellent TypeScript ORM
- **ShadCN** for the beautiful UI component library
- **All Contributors** who have helped improve Stashcord

---

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/cyxploiter/stashcord?style=social)
![GitHub forks](https://img.shields.io/github/forks/cyxploiter/stashcord?style=social)
![GitHub issues](https://img.shields.io/github/issues/cyxploiter/stashcord)
![GitHub pull requests](https://img.shields.io/github/issues-pr/cyxploiter/stashcord)

---

<div align="center">

*Transform your Discord server into a powerful cloud storage solution*

[⬆ Back to Top](#stashcord-)

</div>
