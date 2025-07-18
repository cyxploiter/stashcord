"use client";

import { Upload } from "lucide-react";

interface DragDropOverlayProps {
  isVisible: boolean;
}

export default function DragDropOverlay({ isVisible }: DragDropOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#5865f2]/20 backdrop-blur-sm">
      <div className="absolute inset-4 border-4 border-dashed border-[#5865f2] rounded-lg flex items-center justify-center">
        <div className="text-center">
          <Upload className="w-16 h-16 text-[#5865f2] mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">
            Drop files to upload
          </h3>
          <p className="text-white/80">
            Release to start uploading
          </p>
        </div>
      </div>
    </div>
  );
}
