import { useState, useEffect, useCallback } from "react";
import { FolderItem, FileItem } from "@/types/stash";

const API_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";

export function useStashData() {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<FolderItem | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>(["Stash"]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);

  const loadFolders = useCallback(async () => {
    try {
      console.log("🔍 Loading folders...");
      console.log("📡 API URL:", `${API_URL}/folders`);
      setIsLoadingFolders(true);

      const response = await fetch(`${API_URL}/folders`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("📡 Folders response status:", response.status);
      console.log(
        "📡 Folders response headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (response.ok) {
        const result = await response.json();

        // The API might return data directly or wrapped in a data property
        const foldersData = Array.isArray(result) ? result : result.data || [];

        console.log("✅ Folders loaded:", foldersData);
        console.log("✅ Raw API response:", result);

        // Transform backend data to frontend format
        const transformedFolders: FolderItem[] = foldersData.map(
          (folder: {
            discordForumId: string; // Now the primary key
            name: string;
            createdAt: string | null;
            updatedAt: string | null;
          }) => ({
            id: folder.discordForumId, // Use discordForumId as the ID
            name: folder.name,
            type: "folder" as const,
            discordForumId: folder.discordForumId,
            files: [], // Files will be loaded separately when folder is opened
            modified: folder.createdAt
              ? new Date(folder.createdAt).toLocaleDateString()
              : new Date().toLocaleDateString(), // Use current date if createdAt is null
          })
        );

        console.log("🔄 Transformed folders:", transformedFolders);
        setFolders(transformedFolders);
      } else {
        console.error("❌ Failed to load folders:", response.status);
        const errorText = await response.text();
        console.error("❌ Error response:", errorText);

        // If authentication failed, log detailed info
        if (response.status === 401) {
          console.error("🔒 Authentication failed - user needs to log in");
          console.error("🍪 Checking if cookies are being sent...");
        }
      }
    } catch (error) {
      console.error("💥 Error loading folders:", error);
    } finally {
      setIsLoadingFolders(false);
    }
  }, []);

  const loadFiles = useCallback(
    async (folderId: string): Promise<FileItem[]> => {
      try {
        console.log("🔍 Loading files for folder:", folderId);

        const response = await fetch(`${API_URL}/files?folderId=${folderId}`, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const result = await response.json();
          // The API returns files directly as an array
          const filesData = Array.isArray(result) ? result : result.data || [];

          console.log("✅ Files loaded:", filesData);
          console.log("✅ Raw API response:", result);

          // Transform backend data to frontend format
          const transformedFiles: FileItem[] = filesData.map(
            (file: {
              threadId: string;
              name: string;
              originalName: string;
              size: number;
              mimeType: string;
              isStarred: boolean;
              createdAt: string | null;
              thumbnailUrl?: string | null;
            }) => {
              // Determine file type based on MIME type
              let fileType:
                | "document"
                | "image"
                | "audio"
                | "video"
                | "archive" = "document";
              if (file.mimeType.startsWith("image/")) {
                fileType = "image";
              } else if (file.mimeType.startsWith("audio/")) {
                fileType = "audio";
              } else if (file.mimeType.startsWith("video/")) {
                fileType = "video";
              } else if (
                file.mimeType.includes("zip") ||
                file.mimeType.includes("tar") ||
                file.mimeType.includes("rar")
              ) {
                fileType = "archive";
              }

              // Format file size
              const formatSize = (bytes: number): string => {
                if (bytes === 0) return "0 B";
                const k = 1024;
                const sizes = ["B", "KB", "MB", "GB"];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return (
                  parseFloat((bytes / Math.pow(k, i)).toFixed(1)) +
                  " " +
                  sizes[i]
                );
              };

              return {
                id: file.threadId, // Use threadId as the file ID
                name: file.originalName,
                type: "file" as const,
                fileType,
                size: formatSize(file.size),
                modified: file.createdAt
                  ? new Date(file.createdAt).toLocaleDateString()
                  : new Date().toLocaleDateString(), // Fallback to current date if null
                starred: file.isStarred || false,
                thumbnailUrl: file.thumbnailUrl,
              };
            }
          );

          return transformedFiles;
        } else {
          console.error("❌ Failed to load files:", response.status);
          return [];
        }
      } catch (error) {
        console.error("💥 Error loading files:", error);
        return [];
      }
    },
    []
  );

  const navigateToFolder = useCallback(
    async (folder: FolderItem) => {
      console.log("📁 Navigating to folder:", folder.name);
      // Load files for this folder
      const files = await loadFiles(folder.id);
      const folderWithFiles = { ...folder, files };

      setCurrentFolder(folderWithFiles);
      setCurrentPath((prev) => [...prev, folder.name]);
    },
    [loadFiles]
  );

  const navigateToPath = useCallback(
    (pathIndex: number) => {
      if (pathIndex === 0) {
        // Navigate back to root
        setCurrentFolder(null);
        setCurrentPath(["Stash"]);
      } else {
        // Navigate to a specific breadcrumb level
        const newPath = currentPath.slice(0, pathIndex + 1);
        setCurrentPath(newPath);
        if (newPath.length === 1) {
          setCurrentFolder(null);
        }
      }
    },
    [currentPath]
  );

  const goBack = useCallback(() => {
    if (currentPath.length > 1) {
      const newPath = currentPath.slice(0, -1);
      setCurrentPath(newPath);
      if (newPath.length === 1) {
        setCurrentFolder(null);
      }
    }
  }, [currentPath]);

  // Load folders on mount
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  return {
    folders,
    currentFolder,
    currentPath,
    isLoadingFolders,
    loadFolders,
    loadFiles,
    navigateToFolder,
    navigateToPath,
    goBack,
    setCurrentFolder,
    setFolders,
  };
}
