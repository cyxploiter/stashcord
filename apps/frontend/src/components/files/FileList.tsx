"use client";

import MainContentView from "@/components/views/MainContentView";

interface FileListProps {
  folderId: number | null;
}

export default function FileList({ folderId }: FileListProps) {
  // In a real app, you would fetch the folder name from your API
  const folderName = folderId ? `folder-${folderId}` : null;

  return (
    <MainContentView
      folderId={folderId}
      folderName={folderName}
    />
  );
}
