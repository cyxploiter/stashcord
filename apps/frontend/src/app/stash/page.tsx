"use client";

import { useState, useEffect, useCallback } from "react";
import AuthGuard from "@/components/AuthGuard";
import SetupGuard from "@/components/SetupGuard";
import { Sidebar, Header } from "@/components/layout";
import DragDropOverlay from "@/components/DragDropOverlay";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FileConflictDialog from "@/components/FileConflictDialog";
import FileActionMenu from "@/components/FileActionMenu";
import FolderActionMenu from "@/components/FolderActionMenu";
import ShareDialog from "@/components/ShareDialog";
import FileTable from "@/components/FileTable";
import {
  List,
  Search,
  Upload,
  FolderPlus,
  Folder,
  FileText,
  Image,
  Music,
  Video,
  Archive,
  Star,
  Grid3X3,
  ChevronLeft,
  ChevronRight as ChevronRightNav,
  Home,
  Trash2,
  Download,
} from "lucide-react";

// Extend Window interface for conflict resolution functions
declare global {
  interface Window {
    conflictResolve?: (value: unknown) => void;
    conflictReject?: (reason?: unknown) => void;
  }
}

type ExplorerViewMode = "grid" | "list";

interface FileItem {
  id: string;
  name: string;
  type: "file";
  fileType: "document" | "image" | "audio" | "video" | "archive";
  size: string;
  modified: string;
  starred?: boolean;
  thumbnailUrl?: string; // Add thumbnail URL for video files
}

interface FolderItem {
  id: string;
  name: string;
  type: "folder";
  discordForumId?: string;
  files: FileItem[];
  modified: string;
}

interface ConflictData {
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

function StashContent() {
  const [explorerViewMode, setExplorerViewMode] = useState<ExplorerViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPath, setCurrentPath] = useState<string[]>(["Stash"]);
  const [currentFolder, setCurrentFolder] = useState<FolderItem | null>(null);

  // Folders state (now maps to Discord forums)
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState<string>("");

  // Loading states
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);

  // File upload state
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // File conflict handling state
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);

  // Share dialog state
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareFileId, setShareFileId] = useState<string>("");
  const [shareFileName, setShareFileName] = useState<string>("");

  // Bulk selection state
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // API base URL
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

  const loadFolders = useCallback(async () => {
    try {
      setIsLoadingFolders(true);
      const response = await fetch(`${apiUrl}/folders`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        const foldersData = result.data || [];

        console.log('Folders loaded:', foldersData); // Debug logging

        // Transform backend data to frontend format
        const transformedFolders: FolderItem[] = foldersData.map((folder: {
          id: number;
          name: string;
          discordForumId?: string;
          createdAt: string;
        }) => ({
          id: folder.id.toString(),
          name: folder.name,
          type: "folder" as const,
          discordForumId: folder.discordForumId,
          files: [], // Files will be loaded separately when folder is opened
          modified: new Date(folder.createdAt).toLocaleDateString(),
        }));

        console.log('Transformed folders:', transformedFolders); // Debug logging
        setFolders(transformedFolders);
      } else {
        console.error('Failed to load folders:', response.status);
        const errorText = await response.text();
        console.error('Folders error response:', errorText);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      setIsLoadingFolders(false);
    }
  }, [apiUrl]);

  const loadFiles = useCallback(async (folderId: string): Promise<FileItem[]> => {
    try {
      const response = await fetch(`${apiUrl}/files?folderId=${folderId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        const filesData = result.data || [];

        console.log('Files loaded for folder', folderId, ':', filesData); // Debug logging

        // Transform backend data to frontend format
        const transformedFiles: FileItem[] = filesData.map((file: {
          id: string; // This is actually threadId (string)
          name: string;
          originalName: string;
          size: number;
          mimeType: string;
          isStarred: boolean;
          createdAt: string;
          thumbnailUrl?: string; // Add thumbnail URL
          fileType?: {
            name: string;
          };
        }) => {
          // Determine file type based on MIME type
          let fileType: "document" | "image" | "audio" | "video" | "archive" = "document";
          if (file.mimeType.startsWith('image/')) {
            fileType = "image";
          } else if (file.mimeType.startsWith('audio/')) {
            fileType = "audio";
          } else if (file.mimeType.startsWith('video/')) {
            fileType = "video";
          } else if (file.mimeType.includes('zip') || file.mimeType.includes('tar') || file.mimeType.includes('rar')) {
            fileType = "archive";
          }

          // Format file size
          const formatSize = (bytes: number): string => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
          };

          return {
            id: file.id, // Already a string (threadId)
            name: file.originalName,
            type: "file" as const,
            fileType,
            size: formatSize(file.size),
            modified: new Date(file.createdAt).toLocaleDateString(),
            starred: file.isStarred || false,
            thumbnailUrl: file.thumbnailUrl, // Include thumbnail URL
          };
        });

        return transformedFiles;
      } else {
        console.error('Failed to load files for folder:', folderId, response.status);
        return [];
      }
    } catch (error) {
      console.error('Error loading files for folder:', folderId, error);
      return [];
    }
  }, [apiUrl]);

  // File upload functionality
  const uploadFiles = useCallback(async (files: FileList, folderId: string) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);

    // Show upload started feedback
    console.log(`Starting upload of ${files.length} file(s)...`);

    // Upload a single file with conflict handling
    const uploadSingleFile = async (file: File, folderId: string): Promise<unknown> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderId', folderId);

      try {
        console.log(`Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)...`);

        const response = await fetch(`${apiUrl}/files/upload`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          console.log('File uploaded successfully:', file.name);
          return result.data;
        } else if (response.status === 409) {
          // File conflict detected
          const conflictInfo = await response.json();
          console.log('File conflict detected:', conflictInfo);

          // Show conflict dialog and wait for user decision
          return new Promise((resolve, reject) => {
            setConflictData({
              existingFile: conflictInfo.data.existingFile,
              uploadedFile: conflictInfo.data.uploadedFile,
              file,
              folderId,
            });
            setShowConflictDialog(true);

            // Store resolve/reject functions to call after user decision
            window.conflictResolve = resolve;
            window.conflictReject = reject;
          });
        } else {
          const errorData = await response.json();
          console.error('Failed to upload file:', file.name, errorData.error);
          throw new Error(errorData.error || 'Upload failed');
        }
      } catch (error) {
        console.error('Error uploading file:', file.name, error);
        if (error instanceof Error) {
          console.error(`Error uploading ${file.name}: ${error.message}`);
        }
        throw error;
      }
    };

    const uploadPromises = Array.from(files).map(async (file) => {
      return uploadSingleFile(file, folderId);
    });

    try {
      await Promise.all(uploadPromises);

      // Refresh the current folder to show new files
      if (currentFolder) {
        const updatedFiles = await loadFiles(currentFolder.id);
        setCurrentFolder(prev => prev ? { ...prev, files: updatedFiles } : null);
      }

      console.log('All files uploaded successfully');
    } catch (error) {
      console.error('Some files failed to upload:', error);
      // Still refresh to show any files that did upload
      if (currentFolder) {
        const updatedFiles = await loadFiles(currentFolder.id);
        setCurrentFolder(prev => prev ? { ...prev, files: updatedFiles } : null);
      }
    } finally {
      setIsUploading(false);
    }
  }, [apiUrl, currentFolder, loadFiles, setConflictData, setShowConflictDialog]);

  // Handle conflict resolution
  const handleConflictResolve = useCallback(async (action: "replace" | "keep" | "rename") => {
    if (!conflictData) return;

    const { file, folderId, existingFile } = conflictData;

    try {
      if (action === "keep") {
        // User chose to keep existing file, resolve with existing file data
        if (window.conflictResolve) {
          window.conflictResolve(existingFile);
        }
        return;
      }

      // For replace and rename actions, call the resolve endpoint
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderId', folderId);
      formData.append('action', action);
      if (action === "replace" && existingFile.id) {
        formData.append('existingFileId', existingFile.id.toString());
      }

      const response = await fetch(`${apiUrl}/files/upload-resolve-conflict`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('File conflict resolved successfully:', result);
        if (window.conflictResolve) {
          window.conflictResolve(result.data);
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to resolve conflict:', errorData.error);
        if (window.conflictReject) {
          window.conflictReject(new Error(errorData.error || 'Conflict resolution failed'));
        }
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
      if (window.conflictReject) {
        window.conflictReject(error);
      }
    } finally {
      setConflictData(null);
      setShowConflictDialog(false);
      // Clean up global functions
      delete window.conflictResolve;
      delete window.conflictReject;
    }
  }, [conflictData, apiUrl]);

  const handleUploadClick = () => {
    if (!currentFolder) {
      console.warn('No folder selected for upload');
      return;
    }

    // Trigger file input click
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files) {
        uploadFiles(target.files, currentFolder.id);
      }
    };
    input.click();
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentFolder && !isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only hide overlay if we're leaving the main container
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!currentFolder) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      uploadFiles(files, currentFolder.id);
    }
  };

  // Load folders on component mount
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const navigateToFolder = async (folder: FolderItem) => {
    // Load files for this folder
    const files = await loadFiles(folder.id);
    const folderWithFiles = { ...folder, files };

    setCurrentFolder(folderWithFiles);
    setCurrentPath(prev => [...prev, folder.name]);
  };

  const navigateToPath = (pathIndex: number) => {
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
  };

  const goBack = () => {
    if (currentPath.length > 1) {
      const newPath = currentPath.slice(0, -1);
      setCurrentPath(newPath);
      if (newPath.length === 1) {
        setCurrentFolder(null);
      }
    }
  };

  const goForward = () => {
    // Implement forward navigation if needed
    // For now, this is a placeholder
  };

  // Folder management (now creates Discord forums)
  const createFolder = async (name: string) => {
    if (!name.trim()) return;

    try {
      const response = await fetch(`${apiUrl}/folders`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: '',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const newFolder = result.data;

        const transformedFolder: FolderItem = {
          id: newFolder.id.toString(),
          name: newFolder.name,
          type: "folder",
          discordForumId: newFolder.discordForumId,
          files: [],
          modified: new Date(newFolder.createdAt).toLocaleDateString(),
        };

        setFolders(prev => [...prev, transformedFolder]);
        setIsCreatingFolder(false);
        setNewFolderName("");
      } else {
        console.error('Failed to create folder:', response.status);
        const errorData = await response.json();
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const handleSubmitFolder = (e: React.FormEvent) => {
    e.preventDefault();
    createFolder(newFolderName);
  };

  const handleCancelFolder = () => {
    setIsCreatingFolder(false);
    setNewFolderName("");
  };

  // Folder management functions
  const handleDeleteFolder = useCallback(async (folderId: string) => {
    try {
      const response = await fetch(`${apiUrl}/folders/${folderId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        // Remove folder from state
        setFolders(prev => prev.filter(folder => folder.id !== folderId));

        // If we're currently viewing this folder, navigate back to root
        if (currentFolder && currentFolder.id === folderId) {
          setCurrentFolder(null);
          setCurrentPath(["Stash"]);
        }

        console.log('Folder deleted successfully');
      } else {
        const errorData = await response.json();
        console.error('Failed to delete folder:', errorData.error);
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
    }
  }, [apiUrl, currentFolder]);

  const handleRenameFolder = useCallback(async (folderId: string, newName: string) => {
    try {
      const response = await fetch(`${apiUrl}/folders/${folderId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName }),
      });

      if (response.ok) {
        const result = await response.json();
        const updatedFolder = result.data;

        // Update folder in state
        setFolders(prev => prev.map(folder =>
          folder.id === folderId
            ? { ...folder, name: updatedFolder.name, modified: new Date(updatedFolder.updatedAt).toLocaleDateString() }
            : folder
        ));

        // If we're currently viewing this folder, update current folder
        if (currentFolder && currentFolder.id === folderId) {
          setCurrentFolder(prev => prev ? { ...prev, name: updatedFolder.name } : null);
          setCurrentPath(prev => {
            const newPath = [...prev];
            newPath[newPath.length - 1] = updatedFolder.name;
            return newPath;
          });
        }

        console.log('Folder renamed successfully');
      } else {
        const errorData = await response.json();
        console.error('Failed to rename folder:', errorData.error);
      }
    } catch (error) {
      console.error('Error renaming folder:', error);
    }
  }, [apiUrl, currentFolder]);

  // Filter folders based on search query
  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "document": return FileText;
      case "image": return Image;
      case "audio": return Music;
      case "video": return Video;
      case "archive": return Archive;
      default: return FileText;
    }
  };

  const renderExplorerView = () => (
    <div className="h-full flex flex-col">
      {/* Navigation Bar */}
      <div className="border-b border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
        {/* Navigation Controls */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={goBack}
              disabled={currentPath.length <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={goForward}
              disabled={true} // For now, forward is disabled
            >
              <ChevronRightNav className="h-4 w-4" />
            </Button>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-gray-600"
              onClick={() => navigateToPath(0)}
            >
              <Home className="h-3 w-3 mr-1" />
              Stash
            </Button>
            {currentPath.slice(1).map((path, index) => (
              <div key={index} className="flex items-center gap-1">
                <span className="text-gray-400">/</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-gray-600"
                  onClick={() => navigateToPath(index + 1)}
                >
                  {path}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-md">
            <Button
              variant={explorerViewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setExplorerViewMode("grid");
                // Note: We keep selections when switching to grid view
              }}
              className="h-7 px-2"
            >
              <Grid3X3 className="h-3 w-3" />
            </Button>
            <Button
              variant={explorerViewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setExplorerViewMode("list")}
              className="h-7 px-2"
            >
              <List className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4 overflow-auto">
        {/* Bulk Actions Toolbar - Only show in list view */}
        {selectedFiles.size > 0 && explorerViewMode === "list" && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-900">
                {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={selectAllFiles}
                className="text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                Select All ({currentFolder?.files.length || 0})
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete ({selectedFiles.size})
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearSelection}
                className="text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDownload}
                className="text-green-700 border-green-300 hover:bg-green-100"
              >
                <Download className="h-3 w-3 mr-1" />
                Download ({selectedFiles.size})
              </Button>
            </div>
          </div>
        )}

        {explorerViewMode === "grid" ? renderGridView() : renderListView()}
      </div>
    </div>
  );

  const renderGridView = () => {
    // If we're inside a folder, show its files
    if (currentFolder) {
      if (currentFolder.files.length === 0) {
        return (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No files yet</h3>
            <p className="text-gray-500 mb-4">
              Upload files to this folder to get started
            </p>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 auto-rows-fr">
          {currentFolder.files.map((file) => {
            const FileIcon = getFileIcon(file.fileType);
            return (
              <div key={file.id} className="group relative flex flex-col min-h-[200px]">
                <div
                  className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-200 h-full"
                >
                  <div className="mb-2 p-3 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition-colors relative w-full flex-shrink-0">
                    {file.fileType === "video" && file.thumbnailUrl ? (
                      <div className="relative aspect-video w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={file.thumbnailUrl}
                          alt={`${file.name} thumbnail`}
                          className="w-full h-full object-cover rounded"
                          onError={(e) => {
                            console.log('Thumbnail failed to load:', file.thumbnailUrl);
                            // Replace with video icon
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.parentElement?.querySelector('.fallback-icon');
                            if (fallback) {
                              (fallback as HTMLElement).style.display = 'flex';
                            }
                          }}
                        />
                        <div className="fallback-icon absolute inset-0 hidden items-center justify-center bg-gray-100 rounded">
                          <Video className="h-12 w-12 text-gray-600" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-opacity-20 rounded">
                          <Video className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    ) : file.fileType === "image" ? (
                      <div className="relative aspect-video w-full bg-gray-100 rounded overflow-hidden">
                        <div className="aspect-video w-full flex items-center justify-center">
                          <FileIcon className="h-12 w-12 text-gray-600" />
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video w-full flex items-center justify-center">
                        <FileIcon className="h-12 w-12 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="text-center min-h-[3rem] flex flex-col justify-center flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-1 px-1 overflow-hidden"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        wordBreak: 'break-word'
                      }}>
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {file.size}
                    </p>
                    {file.starred && (
                      <Star className="h-3 w-3 text-yellow-500 fill-current mt-1 mx-auto" />
                    )}
                  </div>
                </div>

                {/* Action Menu */}
                <div className="absolute top-2 right-2">
                  <FileActionMenu
                    file={file}
                    onDownload={handleDownloadFile}
                    onDelete={handleDeleteFile}
                    onStar={handleStarFile}
                    onRename={handleRenameFile}
                    onShare={(fileId) => handleShareFile(fileId, file.name)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Otherwise, show folders (now Discord forums)
    if (folders.length === 0) {
      return (
        <div className="text-center py-12">
          <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No folders yet</h3>
          <p className="text-gray-500 mb-4">
            Create your first folder to start organizing your files
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {filteredFolders.map((folder) => (
          <div key={folder.id} className="group">
            {/* Folder Card */}
            <div
              className="relative flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => navigateToFolder(folder)}
            >
              {/* Folder Action Menu */}
              <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                <FolderActionMenu
                  folder={folder}
                  onDelete={handleDeleteFolder}
                  onRename={handleRenameFolder}
                />
              </div>

              <div className="mb-2 p-3 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                <Folder className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900 truncate w-full mb-1">
                  {folder.name}
                </p>
                <p className="text-xs text-gray-500">
                  {folder.files.length} items
                </p>
                {folder.discordForumId && (
                  <p className="text-xs text-blue-500">
                    Discord Forum
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderListView = () => {
    // If we're inside a folder, show its files using the TanStack table
    if (currentFolder) {
      return (
        <FileTable
          files={currentFolder.files}
          selectedFiles={selectedFiles}
          onFileSelect={toggleFileSelection}
          onSelectAll={selectAllFiles}
          onClearSelection={clearSelection}
          onDownload={handleDownloadFile}
          onDelete={handleDeleteFile}
          onStar={handleStarFile}
          onRename={handleRenameFile}
          onShare={(fileId) => {
            const file = currentFolder.files.find(f => f.id === fileId);
            if (file) {
              handleShareFile(fileId, file.name);
            }
          }}
        />
      );
    }

    // Otherwise, show folders (now Discord forums) - keep existing table for folders
    if (folders.length === 0) {
      return (
        <div className="text-center py-12">
          <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No folders yet</h3>
          <p className="text-gray-500 mb-4">
            Create your first folder to start organizing your files
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200 bg-gray-50">
          <div className="col-span-6">Name</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Files</div>
          <div className="col-span-2">Modified</div>
        </div>

        {/* Folders */}
        {filteredFolders.map((folder) => (
          <div key={folder.id}>
            {/* Folder Row */}
            <div
              className="grid grid-cols-12 gap-4 px-4 py-2 hover:bg-blue-50 rounded cursor-pointer group border-l-2 border-transparent hover:border-blue-500"
              onClick={() => navigateToFolder(folder)}
            >
              <div className="col-span-6 flex items-center gap-3">
                <Folder className="h-4 w-4 text-blue-600" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {folder.name}
                  </p>
                  {folder.discordForumId && (
                    <p className="text-xs text-blue-500">
                      Discord Forum
                    </p>
                  )}
                </div>
              </div>
              <div className="col-span-2 text-sm text-gray-500">
                Folder
              </div>
              <div className="col-span-2 text-sm text-gray-500">
                {folder.files.length} items
              </div>
              <div className="col-span-1 text-sm text-gray-500">
                {folder.modified}
              </div>
              <div className="col-span-1 flex justify-end items-center" onClick={(e) => e.stopPropagation()}>
                <FolderActionMenu
                  folder={folder}
                  onDelete={handleDeleteFolder}
                  onRename={handleRenameFolder}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // File action handlers
  const handleDownloadFile = useCallback(async (fileId: string) => {
    try {
      window.open(`${apiUrl}/files/${fileId}/download`, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  }, [apiUrl]);

  const handleDeleteFile = useCallback(async (fileId: string) => {
    try {
      const response = await fetch(`${apiUrl}/files/${fileId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        // Refresh current folder to show updated file list
        if (currentFolder) {
          const updatedFiles = await loadFiles(currentFolder.id);
          setCurrentFolder(prev => prev ? { ...prev, files: updatedFiles } : null);
        }
        console.log('File deleted successfully');
      } else {
        const errorData = await response.json();
        console.error('Failed to delete file:', errorData.error);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }, [apiUrl, currentFolder, loadFiles]);

  const handleStarFile = useCallback(async (fileId: string, starred: boolean) => {
    try {
      const response = await fetch(`${apiUrl}/files/${fileId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isStarred: starred }),
      });

      if (response.ok) {
        // Refresh current folder to show updated file list
        if (currentFolder) {
          const updatedFiles = await loadFiles(currentFolder.id);
          setCurrentFolder(prev => prev ? { ...prev, files: updatedFiles } : null);
        }
        console.log(`File ${starred ? 'starred' : 'unstarred'} successfully`);
      } else {
        const errorData = await response.json();
        console.error('Failed to update file star status:', errorData.error);
      }
    } catch (error) {
      console.error('Error updating file star status:', error);
    }
  }, [apiUrl, currentFolder, loadFiles]);

  const handleRenameFile = useCallback(async (fileId: string, newName: string) => {
    try {
      const response = await fetch(`${apiUrl}/files/${fileId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName }),
      });

      if (response.ok) {
        // Refresh current folder to show updated file list
        if (currentFolder) {
          const updatedFiles = await loadFiles(currentFolder.id);
          setCurrentFolder(prev => prev ? { ...prev, files: updatedFiles } : null);
        }
        console.log('File renamed successfully');
      } else {
        const errorData = await response.json();
        console.error('Failed to rename file:', errorData.error);
      }
    } catch (error) {
      console.error('Error renaming file:', error);
    }
  }, [apiUrl, currentFolder, loadFiles]);

  const handleShareFile = useCallback((fileId: string, fileName: string) => {
    setShareFileId(fileId);
    setShareFileName(fileName);
    setShowShareDialog(true);
  }, []);

  const handleGenerateShareLink = useCallback(async (fileId: string, expiresInDays?: number): Promise<string> => {
    try {
      const response = await fetch(`${apiUrl}/files/${fileId}/share`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expiresInDays: expiresInDays || undefined
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.data.shareUrl;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate share link');
      }
    } catch (error) {
      console.error('Error generating share link:', error);
      throw error;
    }
  }, [apiUrl]);

  // Bulk selection handlers
  const toggleFileSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const selectAllFiles = () => {
    if (currentFolder) {
      const allFileIds = new Set(currentFolder.files.map(file => file.id));
      setSelectedFiles(allFileIds);
    }
  };

  const clearSelection = () => {
    setSelectedFiles(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedFiles.size} selected file(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const fileIds = Array.from(selectedFiles);
      console.log('Bulk delete request - fileIds:', fileIds);
      console.log('Selected files details:', Array.from(selectedFiles).map(id => {
        const file = currentFolder?.files.find(f => f.id === id);
        return `${id} (${typeof id}) - ${file ? file.name : 'NOT FOUND'}`;
      }));
      console.log('All files in folder:', currentFolder?.files.map(f => ({ id: f.id, name: f.name, type: typeof f.id })));

      const response = await fetch(`${apiUrl}/files/bulk-delete`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileIds }),
      });

      if (response.ok) {
        // Remove deleted files from current folder
        if (currentFolder) {
          const updatedFiles = currentFolder.files.filter(
            file => !selectedFiles.has(file.id)
          );
          setCurrentFolder({
            ...currentFolder,
            files: updatedFiles,
          });
        }

        // Clear selection
        clearSelection();

        console.log(`Successfully deleted ${selectedFiles.size} files`);
      } else {
        let errorMessage = `Failed to delete files (${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData && errorData.details) {
            errorMessage = errorData.details;
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `Failed to delete files - Server error ${response.status}`;
        }

        console.error('Failed to delete files:', errorMessage);
        // alert(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error during bulk delete:', error);
      // alert('Error: Network error or server is unavailable');
    }
  };

  const handleBulkDownload = async () => {
    if (selectedFiles.size === 0) return;

    try {
      const fileIds = Array.from(selectedFiles);
      console.log('Starting bulk download for files:', fileIds);

      const response = await fetch(`${apiUrl}/files/bulk-download`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileIds }),
      });

      if (response.ok) {
        // Create a blob from the response
        const blob = await response.blob();

        // Create a download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `files_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(link);
        link.click();

        // Clean up
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        console.log(`Successfully started download of ${selectedFiles.size} files`);
      } else {
        const errorData = await response.json();
        console.error('Failed to download files:', errorData);
      }
    } catch (error) {
      console.error('Error during bulk download:', error);
    }
  };

  return (
    <div
      className="h-full flex flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag and Drop Overlay */}
      <DragDropOverlay isVisible={isDragOver && !!currentFolder} />

      {/* Create Folder Dialog */}
      <Dialog open={isCreatingFolder} onOpenChange={setIsCreatingFolder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitFolder} className="space-y-4">
            <Input
              placeholder="Folder name (will create a Discord forum)"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCancelFolder}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newFolderName.trim()}>
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => setIsCreatingFolder(true)}
            >
              <FolderPlus className="h-4 w-4" />
              New Folder
            </Button>
            <Button
              className="flex items-center gap-2"
              onClick={handleUploadClick}
              disabled={!currentFolder || isUploading}
              title={!currentFolder ? "Select a folder first to upload files" : isUploading ? "Uploading..." : "Upload files to current folder"}
            >
              <Upload className="h-4 w-4" />
              {isUploading ? "Uploading..." : "Upload Files"}
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6">
        <Card className="h-full p-6">
          {/* Loading State */}
          {isLoadingFolders ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading folders...</p>
            </div>
          ) : (
            renderExplorerView()
          )}
        </Card>
      </div>

      {/* File Conflict Dialog */}
      <FileConflictDialog
        isOpen={showConflictDialog}
        onClose={() => {
          setShowConflictDialog(false);
          setConflictData(null);
          // Clean up global functions
          if (window.conflictReject) {
            window.conflictReject(new Error('Upload cancelled by user'));
            delete window.conflictResolve;
            delete window.conflictReject;
          }
        }}
        conflictData={conflictData}
        onResolve={handleConflictResolve}
      />

      {/* Share Dialog */}
      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => {
          setShowShareDialog(false);
          setShareFileId("");
          setShareFileName("");
        }}
        fileId={shareFileId}
        fileName={shareFileName}
        onGenerateShareLink={handleGenerateShareLink}
      />
    </div>
  );
}

export default function StashPage() {
  return (
    <AuthGuard>
      <SetupGuard>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          {/* Header - spans full width */}
          <Header />

          {/* Main content with sidebar and content area */}
          <div className="flex flex-1">
            {/* Sidebar */}
            <div className="w-64 border-r border-gray-200">
              <Sidebar selectedView="files" />
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-gray-50">
              <StashContent />
            </div>
          </div>
        </div>
      </SetupGuard>
    </AuthGuard>
  );
}
