"use client";

import { useState, useEffect } from "react";
import MainViewHeader from "./MainViewHeader";
import FileGridView from "./FileGridView";
import EmptyState from "./EmptyState";
import DragDropOverlay from "./DragDropOverlay";
import SearchBar from "./SearchBar";

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
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load files when folder changes
  useEffect(() => {
    if (folderId) {
      // In a real app, you would fetch files from API
      setFiles(mockFiles);
      setFilteredFiles(mockFiles);
    } else {
      setFiles([]);
      setFilteredFiles([]);
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
  }, [folderId]);

  const handleFileUpload = (fileList: globalThis.File[]) => {
    // In a real app, you would upload files to your API
    console.log('Files to upload:', fileList);
    // For demo, you could add files to the mock data
  };

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
    // In a real app, you would delete the file via API
    setFiles(files.filter(f => f.id !== fileId));
    console.log('Delete file:', fileId);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // No folder selected state
  if (!folderId) {
    return (
      <div className="h-full bg-background">
        <MainViewHeader folderName={null} onUploadFile={handleUploadFile} />
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

  return (
    <div className="h-full bg-gray-50 relative">
      <MainViewHeader folderName={folderName || null} onUploadFile={handleUploadFile} />
      
      <div className="h-[calc(100%-73px)] overflow-auto">
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
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No files found</h2>
              <p className="text-gray-500">
                Try adjusting your search query
              </p>
            </div>
          )
        ) : (
          <div className="px-8 pb-8">
            <FileGridView
              files={filteredFiles}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>
      
      <DragDropOverlay isVisible={isDragOver} />
    </div>
  );
}
