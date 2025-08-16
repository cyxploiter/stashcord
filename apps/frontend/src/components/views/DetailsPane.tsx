"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface File {
  id: number;
  name: string;
  size: number;
  createdAt: string;
  type?: string;
}

interface DetailsPaneProps {
  file: File | null;
  onClose: () => void;
}

export default function DetailsPane({ file, onClose }: DetailsPaneProps) {
  const isImage = file?.type === "image";

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const variants = {
    hidden: { x: "100%" },
    visible: { x: 0 },
  };

  return (
    <AnimatePresence>
      {file && (
        <motion.div
          variants={variants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute top-0 right-0 h-full w-80 bg-white border-l border-gray-200 z-20 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold">File Details</h3>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Preview */}
            <div className="mb-6">
              <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center">
                {isImage ? (
                  <ImageIcon className="w-16 h-16 text-gray-400" />
                ) : (
                  <FileText className="w-16 h-16 text-gray-400" />
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">File Name</label>
                <p className="text-sm font-medium truncate">{file.name}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">File Size</label>
                <p className="text-sm font-medium">{formatFileSize(file.size)}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Date Created</label>
                <p className="text-sm font-medium">{new Date(file.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
