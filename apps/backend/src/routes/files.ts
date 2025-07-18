import { Router, Request, Response } from "express";
import { db } from "../db";
import { files, folders, chunks } from "../db/schema";
import { authenticateToken } from "../middleware/auth";
import { eq, and, desc } from "drizzle-orm";
import multer from "multer";
import { discordBot } from "../bot/client";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const MAX_CHUNK_SIZE = 24 * 1024 * 1024; // 24MB

// GET /api/files?folderId=:folderId
router.get(
  "/",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { folderId } = req.query;

    if (!folderId) {
      res.status(400).json({ error: "folderId is required" });
      return;
    }

    try {
      const folder = await db
        .select()
        .from(folders)
        .where(
          and(
            eq(folders.id, Number(folderId)),
            eq(folders.userId, req.user!.id)
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
            eq(files.folderId, Number(folderId)),
            eq(files.userId, req.user!.id)
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

    if (!folderId || !file) {
      res.status(400).json({ error: "folderId and file are required" });
      return;
    }

    try {
      const folder = await db
        .select()
        .from(folders)
        .where(
          and(
            eq(folders.id, Number(folderId)),
            eq(folders.userId, req.user!.id)
          )
        )
        .get();

      if (!folder) {
        res.status(404).json({ error: "Folder not found or access denied" });
        return;
      }

      // Create a new thread in the folder's channel
      const thread = await discordBot.createForumPost(
        folder.discordChannelId,
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
          folderId: folder.id,
          discordThreadId: thread.postId,
          userId: req.user!.id,
          size: file.size,
        })
        .returning();

      // Split the file into chunks and upload them
      const fileBuffer = file.buffer;
      const numChunks = Math.ceil(fileBuffer.length / MAX_CHUNK_SIZE);

      for (let i = 0; i < numChunks; i++) {
        const start = i * MAX_CHUNK_SIZE;
        const end = Math.min(start + MAX_CHUNK_SIZE, fileBuffer.length);
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
            fileId: newFile.id,
            chunkIndex: i,
            discordMessageId: message.messageId,
            cdnUrl: message.cdnUrl,
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
        .where(
          and(eq(files.id, Number(fileId)), eq(files.userId, req.user!.id))
        )
        .get();

      if (!file) {
        res.status(404).json({ error: "File not found or access denied" });
        return;
      }

      const fileChunks = await db
        .select()
        .from(chunks)
        .where(eq(chunks.fileId, file.id))
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
        .where(
          and(eq(files.id, Number(fileId)), eq(files.userId, req.user!.id))
        )
        .get();

      if (!file) {
        res.status(404).json({ error: "File not found or access denied" });
        return;
      }

      await discordBot.deleteThread(file.discordThreadId);
      await db.delete(files).where(eq(files.id, Number(fileId)));

      res.status(200).json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
