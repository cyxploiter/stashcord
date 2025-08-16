"use client";

import {
     FileText,
     Image,
     Music,
     Video,
     Archive,
     Folder,
     Star,
} from "lucide-react";
import FileTable from "@/components/files/FileTable";
import FileActionMenu from "@/components/files/FileActionMenu";
import FolderActionMenu from "@/components/folders/FolderActionMenu";
import { Button } from "../ui/button";

type ExplorerViewMode = "grid" | "list";

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

interface FolderItem {
     id: string;
     name: string;
     type: "folder";
     discordForumId?: string;
     files: FileItem[];
     modified: string;
}

interface StashExplorerProps {
     explorerViewMode: ExplorerViewMode;
     currentFolder: FolderItem | null;
     folders: FolderItem[];
     searchQuery: string;
     selectedFiles: Set<string>;
     onNavigateToFolder: (folder: FolderItem) => void;
     onFileSelect: (fileId: string) => void;
     onSelectAllFiles: () => void;
     onClearSelection: () => void;
     onDownloadFile: (fileId: string) => void;
     onDeleteFile: (fileId: string) => void;
     onStarFile: (fileId: string, starred: boolean) => void;
     onRenameFile: (fileId: string, newName: string) => void;
     onShareFile: (fileId: string, fileName: string) => void;
     onDeleteFolder: (folderId: string) => void;
     onRenameFolder: (folderId: string, newName: string) => void;
     handleBulkDelete: () => void;
     handleBulkDownload: () => void;
}

const getFileIcon = (fileType: string) => {
     switch (fileType) {
          case "document":
               return FileText;
          case "image":
               return Image;
          case "audio":
               return Music;
          case "video":
               return Video;
          case "archive":
               return Archive;
          default:
               return FileText;
     }
};

const renderGridView = (
     currentFolder: FolderItem | null,
     folders: FolderItem[],
     searchQuery: string,
     onNavigateToFolder: (folder: FolderItem) => void,
     onDownloadFile: (fileId: string) => void,
     onDeleteFile: (fileId: string) => void,
     onStarFile: (fileId: string, starred: boolean) => void,
     onRenameFile: (fileId: string, newName: string) => void,
     onShareFile: (fileId: string, fileName: string) => void,
     onDeleteFolder: (folderId: string) => void,
     onRenameFolder: (folderId: string, newName: string) => void
) => {
     const filteredFolders = folders.filter((folder) =>
          folder.name.toLowerCase().includes(searchQuery.toLowerCase())
     );

     if (currentFolder) {
          if (currentFolder.files.length === 0) {
               return (
                    <div className="text-center py-12">
                         <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                         <h3 className="text-lg font-medium text-gray-900 mb-2">
                              No files yet
                         </h3>
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
                              <div
                                   key={file.id}
                                   className="group relative flex flex-col min-h-[200px]"
                              >
                                   <div className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-200 h-full">
                                        <div className="mb-2 p-3 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition-colors relative w-full flex-shrink-0">
                                             {file.fileType === "video" && file.thumbnailUrl ? (
                                                  <div className="relative aspect-video w-full">
                                                       {/* eslint-disable-next-line @next/next/no-img-element */}
                                                       <img
                                                            src={file.thumbnailUrl}
                                                            alt={`${file.name} thumbnail`}
                                                            className="w-full h-full object-cover rounded"
                                                            onError={(e) => {
                                                                 console.log(
                                                                      "Thumbnail failed to load:",
                                                                      file.thumbnailUrl
                                                                 );
                                                                 const target = e.target as HTMLImageElement;
                                                                 target.style.display = "none";
                                                                 const fallback =
                                                                      target.parentElement?.querySelector(".fallback-icon");
                                                                 if (fallback) {
                                                                      (fallback as HTMLElement).style.display = "flex";
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
                                             <p
                                                  className="text-sm font-medium text-gray-900 mb-1 px-1 overflow-hidden"
                                                  style={{
                                                       display: "-webkit-box",
                                                       WebkitLineClamp: 2,
                                                       WebkitBoxOrient: "vertical",
                                                       wordBreak: "break-word",
                                                  }}
                                             >
                                                  {file.name}
                                             </p>
                                             <p className="text-xs text-gray-500">{file.size}</p>
                                             {file.starred && (
                                                  <Star className="h-3 w-3 text-yellow-500 fill-current mt-1 mx-auto" />
                                             )}
                                        </div>
                                   </div>
                                   <div className="absolute top-2 right-2">
                                        <FileActionMenu
                                             file={file}
                                             onDownload={onDownloadFile}
                                             onDelete={onDeleteFile}
                                             onStar={onStarFile}
                                             onRename={onRenameFile}
                                             onShare={(fileId) => onShareFile(fileId, file.name)}
                                        />
                                   </div>
                              </div>
                         );
                    })}
               </div>
          );
     }

     if (folders.length === 0) {
          return (
               <div className="text-center py-12">
                    <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                         No folders yet
                    </h3>
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
                         <div
                              className="relative flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                              onClick={() => onNavigateToFolder(folder)}
                         >
                              <div
                                   className="absolute top-2 right-2 z-10"
                                   onClick={(e) => e.stopPropagation()}
                              >
                                   <FolderActionMenu
                                        folder={folder}
                                        onDelete={onDeleteFolder}
                                        onRename={onRenameFolder}
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
                                        <p className="text-xs text-blue-500">Discord Forum</p>
                                   )}
                              </div>
                         </div>
                    </div>
               ))}
          </div>
     );
};

const renderListView = (
     currentFolder: FolderItem | null,
     folders: FolderItem[],
     searchQuery: string,
     selectedFiles: Set<string>,
     onNavigateToFolder: (folder: FolderItem) => void,
     onFileSelect: (fileId: string) => void,
     onSelectAllFiles: () => void,
     onClearSelection: () => void,
     onDownloadFile: (fileId: string) => void,
     onDeleteFile: (fileId: string) => void,
     onStarFile: (fileId: string, starred: boolean) => void,
     onRenameFile: (fileId: string, newName: string) => void,
     onShareFile: (fileId: string, fileName: string) => void,
     onDeleteFolder: (folderId: string) => void,
     onRenameFolder: (folderId: string, newName: string) => void
) => {
     const filteredFolders = folders.filter((folder) =>
          folder.name.toLowerCase().includes(searchQuery.toLowerCase())
     );

     if (currentFolder) {
          return (
               <FileTable
                    files={currentFolder.files}
                    selectedFiles={selectedFiles}
                    onFileSelect={onFileSelect}
                    onSelectAll={onSelectAllFiles}
                    onClearSelection={onClearSelection}
                    onDownload={onDownloadFile}
                    onDelete={onDeleteFile}
                    onStar={onStarFile}
                    onRename={onRenameFile}
                    onShare={(fileId) => {
                         const file = currentFolder.files.find((f) => f.id === fileId);
                         if (file) {
                              onShareFile(fileId, file.name);
                         }
                    }}
               />
          );
     }

     if (folders.length === 0) {
          return (
               <div className="text-center py-12">
                    <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                         No folders yet
                    </h3>
                    <p className="text-gray-500 mb-4">
                         Create your first folder to start organizing your files
                    </p>
               </div>
          );
     }

     return (
          <div className="space-y-1">
               <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200 bg-gray-50">
                    <div className="col-span-6">Name</div>
                    <div className="col-span-2">Type</div>
                    <div className="col-span-2">Files</div>
                    <div className="col-span-2">Modified</div>
               </div>
               {filteredFolders.map((folder) => (
                    <div key={folder.id}>
                         <div
                              className="grid grid-cols-12 gap-4 px-4 py-2 hover:bg-blue-50 rounded cursor-pointer group border-l-2 border-transparent hover:border-blue-500"
                              onClick={() => onNavigateToFolder(folder)}
                         >
                              <div className="col-span-6 flex items-center gap-3">
                                   <Folder className="h-4 w-4 text-blue-600" />
                                   <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                             {folder.name}
                                        </p>
                                        {folder.discordForumId && (
                                             <p className="text-xs text-blue-500">Discord Forum</p>
                                        )}
                                   </div>
                              </div>
                              <div className="col-span-2 text-sm text-gray-500">Folder</div>
                              <div className="col-span-2 text-sm text-gray-500">
                                   {folder.files.length} items
                              </div>
                              <div className="col-span-1 text-sm text-gray-500">
                                   {folder.modified}
                              </div>
                              <div
                                   className="col-span-1 flex justify-end items-center"
                                   onClick={(e) => e.stopPropagation()}
                              >
                                   <FolderActionMenu
                                        folder={folder}
                                        onDelete={onDeleteFolder}
                                        onRename={onRenameFolder}
                                   />
                              </div>
                         </div>
                    </div>
               ))}
          </div>
     );
};

export default function StashExplorer({
     explorerViewMode,
     currentFolder,
     folders,
     searchQuery,
     selectedFiles,
     onNavigateToFolder,
     onFileSelect,
     onSelectAllFiles,
     onClearSelection,
     onDownloadFile,
     onDeleteFile,
     onStarFile,
     onRenameFile,
     onShareFile,
     onDeleteFolder,
     onRenameFolder,
     handleBulkDelete,
     handleBulkDownload,
}: StashExplorerProps) {
     return (
          <div className="h-full flex flex-col">
               <div className="flex-1 p-4 overflow-auto">
                    {selectedFiles.size > 0 && explorerViewMode === "list" && (
                         <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                   <span className="text-sm font-medium text-blue-900">
                                        {selectedFiles.size} file{selectedFiles.size !== 1 ? "s" : ""}{" "}
                                        selected
                                   </span>
                                   <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={onSelectAllFiles}
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
                                        Delete ({selectedFiles.size})
                                   </Button>
                                   <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={onClearSelection}
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
                                        Download ({selectedFiles.size})
                                   </Button>
                              </div>
                         </div>
                    )}
                    {explorerViewMode === "grid"
                         ? renderGridView(
                              currentFolder,
                              folders,
                              searchQuery,
                              onNavigateToFolder,
                              onDownloadFile,
                              onDeleteFile,
                              onStarFile,
                              onRenameFile,
                              onShareFile,
                              onDeleteFolder,
                              onRenameFolder
                         )
                         : renderListView(
                              currentFolder,
                              folders,
                              searchQuery,
                              selectedFiles,
                              onNavigateToFolder,
                              onFileSelect,
                              onSelectAllFiles,
                              onClearSelection,
                              onDownloadFile,
                              onDeleteFile,
                              onStarFile,
                              onRenameFile,
                              onShareFile,
                              onDeleteFolder,
                              onRenameFolder
                         )}
               </div>
          </div>
     );
}