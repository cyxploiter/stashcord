import { useState, useCallback } from "react";
import {
  ConflictData,
  FileOperations,
  FolderOperations,
  ShareOperations,
} from "@/types/stash";
import { useAppStore } from "@/store";

const API_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";

// Extend Window interface for conflict resolution functions
declare global {
  interface Window {
    conflictResolve?: (value: unknown) => void;
    conflictReject?: (reason?: unknown) => void;
    currentConflictData?: ConflictData;
  }
}

interface UseFileOperationsProps {
  setConflictData: (data: ConflictData | null) => void;
  setShowConflictDialog: (show: boolean) => void;
  onFolderUpdate: () => void;
}

export function useFileOperations({
  setConflictData,
  setShowConflictDialog,
  onFolderUpdate,
}: UseFileOperationsProps) {
  const [isUploading, setIsUploading] = useState(false);

  // Access the store for transfer tracking
  const { addTransfer, updateTransfer } = useAppStore((state) => ({
    addTransfer: state.addTransfer,
    updateTransfer: state.updateTransfer,
  }));

  // Generate a unique transfer ID
  const generateTransferId = () =>
    `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Upload files with transfer tracking and performance optimization
  const uploadFiles = useCallback(
    async (files: FileList, folderId: string) => {
      setIsUploading(true);
      console.log(`🚀 Starting upload of ${files.length} file(s)...`);

      const uploadSingleFile = async (
        file: File,
        folderId: string
      ): Promise<unknown> => {
        const transferId = generateTransferId();

        // Create transfer record
        const transfer = {
          transferId,
          type: "upload" as const,
          status: "in_progress" as const,
          fileName: file.name,
          fileSize: file.size,
          bytesTransferred: 0,
          progressPercentage: 0,
          transferSpeed: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        addTransfer(transfer);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("folderId", folderId);

        try {
          console.log(
            `📤 Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(
              2
            )} MB)...`
          );

          const startTime = Date.now();

          const response = await fetch(`${API_URL}/files/upload`, {
            method: "POST",
            credentials: "include",
            body: formData,
          });

          const endTime = Date.now();
          const duration = (endTime - startTime) / 1000; // in seconds
          const speed = file.size / duration; // bytes per second

          if (response.ok) {
            const result = await response.json();
            console.log("✅ File uploaded successfully:", file.name);

            // Update transfer as completed
            updateTransfer({
              ...transfer,
              status: "completed",
              bytesTransferred: file.size,
              progressPercentage: 100,
              transferSpeed: speed,
              updatedAt: new Date(),
            });

            return result.data;
          } else if (response.status === 409) {
            // File conflict detected
            const conflictInfo = await response.json();
            console.log("⚠️ File conflict detected:", conflictInfo);

            // Update transfer as pending conflict resolution
            updateTransfer({
              ...transfer,
              status: "pending",
              updatedAt: new Date(),
            });

            // Show conflict dialog and wait for user decision
            return new Promise((resolve, reject) => {
              setConflictData({
                existingFile: conflictInfo.data.existingFile,
                uploadedFile: conflictInfo.data.uploadedFile,
                file,
                folderId,
              });
              setShowConflictDialog(true);

              // Store resolve/reject functions globally
              window.conflictResolve = resolve;
              window.conflictReject = reject;
            });
          } else {
            const errorData = await response.json();
            console.error(
              "❌ Failed to upload file:",
              file.name,
              errorData.error
            );

            // Update transfer as failed
            updateTransfer({
              ...transfer,
              status: "failed",
              errorMessage: errorData.error || "Upload failed",
              updatedAt: new Date(),
            });

            throw new Error(errorData.error || "Upload failed");
          }
        } catch (error) {
          console.error("💥 Error uploading file:", file.name, error);

          // Update transfer as failed
          updateTransfer({
            ...transfer,
            status: "failed",
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
            updatedAt: new Date(),
          });

          throw error;
        }
      };

      try {
        // Upload files concurrently for better performance (limit to 3 concurrent uploads)
        const uploadPromises = Array.from(files).map((file, index) => {
          // Add a small delay to prevent overwhelming the server
          return new Promise((resolve) =>
            setTimeout(
              () => resolve(uploadSingleFile(file, folderId)),
              index * 100
            )
          );
        });

        await Promise.all(uploadPromises);
        console.log("🎉 All files uploaded successfully");
        onFolderUpdate();
      } catch (error) {
        console.error("💥 Some files failed to upload:", error);
        onFolderUpdate(); // Still refresh to show any files that did upload
      } finally {
        setIsUploading(false);
      }
    },
    [
      addTransfer,
      updateTransfer,
      setConflictData,
      setShowConflictDialog,
      onFolderUpdate,
    ]
  );

  // Handle conflict resolution
  const handleConflictResolve = useCallback(
    async (action: "replace" | "keep" | "rename") => {
      const conflictData = window.currentConflictData;
      if (!conflictData) return;

      const { file, folderId, existingFile } = conflictData;

      try {
        if (action === "keep") {
          if (window.conflictResolve) {
            window.conflictResolve(existingFile);
          }
          return;
        }

        // For replace and rename actions
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folderId", folderId);
        formData.append("action", action);
        if (action === "replace" && existingFile.id) {
          formData.append("existingFileId", existingFile.id.toString());
        }

        const response = await fetch(
          `${API_URL}/files/upload-resolve-conflict`,
          {
            method: "POST",
            credentials: "include",
            body: formData,
          }
        );

        if (response.ok) {
          const result = await response.json();
          console.log("✅ Conflict resolved:", result);
          if (window.conflictResolve) {
            window.conflictResolve(result.data);
          }
        } else {
          const errorData = await response.json();
          console.error("❌ Failed to resolve conflict:", errorData.error);
          if (window.conflictReject) {
            window.conflictReject(
              new Error(errorData.error || "Conflict resolution failed")
            );
          }
        }
      } catch (error) {
        console.error("💥 Error resolving conflict:", error);
        if (window.conflictReject) {
          window.conflictReject(error);
        }
      } finally {
        setConflictData(null);
        setShowConflictDialog(false);
        delete window.conflictResolve;
        delete window.conflictReject;
        delete window.currentConflictData;
      }
    },
    [setConflictData, setShowConflictDialog]
  );

  // File operations with transfer tracking
  const handleFileOperations: FileOperations = {
    download: async (fileId: string) => {
      const transferId = generateTransferId();

      // Create download transfer record
      const transfer = {
        transferId,
        type: "download" as const,
        status: "in_progress" as const,
        fileName: `File ${fileId}`,
        bytesTransferred: 0,
        progressPercentage: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      addTransfer(transfer);

      try {
        window.open(`${API_URL}/files/download/${fileId}`, "_blank");

        // Update transfer as completed (we can't track actual download progress from browser)
        updateTransfer({
          ...transfer,
          status: "completed",
          progressPercentage: 100,
          updatedAt: new Date(),
        });
      } catch (error) {
        console.error("💥 Error downloading file:", error);
        updateTransfer({
          ...transfer,
          status: "failed",
          errorMessage:
            error instanceof Error ? error.message : "Download failed",
          updatedAt: new Date(),
        });
      }
    },

    delete: async (fileId: string) => {
      const transferId = generateTransferId();

      // Create delete transfer record
      const transfer = {
        transferId,
        type: "delete" as const,
        status: "in_progress" as const,
        fileName: `File ${fileId}`,
        bytesTransferred: 0,
        progressPercentage: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      addTransfer(transfer);

      try {
        const response = await fetch(`${API_URL}/files/file/${fileId}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (response.ok) {
          console.log("✅ File deleted successfully");
          updateTransfer({
            ...transfer,
            status: "completed",
            progressPercentage: 100,
            updatedAt: new Date(),
          });
          onFolderUpdate();
        } else {
          const errorData = await response.json();
          console.error("❌ Failed to delete file:", errorData.error);
          updateTransfer({
            ...transfer,
            status: "failed",
            errorMessage: errorData.error,
            updatedAt: new Date(),
          });
        }
      } catch (error) {
        console.error("💥 Error deleting file:", error);
        updateTransfer({
          ...transfer,
          status: "failed",
          errorMessage:
            error instanceof Error ? error.message : "Delete failed",
          updatedAt: new Date(),
        });
      }
    },

    star: async (fileId: string, starred: boolean) => {
      try {
        const response = await fetch(`${API_URL}/files/${fileId}`, {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isStarred: starred }),
        });

        if (response.ok) {
          console.log(
            `✅ File ${starred ? "starred" : "unstarred"} successfully`
          );
          onFolderUpdate();
        } else {
          const errorData = await response.json();
          console.error(
            "❌ Failed to update file star status:",
            errorData.error
          );
        }
      } catch (error) {
        console.error("💥 Error updating file star status:", error);
      }
    },

    rename: async (fileId: string, newName: string) => {
      try {
        const response = await fetch(`${API_URL}/files/${fileId}`, {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: newName }),
        });

        if (response.ok) {
          console.log("✅ File renamed successfully");
          onFolderUpdate();
        } else {
          const errorData = await response.json();
          console.error("❌ Failed to rename file:", errorData.error);
        }
      } catch (error) {
        console.error("💥 Error renaming file:", error);
      }
    },

    bulkDelete: async (fileIds: string[]) => {
      const transferId = generateTransferId();

      // Create bulk delete transfer record
      const transfer = {
        transferId,
        type: "delete" as const,
        status: "in_progress" as const,
        fileName: `${fileIds.length} files`,
        bytesTransferred: 0,
        progressPercentage: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      addTransfer(transfer);

      try {
        const response = await fetch(`${API_URL}/files/bulk-delete`, {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fileIds }),
        });

        if (response.ok) {
          console.log(`✅ Successfully deleted ${fileIds.length} files`);
          updateTransfer({
            ...transfer,
            status: "completed",
            progressPercentage: 100,
            updatedAt: new Date(),
          });
          onFolderUpdate();
        } else {
          const errorData = await response.json();
          console.error("❌ Failed to delete files:", errorData.error);
          updateTransfer({
            ...transfer,
            status: "failed",
            errorMessage: errorData.error,
            updatedAt: new Date(),
          });
        }
      } catch (error) {
        console.error("💥 Error during bulk delete:", error);
        updateTransfer({
          ...transfer,
          status: "failed",
          errorMessage:
            error instanceof Error ? error.message : "Bulk delete failed",
          updatedAt: new Date(),
        });
      }
    },

    bulkDownload: async (fileIds: string[]) => {
      const transferId = generateTransferId();

      // Create bulk download transfer record
      const transfer = {
        transferId,
        type: "download" as const,
        status: "in_progress" as const,
        fileName: `${fileIds.length} files`,
        bytesTransferred: 0,
        progressPercentage: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      addTransfer(transfer);

      try {
        const response = await fetch(`${API_URL}/files/bulk-download`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fileIds }),
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `files_${new Date().toISOString().split("T")[0]}.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          console.log(
            `✅ Successfully started download of ${fileIds.length} files`
          );

          updateTransfer({
            ...transfer,
            status: "completed",
            progressPercentage: 100,
            updatedAt: new Date(),
          });
        } else {
          const errorData = await response.json();
          console.error("❌ Failed to download files:", errorData);
          updateTransfer({
            ...transfer,
            status: "failed",
            errorMessage: errorData.error || "Bulk download failed",
            updatedAt: new Date(),
          });
        }
      } catch (error) {
        console.error("💥 Error during bulk download:", error);
        updateTransfer({
          ...transfer,
          status: "failed",
          errorMessage:
            error instanceof Error ? error.message : "Bulk download failed",
          updatedAt: new Date(),
        });
      }
    },
  };

  // Folder operations
  const handleFolderOperations: FolderOperations = {
    create: async (name: string) => {
      if (!name.trim()) return;

      try {
        console.log("📁 Creating folder:", name);

        const response = await fetch(`${API_URL}/folders`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            description: "",
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log("✅ Folder created successfully:", result.data);
          onFolderUpdate();
        } else {
          console.error("❌ Failed to create folder:", response.status);
          const errorData = await response.json();
          console.error("❌ Error details:", errorData);
        }
      } catch (error) {
        console.error("💥 Error creating folder:", error);
      }
    },

    delete: async (folderId: string) => {
      try {
        const response = await fetch(`${API_URL}/folders/${folderId}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (response.ok) {
          console.log("✅ Folder deleted successfully");
          onFolderUpdate();
        } else {
          const errorData = await response.json();
          console.error("❌ Failed to delete folder:", errorData.error);
        }
      } catch (error) {
        console.error("💥 Error deleting folder:", error);
      }
    },

    rename: async (folderId: string, newName: string) => {
      try {
        const response = await fetch(`${API_URL}/folders/${folderId}`, {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: newName }),
        });

        if (response.ok) {
          console.log("✅ Folder renamed successfully");
          onFolderUpdate();
        } else {
          const errorData = await response.json();
          console.error("❌ Failed to rename folder:", errorData.error);
        }
      } catch (error) {
        console.error("💥 Error renaming folder:", error);
      }
    },
  };

  // Share operations
  const handleShareOperations: ShareOperations = {
    generateShareLink: async (
      fileId: string,
      expiresInDays?: number
    ): Promise<string> => {
      const transferId = generateTransferId();

      // Create share transfer record
      const transfer = {
        transferId,
        type: "share_create" as const,
        status: "in_progress" as const,
        fileName: `File ${fileId}`,
        bytesTransferred: 0,
        progressPercentage: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      addTransfer(transfer);

      try {
        const response = await fetch(`${API_URL}/files/${fileId}/share`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ expiresInDays: expiresInDays || 7 }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log("✅ Share link generated successfully");

          updateTransfer({
            ...transfer,
            status: "completed",
            progressPercentage: 100,
            updatedAt: new Date(),
          });

          return result.data.shareUrl;
        } else {
          const errorData = await response.json();
          console.error("❌ Failed to generate share link:", errorData.error);

          updateTransfer({
            ...transfer,
            status: "failed",
            errorMessage: errorData.error || "Failed to generate share link",
            updatedAt: new Date(),
          });

          throw new Error(errorData.error || "Failed to generate share link");
        }
      } catch (error) {
        console.error("💥 Error generating share link:", error);

        updateTransfer({
          ...transfer,
          status: "failed",
          errorMessage:
            error instanceof Error
              ? error.message
              : "Failed to generate share link",
          updatedAt: new Date(),
        });

        throw error;
      }
    },
  };

  return {
    isUploading,
    uploadFiles,
    handleConflictResolve,
    handleFileOperations,
    handleFolderOperations,
    handleShareOperations,
  };
}
