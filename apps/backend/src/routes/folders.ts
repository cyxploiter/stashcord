import { Router, Request, Response } from "express";
import { db } from "../db";
import { folders, users } from "../db/schema";
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
        .where(eq(folders.userId, userId));

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

      // Get user's guild ID from the .env file
      const guildId = process.env.DISCORD_GUILD_ID;
      if (!guildId) {
        res.status(500).json({ error: "Discord Guild ID not configured" });
        return;
      }

      // Create Discord text channel
      const channel = await discordBot.createChannel(guildId, name);
      if (!channel) {
        res.status(500).json({ error: "Failed to create Discord channel" });
        return;
      }

      // Create the folder in the database
      const [newFolder] = await db
        .insert(folders)
        .values({
          name,
          userId,
          discordChannelId: channel,
        })
        .returning();

      res.status(201).json(newFolder);
    } catch (error) {
      console.error("Error creating folder:", error);
      res.status(500).json({ error: "Failed to create folder" });
    }
  }
);

export default router;
