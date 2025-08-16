"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Share, ExternalLink, Clock } from "lucide-react";

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
  onGenerateShareLink: (fileId: string, expiresIn?: number) => Promise<string>;
}

export default function ShareDialog({
  isOpen,
  onClose,
  fileId,
  fileName,
  onGenerateShareLink,
}: ShareDialogProps) {
  const [shareLink, setShareLink] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expiryDays, setExpiryDays] = useState<number>(7);

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      const link = await onGenerateShareLink(fileId, expiryDays);
      setShareLink(link);
    } catch (error) {
      console.error("Failed to generate share link:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  const handleClose = () => {
    setShareLink("");
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share className="w-5 h-5" />
            Share File
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="font-medium text-gray-900 mb-1">File to share</p>
            <p className="text-sm text-gray-600 truncate">{fileName}</p>
          </div>

          {!shareLink ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link expires in
                </label>
                <select
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1 day</option>
                  <option value={7}>1 week</option>
                  <option value={30}>1 month</option>
                  <option value={0}>Never expires</option>
                </select>
              </div>

              <Button
                onClick={handleGenerateLink}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? "Generating..." : "Generate Share Link"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                  />
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    size="sm"
                    className="px-3"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                {expiryDays === 0
                  ? "Link never expires"
                  : `Link expires in ${expiryDays} day${expiryDays === 1 ? '' : 's'}`
                }
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => window.open(shareLink, '_blank')}
                  variant="outline"
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Link
                </Button>
                <Button onClick={handleCopyLink} className="flex-1">
                  {copied ? "Copied!" : "Copy Link"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
