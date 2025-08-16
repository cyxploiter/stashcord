import { StateCreator } from "zustand";

interface FileItem {
  id: string;
  name: string;
  type: "file";
  fileType: "document" | "image" | "audio" | "video" | "archive";
  size: string;
  modified: string;
  starred?: boolean;
  thumbnailUrl?: string;
}

export interface Folder {
  id: string;
  name: string;
  type: "folder";
  discordForumId?: string;
  files: FileItem[];
  modified: string;
}

export interface FolderSlice {
  folders: Folder[];
  isLoading: boolean;
  fetchFolders: () => Promise<void>;
}

export const createFolderSlice: StateCreator<
  FolderSlice,
  [],
  [],
  FolderSlice
> = (set) => ({
  folders: [],
  isLoading: true,
  fetchFolders: async () => {
    set({ isLoading: true });
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";
      const response = await fetch(`${apiUrl}/folders`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch folders");
      }
      const result = await response.json();
      const foldersData = result.data || [];

      const transformedFolders: Folder[] = foldersData.map(
        (folder: {
          id: number;
          name: string;
          discordForumId?: string;
          createdAt: string;
        }) => ({
          id: folder.id.toString(),
          name: folder.name,
          type: "folder" as const,
          discordForumId: folder.discordForumId,
          files: [], // Files will be loaded separately
          modified: new Date(folder.createdAt).toLocaleDateString(),
        })
      );
      set({ folders: transformedFolders, isLoading: false });
    } catch (error) {
      console.error("Error fetching folders:", error);
      set({ isLoading: false });
    }
  },
});
