export type ExplorerViewMode = "grid" | "list";

export interface FileItem {
  id: string;
  name: string;
  type: "file";
  fileType: "document" | "image" | "audio" | "video" | "archive";
  size: string;
  modified: string;
  starred?: boolean;
  thumbnailUrl?: string;
}

export interface FolderItem {
  id: string;
  name: string;
  type: "folder";
  discordForumId?: string;
  files: FileItem[];
  modified: string;
}

export interface ConflictData {
  existingFile: {
    id: number;
    name: string;
    originalName: string;
    size: number;
    mimeType: string;
    folderId: number;
    uploadStatus: string;
    createdAt: string;
  };
  uploadedFile: {
    name: string;
    size: number;
    mimeType: string;
  };
  file: File;
  folderId: string;
}

export interface FileOperations {
  download: (fileId: string) => Promise<void>;
  delete: (fileId: string) => Promise<void>;
  star: (fileId: string, starred: boolean) => Promise<void>;
  rename: (fileId: string, newName: string) => Promise<void>;
  bulkDelete: (fileIds: string[]) => Promise<void>;
  bulkDownload: (fileIds: string[]) => Promise<void>;
}

export interface FolderOperations {
  create: (name: string) => Promise<void>;
  delete: (folderId: string) => Promise<void>;
  rename: (folderId: string, newName: string) => Promise<void>;
}

export interface ShareOperations {
  generateShareLink: (
    fileId: string,
    expiresInDays?: number
  ) => Promise<string>;
}
