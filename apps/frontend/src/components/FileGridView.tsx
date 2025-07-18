"use client";

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
}

export default function FileGridView({ files, onDownload, onDelete }: FileGridViewProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 mt-6">
      {files.map((file) => (
        <FileCard
          key={file.id}
          file={file}
          onDownload={onDownload}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
