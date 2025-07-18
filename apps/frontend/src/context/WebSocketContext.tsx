"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";

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

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  transfers: TransferProgress[];
  shareActivities: ShareActivity[];
  createTransferLog: (
    fileId: number | null,
    type: TransferProgress["type"],
    fileName: string,
    fileSize?: number
  ) => Promise<string>;
  updateTransferProgress: (
    transferId: string,
    updates: Partial<Pick<TransferProgress, "status" | "bytesTransferred" | "progressPercentage" | "transferSpeed" | "estimatedTimeRemaining" | "errorMessage">>
  ) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [transfers, setTransfers] = useState<TransferProgress[]>([]);
  const [shareActivities, setShareActivities] = useState<ShareActivity[]>([]);
  
  // Track shown toasts to prevent duplicates
  const shownToasts = useRef(new Set<string>());
  
  // Function to show toast only once per unique key
  const showToastOnce = (key: string, toastFn: () => void) => {
    if (!shownToasts.current.has(key)) {
      shownToasts.current.add(key);
      toastFn();
      // Clean up old toast keys after 5 seconds
      setTimeout(() => {
        shownToasts.current.delete(key);
      }, 5000);
    }
  };

  // Initialize socket connection
  useEffect(() => {
    if (!user) {
      // Disconnect if no user
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setTransfers([]);
        setShareActivities([]);
      }
      return;
    }

    // Avoid creating duplicate connections
    if (socket?.connected) {
      return;
    }
    
    // Disconnect any existing socket first
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }

    // Create socket connection
    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001", {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    // Connection event handlers
    newSocket.on("connect", () => {
      console.log("WebSocket connected:", newSocket.id);
      setIsConnected(true);
      
      // Authenticate with the server
      newSocket.emit("authenticate", {
        userId: user.id,
        token: "mock-token", // In production, use a real JWT token
      });

      // Subscribe to transfers and shares
      newSocket.emit("subscribe_transfers");
      newSocket.emit("subscribe_shares");
    });

    newSocket.on("disconnect", () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    });

    newSocket.on("auth_error", (data) => {
      console.error("WebSocket auth error:", data);
      toast.error("Failed to authenticate WebSocket connection");
    });

    // Transfer event handlers
    newSocket.on("recent_transfers", (transferList: TransferProgress[]) => {
      console.log("Received recent transfers:", transferList);
      setTransfers(transferList);
    });

    newSocket.on("transfer_created", (transfer: TransferProgress) => {
      console.log("Transfer created:", transfer);
      setTransfers(prev => [transfer, ...prev.slice(0, 19)]); // Keep max 20 transfers
      // Removed toast notification for transfer start
    });

    newSocket.on("transfer_progress", (progress: TransferProgress) => {
      console.log("Transfer progress:", progress);
      setTransfers(prev => 
        prev.map(t => t.transferId === progress.transferId ? progress : t)
      );

      // Show only error toasts, not completion toasts
      if (progress.status === "failed") {
        showToastOnce(`failed-${progress.transferId}`, () => {
          toast.error(`${progress.type} failed: ${progress.fileName}`);
        });
      }
      // Removed success toast notification for completion
    });

    // Share activity handlers
    newSocket.on("share_activity", (activity: ShareActivity) => {
      console.log("Share activity:", activity);
      setShareActivities(prev => [activity, ...prev.slice(0, 19)]); // Keep max 20 activities
      
      if (activity.type === "share_create") {
        showToastOnce(`share-create-${activity.fileName}-${activity.shareToken}`, () => {
          toast.success(`Share link created for ${activity.fileName}`);
        });
      } else if (activity.type === "share_access") {
        showToastOnce(`share-access-${activity.fileName}-${activity.accessedBy}-${activity.accessedAt}`, () => {
          toast(`${activity.accessedBy} accessed ${activity.fileName}`, {
            icon: "📁",
          });
        });
      }
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const createTransferLog = useCallback(async (
    fileId: number | null,
    type: TransferProgress["type"],
    fileName: string,
    fileSize?: number
  ): Promise<string> => {
    // This would typically be done on the backend when an operation starts
    // For now, we'll generate a mock transfer ID
    const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newTransfer: TransferProgress = {
      transferId,
      type,
      status: "pending",
      fileName,
      fileSize,
      bytesTransferred: 0,
      progressPercentage: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setTransfers(prev => [newTransfer, ...prev.slice(0, 19)]);
    
    return transferId;
  }, []);

  const updateTransferProgress = useCallback((
    transferId: string,
    updates: Partial<Pick<TransferProgress, "status" | "bytesTransferred" | "progressPercentage" | "transferSpeed" | "estimatedTimeRemaining" | "errorMessage">>
  ) => {
    setTransfers(prev => 
      prev.map(t => 
        t.transferId === transferId 
          ? { ...t, ...updates, updatedAt: new Date() }
          : t
      )
    );
  }, []);

  const value: WebSocketContextType = {
    socket,
    isConnected,
    transfers,
    shareActivities,
    createTransferLog,
    updateTransferProgress,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}
