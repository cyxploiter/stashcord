"use client";

import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MainViewHeaderProps {
  folderName: string | null;
  onUploadFile: () => void;
}

export default function MainViewHeader({ folderName, onUploadFile }: MainViewHeaderProps) {
  return (
    <div className="flex items-center justify-between px-8 py-6 bg-white border-b border-gray-200">
      <div className="flex items-center gap-3">
        <span className="text-2xl font-bold text-blue-600">#</span>
        <h1 className="text-2xl font-semibold text-gray-900">
          {folderName || "Select a folder"}
        </h1>
      </div>
      
      {folderName && (
        <Button 
          onClick={onUploadFile}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-2.5 rounded-lg transition-colors border border-gray-200 flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload File
        </Button>
      )}
    </div>
  );
}
