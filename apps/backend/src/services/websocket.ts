import { Server as SocketIOServer } from "socket.io";
import { Server } from "http";
import { db } from "../db";
import { transferLogs, files, users } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export interface TransferProgress {
  transferId: string;
  fileId?: string; // Add file ID for consolidation
  type: "upload" | "download" | "delete" | "share_create" | "share_access";
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
  fileName: string;
  fileSize?: number;
  bytesTransferred: number;
  progressPercentage: number;
  transferSpeed?: number;
  estimatedTimeRemaining?: number;
  errorMessage?: string;
  chunksTotal?: number; // Total number of chunks
  chunksCompleted?: number; // Completed chunks
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

class WebSocketService {
  private io: SocketIOServer | null = null;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  // Track active file transfers (consolidates multiple chunks into one progress)
  private activeFileTransfers: Map<
    string,
    {
      transferId: string;
      fileName: string;
      fileSize: number;
      chunksTotal: number;
      chunksCompleted: number;
      bytesTransferred: number;
      startTime: Date;
      lastUpdate: Date;
      userId: string;
    }
  > = new Map();

  initialize(server: Server) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    this.io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      // Handle user authentication
      socket.on(
        "authenticate",
        async (data: { userId: string; token: string }) => {
          try {
            // Verify user token here (you can implement JWT verification)
            const user = await db
              .select()
              .from(users)
              .where(eq(users.id, data.userId))
              .get();

            if (user) {
              socket.data.userId = data.userId;

              // Track user socket
              if (!this.userSockets.has(data.userId)) {
                this.userSockets.set(data.userId, new Set());
              }
              this.userSockets.get(data.userId)!.add(socket.id);

              // Join user-specific room
              socket.join(`user:${data.userId}`);

              console.log(
                `User ${data.userId} authenticated with socket ${socket.id}`
              );

              // Send recent transfer logs to the user
              await this.sendRecentTransfers(socket, data.userId);
            }
          } catch (error) {
            console.error("Authentication error:", error);
            socket.emit("auth_error", { message: "Authentication failed" });
          }
        }
      );

      // Handle transfer subscription
      socket.on("subscribe_transfers", () => {
        if (socket.data.userId) {
          socket.join(`transfers:${socket.data.userId}`);
          console.log(`User ${socket.data.userId} subscribed to transfers`);
        }
      });

      // Handle file sharing events
      socket.on("subscribe_shares", () => {
        if (socket.data.userId) {
          socket.join(`shares:${socket.data.userId}`);
          console.log(
            `User ${socket.data.userId} subscribed to share activities`
          );
        }
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);

        if (socket.data.userId) {
          const userSocketSet = this.userSockets.get(socket.data.userId);
          if (userSocketSet) {
            userSocketSet.delete(socket.id);
            if (userSocketSet.size === 0) {
              this.userSockets.delete(socket.data.userId);
            }
          }
        }
      });
    });
  }

  private async sendRecentTransfers(socket: any, userId: string) {
    try {
      const recentTransfers = await db
        .select()
        .from(transferLogs)
        .where(eq(transferLogs.userId, userId))
        .orderBy(desc(transferLogs.createdAt))
        .limit(20)
        .all();

      const formattedTransfers: TransferProgress[] = recentTransfers.map(
        (transfer) => ({
          transferId: transfer.id,
          type: transfer.type as any,
          status: transfer.status as any,
          fileName: transfer.fileName,
          fileSize: transfer.fileSize || undefined,
          bytesTransferred: transfer.bytesTransferred || 0,
          progressPercentage: transfer.progressPercentage || 0,
          transferSpeed: transfer.transferSpeed || undefined,
          estimatedTimeRemaining: transfer.estimatedTimeRemaining || undefined,
          errorMessage: transfer.errorMessage || undefined,
          createdAt: new Date(transfer.createdAt!),
          updatedAt: new Date(transfer.updatedAt!),
        })
      );

      socket.emit("recent_transfers", formattedTransfers);
    } catch (error) {
      console.error("Error sending recent transfers:", error);
    }
  }

  // Create a new transfer log entry
  async createTransferLog(
    userId: string,
    fileId: number | null,
    type: "upload" | "download" | "delete" | "share_create" | "share_access",
    fileName: string,
    fileSize?: number,
    mimeType?: string,
    shareToken?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    const transferId = uuidv4();

    try {
      await db
        .insert(transferLogs)
        .values({
          id: transferId,
          userId,
          type,
          status: "pending",
          fileName,
          fileSize,
          mimeType,
          bytesTransferred: 0,
          progressPercentage: 0,
          shareToken,
          ipAddress,
          userAgent,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .run();

      // Emit to user's transfer room
      this.emitToUser(userId, "transfer_created", {
        transferId,
        type,
        status: "pending",
        fileName,
        fileSize,
        bytesTransferred: 0,
        progressPercentage: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return transferId;
    } catch (error) {
      console.error("Error creating transfer log:", error);
      throw error;
    }
  }

  // Create or update file-level transfer tracking
  async createFileTransfer(
    fileId: string,
    userId: string,
    fileName: string,
    fileSize: number,
    chunksTotal: number
  ): Promise<string> {
    const transferId = uuidv4();

    const fileTransfer = {
      transferId,
      fileName,
      fileSize,
      chunksTotal,
      chunksCompleted: 0,
      bytesTransferred: 0,
      startTime: new Date(),
      lastUpdate: new Date(),
      userId,
    };

    this.activeFileTransfers.set(fileId, fileTransfer);

    // Create a single transfer log for the file
    await db
      .insert(transferLogs)
      .values({
        id: transferId,
        userId,
        type: "upload",
        status: "pending",
        fileName,
        fileSize,
        mimeType: "application/octet-stream", // We'll update this if needed
        bytesTransferred: 0,
        progressPercentage: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run();

    // Emit initial progress
    this.emitToUser(userId, "transfer_created", {
      transferId,
      fileId,
      type: "upload",
      status: "pending",
      fileName,
      fileSize,
      bytesTransferred: 0,
      progressPercentage: 0,
      chunksTotal,
      chunksCompleted: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return transferId;
  }

  // Update transfer progress
  async updateTransferProgress(
    transferId: string,
    updates: {
      status?: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
      bytesTransferred?: number;
      progressPercentage?: number;
      transferSpeed?: number;
      estimatedTimeRemaining?: number;
      errorMessage?: string;
      errorCode?: string;
      startedAt?: Date;
      completedAt?: Date;
    }
  ) {
    try {
      const updateData: any = {
        ...updates,
        updatedAt: new Date(),
      };

      await db
        .update(transferLogs)
        .set(updateData)
        .where(eq(transferLogs.id, transferId))
        .run();

      // Get the updated transfer log
      const updatedTransfer = await db
        .select()
        .from(transferLogs)
        .where(eq(transferLogs.id, transferId))
        .get();

      if (updatedTransfer && updatedTransfer.userId) {
        const progress: TransferProgress = {
          transferId: updatedTransfer.id,
          type: updatedTransfer.type as any,
          status: updatedTransfer.status as any,
          fileName: updatedTransfer.fileName,
          fileSize: updatedTransfer.fileSize || undefined,
          bytesTransferred: updatedTransfer.bytesTransferred || 0,
          progressPercentage: updatedTransfer.progressPercentage || 0,
          transferSpeed: updatedTransfer.transferSpeed || undefined,
          estimatedTimeRemaining:
            updatedTransfer.estimatedTimeRemaining || undefined,
          errorMessage: updatedTransfer.errorMessage || undefined,
          createdAt: new Date(updatedTransfer.createdAt!),
          updatedAt: new Date(updatedTransfer.updatedAt!),
        };

        // Emit to user's transfer room
        this.emitToUser(updatedTransfer.userId, "transfer_progress", progress);
      }
    } catch (error) {
      console.error("Error updating transfer progress:", error);
      throw error;
    }
  }

  // Update file transfer progress (called when chunks complete)
  async updateFileTransferProgress(fileId: string, chunkSize: number) {
    const fileTransfer = this.activeFileTransfers.get(fileId);
    if (!fileTransfer) return;

    fileTransfer.chunksCompleted++;
    fileTransfer.bytesTransferred += chunkSize;
    fileTransfer.lastUpdate = new Date();

    const progressPercentage = Math.round(
      (fileTransfer.bytesTransferred / fileTransfer.fileSize) * 100
    );

    // Calculate transfer speed
    const elapsed =
      (fileTransfer.lastUpdate.getTime() - fileTransfer.startTime.getTime()) /
      1000;
    const transferSpeed =
      elapsed > 0 ? fileTransfer.bytesTransferred / elapsed : 0;

    // Calculate ETA
    const remainingBytes =
      fileTransfer.fileSize - fileTransfer.bytesTransferred;
    const estimatedTimeRemaining =
      transferSpeed > 0 ? remainingBytes / transferSpeed : undefined;

    const status =
      fileTransfer.chunksCompleted >= fileTransfer.chunksTotal
        ? "completed"
        : "in_progress";

    // Update database
    await db
      .update(transferLogs)
      .set({
        status,
        bytesTransferred: fileTransfer.bytesTransferred,
        progressPercentage,
        transferSpeed: Math.round(transferSpeed),
        estimatedTimeRemaining: estimatedTimeRemaining
          ? Math.round(estimatedTimeRemaining)
          : undefined,
        updatedAt: new Date(),
        ...(status === "completed" && { completedAt: new Date() }),
      })
      .where(eq(transferLogs.id, fileTransfer.transferId))
      .run();

    // Emit progress update
    this.emitToUser(fileTransfer.userId, "transfer_progress", {
      transferId: fileTransfer.transferId,
      fileId,
      type: "upload",
      status,
      fileName: fileTransfer.fileName,
      fileSize: fileTransfer.fileSize,
      bytesTransferred: fileTransfer.bytesTransferred,
      progressPercentage,
      transferSpeed: Math.round(transferSpeed),
      estimatedTimeRemaining: estimatedTimeRemaining
        ? Math.round(estimatedTimeRemaining)
        : undefined,
      chunksTotal: fileTransfer.chunksTotal,
      chunksCompleted: fileTransfer.chunksCompleted,
      createdAt: fileTransfer.startTime,
      updatedAt: fileTransfer.lastUpdate,
    });

    // Clean up completed transfers
    if (status === "completed") {
      this.activeFileTransfers.delete(fileId);
    }
  }

  // Mark file transfer as failed
  async markFileTransferFailed(fileId: string, errorMessage: string) {
    const fileTransfer = this.activeFileTransfers.get(fileId);
    if (!fileTransfer) return;

    await db
      .update(transferLogs)
      .set({
        status: "failed",
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(transferLogs.id, fileTransfer.transferId))
      .run();

    this.emitToUser(fileTransfer.userId, "transfer_progress", {
      transferId: fileTransfer.transferId,
      fileId,
      type: "upload",
      status: "failed",
      fileName: fileTransfer.fileName,
      fileSize: fileTransfer.fileSize,
      bytesTransferred: fileTransfer.bytesTransferred,
      progressPercentage: Math.round(
        (fileTransfer.bytesTransferred / fileTransfer.fileSize) * 100
      ),
      errorMessage,
      chunksTotal: fileTransfer.chunksTotal,
      chunksCompleted: fileTransfer.chunksCompleted,
      createdAt: fileTransfer.startTime,
      updatedAt: new Date(),
    });

    this.activeFileTransfers.delete(fileId);
  }

  // Log share activity
  async logShareActivity(
    shareToken: string,
    fileName: string,
    type: "share_create" | "share_access",
    accessedBy?: string,
    ownerId?: string
  ) {
    try {
      const activity: ShareActivity = {
        shareToken,
        fileName,
        accessedBy: accessedBy || "Anonymous",
        accessedAt: new Date(),
        type,
      };

      // Emit to owner's share room if available
      if (ownerId) {
        this.emitToUser(ownerId, "share_activity", activity);
      }

      // Also emit to global shares room for admin monitoring
      this.io?.to("admin:shares").emit("share_activity", activity);
    } catch (error) {
      console.error("Error logging share activity:", error);
    }
  }

  // Emit message to specific user
  private emitToUser(userId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
      this.io.to(`transfers:${userId}`).emit(event, data);
    }
  }

  // Emit to all users (admin broadcast)
  emitToAll(event: string, data: any) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  // Get active users count
  getActiveUsersCount(): number {
    return this.userSockets.size;
  }

  // Get user's active connections
  getUserConnectionsCount(userId: string): number {
    return this.userSockets.get(userId)?.size || 0;
  }

  // Force disconnect user (admin function)
  disconnectUser(userId: string) {
    const userSocketSet = this.userSockets.get(userId);
    if (userSocketSet && this.io) {
      userSocketSet.forEach((socketId) => {
        this.io!.sockets.sockets.get(socketId)?.disconnect(true);
      });
      this.userSockets.delete(userId);
    }
  }
}

export const webSocketService = new WebSocketService();
