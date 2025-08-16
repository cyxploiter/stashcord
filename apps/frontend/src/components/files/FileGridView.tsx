"use client";

import { motion } from "framer-motion";
import FileCard from "./FileCard";

interface File {
  id: number;
  name: string;
  size: number;
  createdAt: string;
  type?: string;
}

interface FileGridViewProps {
  files: File[];
  onDownload: (fileId: number) => void;
  onDelete: (fileId: number) => void;
  onSelectFile: (file: File) => void;
}

export default function FileGridView({ files, onDownload, onDelete, onSelectFile }: FileGridViewProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  return (
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 mt-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {files.map((file) => (
        <motion.div key={file.id} variants={itemVariants} onClick={() => onSelectFile(file)}>
          <FileCard
            file={file}
            onDownload={onDownload}
            onDelete={onDelete}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
