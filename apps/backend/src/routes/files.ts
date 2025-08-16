import { Router, Request, Response } from "express";
import { db } from "../db";
import { files, folders, fileChunks as chunks } from "../db/schema";
import { authenticateToken } from "../middleware/auth";
import { eq, and, desc } from "drizzle-orm";
import multer from "multer";
import { discordBot } from "../bot/client";
import { settingsService } from "../services/settings";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const MAX_CHUNK_SIZE = 7 * 1024 * 1024; // 7MB (safe size for Discord with message overhead)

// GET /api/files?folderId=:folderId
router.get(
  "/",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { folderId } = req.query;

    if (!folderId || typeof folderId !== "string") {
      res
        .status(400)
        .json({ error: "folderId is required and must be a string" });
      return;
    }

    try {
      const folder = await db
        .select()
        .from(folders)
        .where(
          and(
            eq(folders.discordForumId, folderId), // Use discordForumId instead of id
            eq(folders.ownerId, req.user!.id)
          )
        )
        .get();

      if (!folder) {
        res.status(404).json({ error: "Folder not found or access denied" });
        return;
      }

      const userFiles = await db
        .select()
        .from(files)
        .where(
          and(
            eq(files.folderId, folderId), // folderId is now the Discord forum ID
            eq(files.ownerId, req.user!.id)
          )
        )
        .orderBy(desc(files.createdAt));

      res.json(userFiles);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// POST /api/upload
router.post(
  "/upload",
  authenticateToken,
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    const { folderId } = req.body;
    const file = req.file;

    if (!folderId || !file || typeof folderId !== "string") {
      res
        .status(400)
        .json({ error: "folderId (string) and file are required" });
      return;
    }

    try {
      const folder = await db
        .select()
        .from(folders)
        .where(
          and(
            eq(folders.discordForumId, folderId), // Use discordForumId
            eq(folders.ownerId, req.user!.id)
          )
        )
        .get();

      if (!folder) {
        res.status(404).json({ error: "Folder not found or access denied" });
        return;
      }

      // Get user settings for dynamic behavior
      const userId = req.user!.id;
      const shouldCompress = await settingsService.shouldCompress(userId);
      const shouldDetectDuplicates =
        await settingsService.shouldDetectDuplicates(userId);
      const chunkSizeBytes = await settingsService.getChunkSizeBytes(userId);

      // Check for duplicates if enabled
      if (shouldDetectDuplicates) {
        const existingFile = await db
          .select()
          .from(files)
          .where(
            and(
              eq(files.name, file.originalname),
              eq(files.size, file.size),
              eq(files.folderId, folderId),
              eq(files.ownerId, userId)
            )
          )
          .get();

        if (existingFile) {
          res.status(409).json({
            error: "Duplicate file detected",
            message:
              "A file with the same name and size already exists in this folder",
            existingFile: existingFile,
          });
          return;
        }
      }

      // TODO: Implement compression if enabled
      // if (shouldCompress) {
      //   // Compress file buffer here
      // }

      // Create a new thread in the folder's channel
      const thread = await discordBot.createForumPost(
        folder.discordForumId!, // This is now the primary key
        file.originalname,
        file.originalname
      );

      if (!thread) {
        res.status(500).json({ error: "Failed to create Discord thread" });
        return;
      }

      // Insert a record into the files table
      const [newFile] = await db
        .insert(files)
        .values({
          name: file.originalname,
          originalName: file.originalname,
          slug: file.originalname.toLowerCase().replace(/ /g, "-"),
          folderId: folder.discordForumId, // Use discordForumId instead of folder.id
          threadId: thread.postId,
          ownerId: req.user!.id,
          size: file.size,
          mimeType: file.mimetype,
        })
        .returning();

      // Split the file into chunks using user's preferred chunk size
      const fileBuffer = file.buffer;
      const effectiveChunkSize = Math.min(chunkSizeBytes, MAX_CHUNK_SIZE);
      const numChunks = Math.ceil(fileBuffer.length / effectiveChunkSize);

      for (let i = 0; i < numChunks; i++) {
        const start = i * effectiveChunkSize;
        const end = Math.min(start + effectiveChunkSize, fileBuffer.length);
        const chunk = fileBuffer.slice(start, end);

        const message = await discordBot.uploadFileChunk(
          thread.postId,
          chunk,
          i,
          file.originalname,
          numChunks
        );

        if (message) {
          await db.insert(chunks).values({
            fileThreadId: newFile.threadId,
            chunkIndex: i,
            discordMessageId: message.messageId,
            discordAttachmentId: message.attachmentId,
            cdnUrl: message.cdnUrl,
            size: chunk.length,
          });
        }
      }

      res.status(201).json(newFile);
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// GET /api/download/:fileId
router.get(
  "/download/:fileId",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { fileId } = req.params;

    try {
      const file = await db
        .select()
        .from(files)
        .where(and(eq(files.threadId, fileId), eq(files.ownerId, req.user!.id)))
        .get();

      if (!file) {
        res.status(404).json({ error: "File not found or access denied" });
        return;
      }

      const fileChunks = await db
        .select()
        .from(chunks)
        .where(eq(chunks.fileThreadId, file.threadId))
        .orderBy(chunks.chunkIndex);

      if (!fileChunks.length) {
        res.status(404).json({ error: "File chunks not found" });
        return;
      }

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${file.name}"`
      );
      res.setHeader("Content-Length", file.size.toString());

      for (const chunk of fileChunks) {
        const buffer = await discordBot.downloadFileChunk(chunk.cdnUrl);
        if (buffer) {
          res.write(buffer);
        }
      }

      res.end();
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// PUT /api/files/:fileId - Update file properties (star, rename)
router.put(
  "/:fileId",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { fileId } = req.params;
    const { isStarred, name } = req.body;

    try {
      const file = await db
        .select()
        .from(files)
        .where(and(eq(files.threadId, fileId), eq(files.ownerId, req.user!.id)))
        .get();

      if (!file) {
        res.status(404).json({ error: "File not found or access denied" });
        return;
      }

      // Prepare update object
      const updateData: any = {
        updatedAt: new Date(), // Use Date object
      };

      if (typeof isStarred === "boolean") {
        updateData.isStarred = isStarred;
      }

      if (typeof name === "string" && name.trim() !== "") {
        updateData.name = name.trim();
        updateData.originalName = name.trim();
        updateData.slug = name.trim().toLowerCase().replace(/ /g, "-");
      }

      // Update file in database
      const [updatedFile] = await db
        .update(files)
        .set(updateData)
        .where(eq(files.threadId, fileId))
        .returning();

      res.status(200).json({
        success: true,
        data: updatedFile,
      });
    } catch (error) {
      console.error("Error updating file:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// DELETE /api/files/:fileId - Delete a file (alternative route)
router.delete(
  "/:fileId",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { fileId } = req.params;

    try {
      const file = await db
        .select()
        .from(files)
        .where(and(eq(files.threadId, fileId), eq(files.ownerId, req.user!.id)))
        .get();

      if (!file) {
        res.status(404).json({ error: "File not found or access denied" });
        return;
      }

      await discordBot.deleteThread(file.threadId);
      await db.delete(files).where(eq(files.threadId, fileId));

      res.status(200).json({
        success: true,
        message: "File deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// DELETE /api/file/:fileId
router.delete(
  "/file/:fileId",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { fileId } = req.params;

    try {
      const file = await db
        .select()
        .from(files)
        .where(and(eq(files.threadId, fileId), eq(files.ownerId, req.user!.id)))
        .get();

      if (!file) {
        res.status(404).json({ error: "File not found or access denied" });
        return;
      }

      await discordBot.deleteThread(file.threadId);
      await db.delete(files).where(eq(files.threadId, fileId));

      res.status(200).json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// POST /api/files/bulk-delete - Delete multiple files
router.delete(
  "/bulk-delete",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { fileIds } = req.body;

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      res.status(400).json({ error: "fileIds array is required" });
      return;
    }

    try {
      const deletedFiles = [];
      const errors = [];

      for (const fileId of fileIds) {
        try {
          const file = await db
            .select()
            .from(files)
            .where(
              and(eq(files.threadId, fileId), eq(files.ownerId, req.user!.id))
            )
            .get();

          if (!file) {
            errors.push({ fileId, error: "File not found or access denied" });
            continue;
          }

          await discordBot.deleteThread(file.threadId);
          await db.delete(files).where(eq(files.threadId, fileId));

          deletedFiles.push(fileId);
        } catch (error) {
          console.error(`Error deleting file ${fileId}:`, error);
          errors.push({ fileId, error: "Failed to delete file" });
        }
      }

      res.status(200).json({
        success: true,
        data: {
          deletedFiles,
          errors,
          deletedCount: deletedFiles.length,
          errorCount: errors.length,
        },
      });
    } catch (error) {
      console.error("Error in bulk delete:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// POST /api/files/bulk-download - Download multiple files as ZIP
router.post(
  "/bulk-download",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { fileIds } = req.body;

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      res.status(400).json({ error: "fileIds array is required" });
      return;
    }

    try {
      // This is a simplified implementation
      // In a real implementation, you'd create a ZIP file from the Discord files
      res.status(501).json({
        error:
          "Bulk download not yet implemented. Please download files individually.",
      });
    } catch (error) {
      console.error("Error in bulk download:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// POST /api/files/:fileId/share - Generate share link for file
router.post(
  "/:fileId/share",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { fileId } = req.params;
    const { expiresInDays = 7 } = req.body;

    try {
      const file = await db
        .select()
        .from(files)
        .where(and(eq(files.threadId, fileId), eq(files.ownerId, req.user!.id)))
        .get();

      if (!file) {
        res.status(404).json({ error: "File not found or access denied" });
        return;
      }

      // Generate share token
      const shareToken = `share_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const expiresAt =
        Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60;

      // Update file with share token
      await db
        .update(files)
        .set({
          shareToken,
          shareExpiresAt: new Date(expiresAt * 1000), // Convert Unix timestamp to Date
          updatedAt: new Date(), // Use Date object
        })
        .where(eq(files.threadId, fileId));

      const shareUrl = `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/share/${shareToken}`;

      res.status(200).json({
        success: true,
        data: {
          shareUrl,
          shareToken,
          expiresAt,
        },
      });
    } catch (error) {
      console.error("Error generating share link:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
