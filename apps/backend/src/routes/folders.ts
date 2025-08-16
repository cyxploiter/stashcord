import { Router, Request, Response } from "express";
import { db } from "../db";
import { folders, users, files } from "../db/schema";
import { authenticateToken } from "../middleware/auth";
import { eq, and } from "drizzle-orm";
import { discordBot } from "../bot/client";

const router = Router();

// GET /api/folders - Get all folders for the authenticated user
router.get(
  "/",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      const userFolders = await db
        .select()
        .from(folders)
        .where(eq(folders.ownerId, userId));

      res.json(userFolders);
    } catch (error) {
      console.error("Error fetching folders:", error);
      res.status(500).json({ error: "Failed to fetch folders" });
    }
  }
);

// POST /api/folders - Create a new folder
router.post(
  "/",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { name } = req.body;

      if (!name || typeof name !== "string") {
        res.status(400).json({ error: "Folder name is required" });
        return;
      }

      // Get user's selected guild ID from database
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user || !user.stashcordGuildId) {
        res.status(400).json({
          error: "No Discord server configured. Please complete setup first.",
        });
        return;
      }

      const guildId = user.stashcordGuildId;

      // Create Discord forum channel
      const forumChannel = await discordBot.createForumChannel(guildId, name);
      if (!forumChannel) {
        res
          .status(500)
          .json({ error: "Failed to create Discord forum channel" });
        return;
      }

      // Create the folder in the database
      const [newFolder] = await db
        .insert(folders)
        .values({
          name,
          slug: name.toLowerCase().replace(/ /g, "-"),
          ownerId: userId,
          discordForumId: forumChannel,
        })
        .returning();

      res.status(201).json({
        success: true,
        data: newFolder,
      });
    } catch (error) {
      console.error("Error creating folder:", error);
      res.status(500).json({ error: "Failed to create folder" });
    }
  }
);

// DELETE /api/folders/:folderId - Delete a folder
router.delete(
  "/:folderId",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { folderId } = req.params;
      const userId = req.user!.id;

      if (!folderId || typeof folderId !== "string") {
        res
          .status(400)
          .json({ error: "folderId is required and must be a string" });
        return;
      }

      // Check if folder exists and user owns it
      const folder = await db
        .select()
        .from(folders)
        .where(
          and(eq(folders.discordForumId, folderId), eq(folders.ownerId, userId))
        )
        .get();

      if (!folder) {
        res.status(404).json({ error: "Folder not found or access denied" });
        return;
      }

      // Check if folder has files
      const folderFiles = await db
        .select()
        .from(files)
        .where(eq(files.folderId, folderId))
        .limit(1);

      if (folderFiles.length > 0) {
        res.status(400).json({
          error:
            "Cannot delete folder that contains files. Please delete all files first.",
        });
        return;
      }

      // Delete Discord forum channel
      try {
        await discordBot.deleteChannel(folderId);
      } catch (error) {
        console.error("Failed to delete Discord forum channel:", error);
        // Continue with database deletion even if Discord deletion fails
      }

      // Delete folder from database
      await db.delete(folders).where(eq(folders.discordForumId, folderId));

      res.status(200).json({
        success: true,
        message: "Folder deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting folder:", error);
      res.status(500).json({ error: "Failed to delete folder" });
    }
  }
);

// PUT /api/folders/:folderId - Update folder name
router.put(
  "/:folderId",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { folderId } = req.params;
      const { name } = req.body;
      const userId = req.user!.id;

      if (!folderId || typeof folderId !== "string") {
        res
          .status(400)
          .json({ error: "folderId is required and must be a string" });
        return;
      }

      if (!name || typeof name !== "string") {
        res
          .status(400)
          .json({ error: "name is required and must be a string" });
        return;
      }

      // Check if folder exists and user owns it
      const folder = await db
        .select()
        .from(folders)
        .where(
          and(eq(folders.discordForumId, folderId), eq(folders.ownerId, userId))
        )
        .get();

      if (!folder) {
        res.status(404).json({ error: "Folder not found or access denied" });
        return;
      }

      // Update Discord forum channel name
      try {
        await discordBot.updateChannelName(folderId, name);
      } catch (error) {
        console.error("Failed to update Discord forum channel name:", error);
        // Continue with database update even if Discord update fails
      }

      // Update folder in database
      const [updatedFolder] = await db
        .update(folders)
        .set({
          name,
          slug: name.toLowerCase().replace(/ /g, "-"),
          updatedAt: new Date(), // Use Date object
        })
        .where(eq(folders.discordForumId, folderId))
        .returning();

      res.status(200).json({
        success: true,
        data: updatedFolder,
      });
    } catch (error) {
      console.error("Error updating folder:", error);
      res.status(500).json({ error: "Failed to update folder" });
    }
  }
);

export default router;
