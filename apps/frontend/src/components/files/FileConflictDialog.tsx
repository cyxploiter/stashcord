"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, File, Clock, HardDrive } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface FileConflictData {
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
}

interface FileConflictDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conflictData: FileConflictData | null;
  onResolve: (action: "replace" | "keep" | "rename") => void;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return date.toLocaleDateString();
}

export default function FileConflictDialog({
  isOpen,
  onClose,
  conflictData,
  onResolve,
}: FileConflictDialogProps) {
  const [selectedAction, setSelectedAction] = useState<"replace" | "keep" | "rename">("keep");

  if (!conflictData) return null;

  const { existingFile, uploadedFile } = conflictData;

  const handleResolve = () => {
    onResolve(selectedAction);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            File Already Exists
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-gray-600">
            A file with identical content already exists in this folder. What would you like to do?
          </p>

          {/* File Comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* Existing File */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <File className="w-4 h-4" />
                Existing File
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {existingFile.name}
                </div>
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Size:</span> {formatBytes(existingFile.size)}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Uploaded:</span> {formatTimeAgo(existingFile.createdAt)}
                </div>
                <div>
                  <span className="font-medium">Type:</span> {existingFile.mimeType}
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <span className={`ml-1 px-2 py-1 rounded text-xs ${existingFile.uploadStatus === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                    }`}>
                    {existingFile.uploadStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* New File */}
            <div className="border rounded-lg p-4 bg-blue-50">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <File className="w-4 h-4" />
                New File
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {uploadedFile.name}
                </div>
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Size:</span> {formatBytes(uploadedFile.size)}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Uploaded:</span> Now
                </div>
                <div>
                  <span className="font-medium">Type:</span> {uploadedFile.mimeType}
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <span className="ml-1 px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
                    pending
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Selection */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Choose an action:</h4>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="conflict-action"
                  value="keep"
                  checked={selectedAction === "keep"}
                  onChange={(e) => setSelectedAction(e.target.value as "keep")}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">Keep existing file</div>
                  <div className="text-sm text-gray-600">
                    Cancel the upload and keep the existing file. The new file will not be uploaded.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="conflict-action"
                  value="replace"
                  checked={selectedAction === "replace"}
                  onChange={(e) => setSelectedAction(e.target.value as "replace")}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">Replace existing file</div>
                  <div className="text-sm text-gray-600">
                    Delete the existing file and upload the new one. This action cannot be undone.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="conflict-action"
                  value="rename"
                  checked={selectedAction === "rename"}
                  onChange={(e) => setSelectedAction(e.target.value as "rename")}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">Upload with new name</div>
                  <div className="text-sm text-gray-600">
                    Upload the new file with an automatically generated name (e.g., &ldquo;filename (1).ext&rdquo;).
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleResolve}
            variant={selectedAction === "replace" ? "destructive" : "default"}
          >
            {selectedAction === "keep" && "Keep Existing"}
            {selectedAction === "replace" && "Replace File"}
            {selectedAction === "rename" && "Upload with New Name"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
