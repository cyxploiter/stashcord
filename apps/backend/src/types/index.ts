import { Request } from "express";

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        avatar?: string;
      };
      userId?: string;
    }
  }
}

// Authenticated request type
export interface AuthenticatedRequest extends Request {
  userId: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
}

// User types
export interface User {
  id: string;
  username: string;
  globalName?: string;
  avatar?: string;
  email?: string;
  verified: boolean;
  discordAccessToken?: string;
  discordRefreshToken?: string;
  discordTokenExpiry?: Date;
  hasStashcordGuild: boolean;
  stashcordGuildId?: string;
  lastGuildCheck?: Date;
  defaultViewMode: "category" | "explorer";
  storageQuotaUsed: number;
  storageQuotaLimit: number;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

// Category types
export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  iconName: string;
  color: string;
  ownerId: string;
  discordChannelId?: string;
  isPublic: boolean;
  isArchived: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// Folder types
export interface Folder {
  id: number;
  name: string;
  slug: string;
  description?: string;
  categoryId: number;
  ownerId: string;
  discordChannelId?: string;
  isArchived: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// File types
export interface File {
  id: number;
  name: string;
  originalName: string;
  slug: string;
  size: number;
  mimeType: string;
  fileTypeId?: number;
  hash?: string;
  folderId: number;
  ownerId: string;
  discordThreadId?: string;
  uploadStatus: "pending" | "uploading" | "completed" | "failed" | "deleted";
  isStarred: boolean;
  downloadCount: number;
  thumbnailUrl?: string;
  previewUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Request body types
export interface CreateCategoryRequest {
  name: string;
  description?: string;
  iconName?: string;
  color?: string;
  isPublic?: boolean;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  iconName?: string;
  color?: string;
  isPublic?: boolean;
}

export interface CreateFolderRequest {
  name: string;
  description?: string;
  categoryId: number;
}

export interface UpdateFolderRequest {
  name?: string;
  description?: string;
  categoryId?: number;
}

// Database query types
export interface CategoryWithStats extends Category {
  folderCount: number;
  isOwner: boolean;
}

export interface FolderWithStats extends Folder {
  fileCount: number;
  isOwner: boolean;
}

export interface FileWithMetadata extends File {
  fileType?: {
    name: string;
    displayName: string;
    iconName: string;
    color: string;
  };
  folder?: {
    name: string;
    slug: string;
  };
  category?: {
    name: string;
    slug: string;
  };
}
