import { Router } from "express";
import type { Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import { sessions } from "../utils/sessions";
import { db } from "../db";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

// GET /api/setup/guilds - Fetches guilds the user owns
router.get(
  "/guilds",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.cookies.session_id;
    const session = sessions.get(sessionId);

    if (!session || !session.accessToken) {
      res
        .status(401)
        .json({ success: false, error: "Invalid session or access token" });
      return;
    }

    try {
      const guildsResponse = await fetch(
        `${DISCORD_API_BASE_URL}/users/@me/guilds`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      );
      if (!guildsResponse.ok) {
        res.status(500).json({
          success: false,
          error: "Failed to fetch guilds from Discord",
        });
        return;
      }

      const guilds = (await guildsResponse.json()) as DiscordGuild[];

      // Filter for guilds where the user is the owner
      const ownedGuilds = guilds.filter((guild) => guild.owner);

      res.json({ success: true, guilds: ownedGuilds });
    } catch (error) {
      console.error("Error fetching guilds:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

// POST /api/setup/complete - Saves the selected guild ID and marks setup as complete
router.post(
  "/complete",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { guildId } = req.body;
    const userId = (req as any).userId;

    if (!guildId) {
      res.status(400).json({ success: false, error: "Guild ID is required" });
      return;
    }

    if (!userId) {
      res.status(401).json({ success: false, error: "User not authenticated" });
      return;
    }

    try {
      // Save the selected guild ID to the app_settings table
      await db
        .insert(schema.appSettings)
        .values({ key: "DISCORD_GUILD_ID", value: guildId })
        .onConflictDoUpdate({
          target: schema.appSettings.key,
          set: { value: guildId },
        })
        .run();

      // Update the user's record to reflect that setup is complete
      await db
        .update(schema.users)
        .set({
          stashcordGuildId: guildId,
          hasStashcordGuild: true,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId))
        .run();

      res.json({ success: true, message: "Setup completed successfully" });
    } catch (error) {
      console.error("Error completing setup:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

export default router;
