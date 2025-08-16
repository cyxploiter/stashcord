"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  MoreVertical,
  Download,
  Star,
  StarOff,
  Trash2,
  Edit,
  Share,
  Copy,
} from "lucide-react";

interface FileItem {
  id: string;
  name: string;
  type: "file";
  fileType: "document" | "image" | "audio" | "video" | "archive";
  size: string;
  modified: string;
  starred?: boolean;
}

interface FileActionMenuProps {
  file: FileItem;
  onDownload: (fileId: string) => void;
  onDelete: (fileId: string) => void;
  onStar: (fileId: string, starred: boolean) => void;
  onRename: (fileId: string, newName: string) => void;
  onShare: (fileId: string) => void;
}

export default function FileActionMenu({
  file,
  onDownload,
  onDelete,
  onStar,
  onRename,
  onShare,
}: FileActionMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newFileName, setNewFileName] = useState(file.name);

  const handleDelete = () => {
    onDelete(file.id);
    setShowDeleteDialog(false);
  };

  const handleRename = () => {
    if (newFileName.trim() && newFileName !== file.name) {
      onRename(file.id, newFileName.trim());
    }
    setShowRenameDialog(false);
  };

  const handleStar = () => {
    onStar(file.id, !file.starred);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => onDownload(file.id)}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onShare(file.id)}>
            <Share className="h-4 w-4 mr-2" />
            Share
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleStar}>
            {file.starred ? (
              <>
                <StarOff className="h-4 w-4 mr-2" />
                Unstar
              </>
            ) : (
              <>
                <Star className="h-4 w-4 mr-2" />
                Star
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowRenameDialog(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(file.name)}>
            <Copy className="h-4 w-4 mr-2" />
            Copy name
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Are you sure you want to delete <strong>{file.name}</strong>?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone. The file will be permanently removed from Discord as well.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!newFileName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
