"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Upload } from "lucide-react";

interface DragDropOverlayProps {
  isVisible: boolean;
}

export default function DragDropOverlay({ isVisible }: DragDropOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-[#5865f2]/20 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-4 border-4 border-dashed border-[#5865f2] rounded-lg flex items-center justify-center"
          >
            <div className="text-center">
              <Upload className="w-16 h-16 text-[#5865f2] mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">
                Drop files to upload
              </h3>
              <p className="text-white/80">
                Release to start uploading
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
