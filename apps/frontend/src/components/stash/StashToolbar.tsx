"use client";

import { Search, Upload, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StashToolbarProps {
     searchQuery: string;
     onSearchQueryChange: (value: string) => void;
     onNewFolder: () => void;
     onUpload: () => void;
     isUploading: boolean;
     canUpload: boolean;
}

export default function StashToolbar({
     searchQuery,
     onSearchQueryChange,
     onNewFolder,
     onUpload,
     isUploading,
     canUpload,
}: StashToolbarProps) {
     return (
          <div className="border-b border-gray-200 bg-white px-6 py-4">
               <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                         <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                   placeholder="Search folders..."
                                   value={searchQuery}
                                   onChange={(e) => onSearchQueryChange(e.target.value)}
                                   className="pl-10 w-64"
                              />
                         </div>
                    </div>
                    <div className="flex items-center gap-2">
                         <Button
                              variant="outline"
                              className="flex items-center gap-2"
                              onClick={onNewFolder}
                         >
                              <FolderPlus className="h-4 w-4" />
                              New Folder
                         </Button>
                         <Button
                              className="flex items-center gap-2"
                              onClick={onUpload}
                              disabled={!canUpload || isUploading}
                              title={
                                   !canUpload
                                        ? "Select a folder first to upload files"
                                        : isUploading
                                             ? "Uploading..."
                                             : "Upload files to current folder"
                              }
                         >
                              <Upload className="h-4 w-4" />
                              {isUploading ? "Uploading..." : "Upload Files"}
                         </Button>
                    </div>
               </div>
          </div>
     );
}