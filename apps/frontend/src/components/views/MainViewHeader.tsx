"use client";

import { Upload, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useViewMode } from "@/context/SettingsContext";
import Breadcrumbs from "@/components/common/Breadcrumbs";

interface MainViewHeaderProps {
  folderName: string | null;
  path: { id: number; name: string }[];
  onUploadFile: () => void;
  onNavigate: (folderId: number | null) => void;
}

export default function MainViewHeader({ folderName, path, onUploadFile, onNavigate }: MainViewHeaderProps) {
  const { viewMode, setViewMode } = useViewMode();

  return (
    <div className="flex items-center justify-between px-8 py-6 bg-background theme-transition">
      <div className="flex items-center gap-3">
        {folderName ? (
          <Breadcrumbs path={path} onNavigate={onNavigate} />
        ) : (
          <h1 className="text-2xl font-semibold text-foreground">Select a folder</h1>
        )}
      </div>

      {folderName && (
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-surface rounded-lg p-1">
            <Button
              size="sm"
              variant={viewMode === "grid" ? "default" : "ghost"}
              onClick={() => setViewMode("grid")}
              className="h-8 w-8 p-0"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              onClick={() => setViewMode("list")}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={onUploadFile}
            className="bg-surface hover:bg-surface-hover text-foreground font-medium px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload File
          </Button>
        </div>
      )}
    </div>
  );
}
