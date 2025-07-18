"use client";

import { FolderOpen, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onUploadFile: () => void;
}

export default function EmptyState({ onUploadFile }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="mb-6">
        <div className="relative">
          <FolderOpen className="w-24 h-24 text-[#5865f2] mx-auto" />
          <div className="absolute -top-2 -right-2 bg-[#5865f2] rounded-full p-2">
            <Upload className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-foreground mb-3">
        This folder is empty!
      </h2>
      
      <p className="text-muted-foreground mb-6 max-w-md">
        Drag and drop a file here or use the upload button to get started.
      </p>
      
      <Button 
        onClick={onUploadFile}
        className="bg-[#5865f2] hover:bg-[#4752c4] text-white font-medium px-6 py-3 rounded-md transition-colors"
      >
        <Upload className="w-4 h-4 mr-2" />
        Upload Your First File
      </Button>
    </div>
  );
}
