"use client";
/* eslint-disable jsx-a11y/alt-text */

import { useState } from "react";
import { Download, Trash2, FileText, Image, Video, Music, Archive, FileCode, Presentation, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FileCardProps {
  file: {
    id: number;
    name: string;
    size: number;
    createdAt: string;
    type?: string;
  };
  onDownload: (fileId: number) => void;
  onDelete: (fileId: number) => void;
}

const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();

  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension || '')) {
    return <Image className="w-12 h-12 text-[#5865f2]" />;
  }

  // Video files
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension || '')) {
    return <Video className="w-12 h-12 text-[#5865f2]" />;
  }

  // Audio files
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(extension || '')) {
    return <Music className="w-12 h-12 text-[#5865f2]" />;
  }

  // Archive files
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension || '')) {
    return <Archive className="w-12 h-12 text-[#5865f2]" />;
  }

  // Code files
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs'].includes(extension || '')) {
    return <FileCode className="w-12 h-12 text-[#5865f2]" />;
  }

  // Presentation files
  if (['ppt', 'pptx', 'key'].includes(extension || '')) {
    return <Presentation className="w-12 h-12 text-[#5865f2]" />;
  }

  // Spreadsheet files
  if (['xls', 'xlsx', 'csv', 'numbers'].includes(extension || '')) {
    return <FileSpreadsheet className="w-12 h-12 text-[#5865f2]" />;
  }

  // Default file icon
  return <FileText className="w-12 h-12 text-[#5865f2]" />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;

  return date.toLocaleDateString();
};

export default function FileCard({ file, onDownload, onDelete }: FileCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <TooltipProvider>
      <div
        className="file-card bg-white rounded-xl p-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-100 overflow-hidden theme-transition"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Thumbnail Area */}
        <div className="h-32 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-surface dark:to-surface-elevated flex items-center justify-center relative">
          {getFileIcon(file.name)}

          {/* Action Buttons - Appear on Hover */}
          {isHovered && (
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-full bg-white/90 dark:bg-surface/90 hover:bg-white dark:hover:bg-surface shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(file.id);
                    }}
                  >
                    <Download className="h-3 w-3 text-gray-600 dark:text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Download</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-full bg-white/90 dark:bg-surface/90 hover:bg-red-500 hover:text-white shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(file.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="p-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <h3 className="font-medium text-foreground text-sm mb-1 truncate">
                {file.name}
              </h3>
            </TooltipTrigger>
            <TooltipContent>
              <p>{file.name}</p>
            </TooltipContent>
          </Tooltip>

          <p className="text-muted-foreground text-xs">
            {formatFileSize(file.size)} • {formatTimeAgo(file.createdAt)}
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}
