"use client";

import { MoreHorizontal, Download, Trash2, FileIcon, VideoIcon, ImageIcon, FileTextIcon, ArchiveIcon, MusicIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
     DropdownMenu,
     DropdownMenuContent,
     DropdownMenuItem,
     DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatFileSize, formatRelativeTime } from "@/lib/utils";

interface File {
     id: number;
     name: string;
     size: number;
     createdAt: string;
     type?: string;
}

interface FileListViewProps {
     files: File[];
     onDownload: (fileId: number) => void;
     onDelete: (fileId: number) => void;
     onSelectFile: (file: File) => void;
}

const getFileIcon = (type?: string) => {
     switch (type) {
          case "video":
               return <VideoIcon className="h-5 w-5 text-red-500" />;
          case "image":
               return <ImageIcon className="h-5 w-5 text-green-500" />;
          case "pdf":
          case "text":
               return <FileTextIcon className="h-5 w-5 text-blue-500" />;
          case "audio":
               return <MusicIcon className="h-5 w-5 text-purple-500" />;
          case "archive":
               return <ArchiveIcon className="h-5 w-5 text-yellow-500" />;
          default:
               return <FileIcon className="h-5 w-5 text-gray-500" />;
     }
};

export default function FileListView({ files, onDownload, onDelete, onSelectFile }: FileListViewProps) {
     return (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
               {/* Header */}
               <div className="grid grid-cols-4 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
                    <div>Name</div>
                    <div>Size</div>
                    <div>Modified</div>
                    <div></div>
               </div>

               {/* File List */}
               <div className="divide-y divide-gray-100">
                    {files.map((file) => (
                         <div
                              key={file.id}
                              className="grid grid-cols-4 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                              onClick={() => onSelectFile(file)}
                         >
                              {/* Name */}
                              <div className="flex items-center gap-3 min-w-0">
                                   {getFileIcon(file.type)}
                                   <span className="text-sm font-medium text-gray-900 truncate">
                                        {file.name}
                                   </span>
                              </div>

                              {/* Size */}
                              <div className="flex items-center">
                                   <span className="text-sm text-gray-600">
                                        {formatFileSize(file.size)}
                                   </span>
                              </div>

                              {/* Modified */}
                              <div className="flex items-center">
                                   <span className="text-sm text-gray-600">
                                        {formatRelativeTime(file.createdAt)}
                                   </span>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center justify-end">
                                   <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                             <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                  <MoreHorizontal className="h-4 w-4" />
                                                  <span className="sr-only">Open menu</span>
                                             </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                             <DropdownMenuItem onClick={() => onDownload(file.id)}>
                                                  <Download className="mr-2 h-4 w-4" />
                                                  Download
                                             </DropdownMenuItem>
                                             <DropdownMenuItem
                                                  onClick={() => onDelete(file.id)}
                                                  className="text-red-600 focus:text-red-600"
                                             >
                                                  <Trash2 className="mr-2 h-4 w-4" />
                                                  Delete
                                             </DropdownMenuItem>
                                        </DropdownMenuContent>
                                   </DropdownMenu>
                              </div>
                         </div>
                    ))}
               </div>
          </div>
     );
}
