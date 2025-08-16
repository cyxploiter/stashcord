"use client";

import { useState, useEffect, useCallback } from "react";
import MainViewHeader from "./MainViewHeader";
import DetailsPane from "@/components/views/DetailsPane";
import FileGridView from "@/components/files/FileGridView";
import FileListView from "@/components/files/FileListView";
import FileCardSkeleton from "@/components/files/FileCardSkeleton";
import EmptyState from "@/components/common/EmptyState";
import DragDropOverlay from "@/components/common/DragDropOverlay";
import SearchBar from "@/components/search/SearchBar";
import { useViewMode, useFileManagementSettings } from "@/context/SettingsContext";
import { useAppStore } from "@/store";
import { fileApi } from "api";

interface File {
  id: number;
  name: string;
  size: number;
  createdAt: string;
  type?: string;
}

interface MainContentViewProps {
  folderId: number | null;
  folderName?: string | null;
}

// Mock data for demonstration
const mockFiles: File[] = [
  {
    id: 1,
    name: "Document 1.pdf",
    size: 2048576, // 2MB
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    type: "pdf"
  },
  {
    id: 2,
    name: "Image 1.jpg",
    size: 5242880, // 5MB
    createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    type: "image"
  },
  {
    id: 3,
    name: "Presentation 1.pptx",
    size: 15728640, // 15MB
    createdAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    type: "presentation"
  },
  {
    id: 4,
    name: "Spreadsheet 1.xlsx",
    size: 1048576, // 1MB
    createdAt: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
    type: "spreadsheet"
  },
  {
    id: 5,
    name: "Video 1.mp4",
    size: 104857600, // 100MB
    createdAt: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
    type: "video"
  },
  {
    id: 6,
    name: "Audio 1.mp3",
    size: 8388608, // 8MB
    createdAt: new Date(Date.now() - 518400000).toISOString(), // 6 days ago
    type: "audio"
  },
  {
    id: 7,
    name: "Archive 1.zip",
    size: 20971520, // 20MB
    createdAt: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
    type: "archive"
  },
  {
    id: 8,
    name: "Other 1.txt",
    size: 1024, // 1KB
    createdAt: new Date(Date.now() - 691200000).toISOString(), // 8 days ago
    type: "text"
  }
];

export default function MainContentView({ folderId, folderName }: MainContentViewProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [path, setPath] = useState<{ id: number; name: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Get user settings
  const { viewMode } = useViewMode();
  const { deleteConfirmation } = useFileManagementSettings();
  const { addTransfer, updateTransferProgress, setTransferStatus } = useAppStore();

  // Load files when folder changes
  useEffect(() => {
    if (folderId) {
      setLoading(true);
      // In a real app, you would fetch files and path from API
      setTimeout(() => {
        setFiles(mockFiles);
        setFilteredFiles(mockFiles);
        setPath([
          { id: 1, name: "Documents" },
          { id: 2, name: "Work" },
        ]);
        setLoading(false);
      }, 1000); // Simulate network delay
    } else {
      setFiles([]);
      setFilteredFiles([]);
      setPath([]);
    }
  }, [folderId]);

  // Filter files based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFiles(files);
    } else {
      const filtered = files.filter(file =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFiles(filtered);
    }
  }, [files, searchQuery]);

  // Drag and drop handlers
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (folderId && e.dataTransfer?.types.includes('Files')) {
        setIsDragOver(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      // Only hide overlay when leaving the window
      if (!e.relatedTarget) {
        setIsDragOver(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (folderId && e.dataTransfer?.files) {
        handleFileUpload(Array.from(e.dataTransfer.files));
      }
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  }, [folderId, handleFileUpload]);

  const handleFileUpload = useCallback((fileList: globalThis.File[]) => {
    if (!folderId) return;
    for (const file of fileList) {
      const newTransfer = addTransfer(file);

      fileApi.uploadFile(file, folderId, (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        updateTransferProgress(newTransfer.id, progress);
      })
      .then(() => {
        setTransferStatus(newTransfer.id, 'completed');
      })
      .catch(() => {
        setTransferStatus(newTransfer.id, 'failed');
      });
    }
  }, [addTransfer, folderId, setTransferStatus, updateTransferProgress]);

  const handleUploadFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        handleFileUpload(Array.from(files));
      }
    };
    input.click();
  };

  const handleDownload = (fileId: number) => {
    // In a real app, you would download the file
    console.log('Download file:', fileId);
  };

  const handleDelete = (fileId: number) => {
    if (deleteConfirmation) {
      // Show confirmation dialog
      if (window.confirm("Are you sure you want to delete this file? This action cannot be undone.")) {
        // In a real app, you would delete the file via API
        setFiles(files.filter(f => f.id !== fileId));
        console.log('Delete file:', fileId);
      }
    } else {
      // Delete without confirmation
      setFiles(files.filter(f => f.id !== fileId));
      console.log('Delete file:', fileId);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleNavigate = (folderId: number | null) => {
    // In a real app, this would likely involve updating the URL
    // and re-fetching data. For now, we'll just log it.
    console.log("Navigate to folder:", folderId);
  };

  // No folder selected state
  if (!folderId) {
    return (
      <div className="h-full bg-background">
        <MainViewHeader
          folderName={null}
          path={[]}
          onUploadFile={handleUploadFile}
          onNavigate={handleNavigate}
        />
        <div className="flex flex-col items-center justify-center h-[calc(100%-73px)] text-center">
          <div className="text-6xl mb-4">📁</div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Welcome to Stashcord</h2>
          <p className="text-muted-foreground max-w-md">
            Your Discord-powered cloud storage. Select a folder from the sidebar to view and manage your files.
          </p>
        </div>
      </div>
    );
  }

  const handleSelectFile = (file: File) => {
    setSelectedFile(file);
  };

  return (
    <div className="h-full bg-background relative theme-transition flex">
      <div className="flex-1 h-full">
        <MainViewHeader
          folderName={folderName || null}
          path={path}
          onUploadFile={handleUploadFile}
          onNavigate={handleNavigate}
        />

        <div className="h-[calc(100%-73px)] overflow-auto">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 mt-6 px-8 pb-8">
              {[...Array(12)].map((_, i) => (
                <FileCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              {files.length > 0 && (
                <div className="px-8 pt-6 pb-0">
                  <SearchBar onSearch={handleSearch} />
                </div>
              )}

              {filteredFiles.length === 0 ? (
                files.length === 0 ? (
                  <EmptyState onUploadFile={handleUploadFile} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="text-6xl mb-4">🔍</div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">No files found</h2>
                    <p className="text-muted-foreground">
                      Try adjusting your search query
                    </p>
                  </div>
                )
              ) : (
                <div className="px-8 pb-8">
                  {viewMode === "grid" ? (
                    <FileGridView
                      files={filteredFiles}
                      onDownload={handleDownload}
                      onDelete={handleDelete}
                      onSelectFile={handleSelectFile}
                    />
                  ) : (
                    <FileListView
                      files={filteredFiles}
                      onDownload={handleDownload}
                      onDelete={handleDelete}
                      onSelectFile={handleSelectFile}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <DetailsPane file={selectedFile} onClose={() => setSelectedFile(null)} />

      <DragDropOverlay isVisible={isDragOver} />
    </div>
  );
}
