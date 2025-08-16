"use client";

import { useState } from "react";
import { useStashData } from "@/hooks/useStashData";
import { useFileOperations } from "@/hooks/useFileOperations";
import { ConflictData } from "@/types/stash";
import StashExplorer from "@/components/stash/StashExplorer";
import StashToolbar from "@/components/stash/StashToolbar";
import StashNavBar from "@/components/stash/StashNavBar";

export default function StashContainer() {
     // Local state for UI
     const [searchQuery, setSearchQuery] = useState("");
     const [explorerViewMode, setExplorerViewMode] = useState<"grid" | "list">("grid");
     const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
     const [conflictData, setConflictData] = useState<ConflictData | null>(null);
     const [showConflictDialog, setShowConflictDialog] = useState(false);

     // Custom hooks for data and operations
     const {
          folders,
          currentFolder,
          currentPath,
          isLoadingFolders,
          loadFolders,
          navigateToFolder,
          navigateToPath,
          goBack,
     } = useStashData();

     const {
          isUploading,
          uploadFiles,
          handleConflictResolve,
          handleFileOperations,
          handleFolderOperations,
          handleShareOperations,
     } = useFileOperations({
          setConflictData,
          setShowConflictDialog,
          onFolderUpdate: loadFolders,
     });

     // File selection handlers
     const handleFileSelect = (fileId: string) => {
          const newSelection = new Set(selectedFiles);
          if (newSelection.has(fileId)) {
               newSelection.delete(fileId);
          } else {
               newSelection.add(fileId);
          }
          setSelectedFiles(newSelection);
     };

     const handleSelectAllFiles = () => {
          if (currentFolder) {
               const allFileIds = new Set(currentFolder.files.map(file => file.id));
               setSelectedFiles(allFileIds);
          }
     };

     const handleClearSelection = () => {
          setSelectedFiles(new Set());
     };

     // Bulk operations
     const handleBulkDelete = async () => {
          const fileIds = Array.from(selectedFiles);
          try {
               await handleFileOperations.bulkDelete(fileIds);
               setSelectedFiles(new Set());
          } catch (error) {
               console.error("Failed to delete files:", error);
          }
     };

     const handleBulkDownload = async () => {
          const fileIds = Array.from(selectedFiles);
          try {
               await handleFileOperations.bulkDownload(fileIds);
          } catch (error) {
               console.error("Failed to download files:", error);
          }
     };

     // File upload handler
     const handleFileUpload = async (files: FileList) => {
          try {
               await uploadFiles(files, currentFolder?.id || "");
          } catch (error) {
               console.error("Upload failed:", error);
          }
     };

     // Folder creation handler
     const handleCreateFolder = async () => {
          const folderName = prompt("Enter folder name:");
          if (folderName?.trim()) {
               try {
                    await handleFolderOperations.create(folderName.trim());
               } catch (error) {
                    console.error("Failed to create folder:", error);
               }
          }
     };

     if (isLoadingFolders) {
          return (
               <div className="flex-1 flex items-center justify-center p-8 bg-background theme-transition">
                    <div className="text-center">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                         <p className="text-muted-foreground">Loading your stash...</p>
                    </div>
               </div>
          );
     }

     return (
          <div className="h-full flex flex-col">
               {/* Navigation Bar */}
               <StashNavBar
                    currentPath={currentPath}
                    explorerViewMode={explorerViewMode}
                    onNavigateBack={goBack}
                    onNavigateForward={() => { }} // No forward navigation in this implementation
                    onNavigateToPath={navigateToPath}
                    onSetExplorerViewMode={setExplorerViewMode}
               />

               {/* Toolbar */}
               <div className="p-4 border-b border-gray-200">
                    <StashToolbar
                         searchQuery={searchQuery}
                         onSearchQueryChange={setSearchQuery}
                         onNewFolder={handleCreateFolder}
                         onUpload={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.multiple = true;
                              input.onchange = (e) => {
                                   const target = e.target as HTMLInputElement;
                                   if (target.files) {
                                        handleFileUpload(target.files);
                                   }
                              };
                              input.click();
                         }}
                         isUploading={isUploading}
                         canUpload={!isLoadingFolders}
                    />
               </div>

               {/* Main Explorer */}
               <StashExplorer
                    explorerViewMode={explorerViewMode}
                    currentFolder={currentFolder}
                    folders={folders}
                    searchQuery={searchQuery}
                    selectedFiles={selectedFiles}
                    onNavigateToFolder={navigateToFolder}
                    onFileSelect={handleFileSelect}
                    onSelectAllFiles={handleSelectAllFiles}
                    onClearSelection={handleClearSelection}
                    onDownloadFile={handleFileOperations.download}
                    onDeleteFile={handleFileOperations.delete}
                    onStarFile={handleFileOperations.star}
                    onRenameFile={handleFileOperations.rename}
                    onShareFile={(fileId) => {
                         handleShareOperations.generateShareLink(fileId);
                    }}
                    onDeleteFolder={handleFolderOperations.delete}
                    onRenameFolder={handleFolderOperations.rename}
                    handleBulkDelete={handleBulkDelete}
                    handleBulkDownload={handleBulkDownload}
               />

               {/* Conflict Resolution Dialog - Simple placeholder for now */}
               {showConflictDialog && conflictData && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                         <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                              <h3 className="text-lg font-medium mb-4">File Conflict</h3>
                              <p className="text-gray-600 mb-4">
                                   A file with the name &quot;{conflictData.file.name}&quot; already exists. What would you like to do?
                              </p>
                              <div className="flex gap-2 justify-end">
                                   <button
                                        onClick={() => handleConflictResolve("keep")}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                                   >
                                        Keep Existing
                                   </button>
                                   <button
                                        onClick={() => handleConflictResolve("replace")}
                                        className="px-4 py-2 bg-yellow-600 text-white hover:bg-yellow-700 rounded"
                                   >
                                        Replace
                                   </button>
                                   <button
                                        onClick={() => handleConflictResolve("rename")}
                                        className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded"
                                   >
                                        Rename New
                                   </button>
                              </div>
                         </div>
                    </div>
               )}
          </div>
     );
}
