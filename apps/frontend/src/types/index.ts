export interface TransferProgress {
  transferId: string;
  type: "upload" | "download" | "delete" | "share_create" | "share_access";
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
  fileName: string;
  fileSize?: number;
  bytesTransferred: number;
  progressPercentage: number;
  transferSpeed?: number;
  estimatedTimeRemaining?: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShareActivity {
  shareToken: string;
  fileName: string;
  accessedBy: string;
  accessedAt: Date;
  type: "share_create" | "share_access";
}
