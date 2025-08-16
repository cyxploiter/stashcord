import { Router } from "express";
import type { Request, Response } from "express";
import { REST } from "discord.js";
import { URLSearchParams } from "url";
import { users } from "../db/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import {
  sessions,
  generateSessionId,
  generateState,
  states,
  Session,
} from "../utils/sessions";
import { discordBot } from "../bot/client";

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  global_name?: string;
  avatar: string | null;
}

const router = Router();
const rest = new REST({ version: "10" }).setToken(
  process.env.DISCORD_BOT_TOKEN as string
);

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

router.get("/discord", (req, res) => {
  // Generate state for CSRF protection
  const state = generateState();
  states.add(state);

  // Clean up old states after 10 minutes
  setTimeout(() => states.delete(state), 10 * 60 * 1000);

  const authorizeUrl = new URL(`${DISCORD_API_BASE_URL}/oauth2/authorize`);
  authorizeUrl.searchParams.append(
    "client_id",
    process.env.DISCORD_CLIENT_ID as string
  );
  authorizeUrl.searchParams.append("response_type", "code");
  authorizeUrl.searchParams.append(
    "redirect_uri",
    `${BACKEND_URL}/api/auth/discord/callback`
  );
  authorizeUrl.searchParams.append("scope", "identify guilds guilds.join");
  authorizeUrl.searchParams.append("state", state);

  res.redirect(authorizeUrl.toString());
});

router.get("/discord/callback", async (req: Request, res: Response) => {
  const { code, state } = req.query;

  console.log("=== Discord Callback Debug ===");
  console.log("Code received:", !!code);
  console.log("State received:", !!state);
  console.log("Full query params:", req.query);

  // Validate state parameter for CSRF protection
  if (!state || !states.has(state as string)) {
    console.log("ERROR: Invalid or missing state parameter");
    res.status(400).send("Invalid state parameter");
    return;
  }

  // Remove used state
  states.delete(state as string);

  if (!code) {
    console.log("ERROR: No code provided in callback");
    res.status(400).send("No code provided");
    return;
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch(`${DISCORD_API_BASE_URL}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID as string,
        client_secret: process.env.DISCORD_CLIENT_SECRET as string,
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: `${BACKEND_URL}/api/auth/discord/callback`,
        scope: "identify guilds guilds.join",
      }).toString(),
    });

    if (!tokenResponse.ok) {
      console.log("ERROR: Token exchange failed:", tokenResponse.status);
      res.status(500).send("Token exchange failed");
      return;
    }

    const tokenData = (await tokenResponse.json()) as DiscordTokenResponse;

    // Fetch user profile using access token
    const userResponse = await fetch(`${DISCORD_API_BASE_URL}/users/@me`, {
      headers: {
        Authorization: `${tokenData.token_type} ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      console.log("ERROR: Failed to fetch user data:", userResponse.status);
      res.status(500).send("Failed to fetch user data");
      return;
    }

    const discordUser = (await userResponse.json()) as DiscordUser;

    // Create or update user in database
    let user = await db
      .select()
      .from(users)
      .where(eq(users.id, discordUser.id))
      .get();

    const currentTime = new Date();

    if (user) {
      // Update existing user with complete info
      user = await db
        .update(users)
        .set({
          username: discordUser.username || user.username,
          globalName: discordUser.global_name || user.globalName,
          avatar: discordUser.avatar || user.avatar,
          discordAccessToken: tokenData.access_token,
          discordRefreshToken: tokenData.refresh_token,
          discordTokenExpiry: new Date(
            Date.now() + tokenData.expires_in * 1000
          ),
          lastLoginAt: currentTime,
          updatedAt: currentTime,
        })
        .where(eq(users.id, discordUser.id))
        .returning()
        .get();
    } else {
      // Create new user with complete info
      user = await db
        .insert(users)
        .values({
          id: discordUser.id,
          username: discordUser.username || `user_${discordUser.id}`,
          globalName: discordUser.global_name || null,
          avatar: discordUser.avatar || null,
          email: null, // Email not available from Discord identify scope
          verified: false,
          discordAccessToken: tokenData.access_token,
          discordRefreshToken: tokenData.refresh_token,
          discordTokenExpiry: new Date(
            Date.now() + tokenData.expires_in * 1000
          ),
          hasStashcordGuild: false,
          stashcordGuildId: null,
          lastGuildCheck: null,
          defaultViewMode: "explorer",
          storageQuotaUsed: 0,
          storageQuotaLimit: 16106127360, // 15GB default
          lastLoginAt: currentTime,
        })
        .returning()
        .get();
    }

    // Create session
    const sessionId = generateSessionId();
    const expiresAt = Date.now() + tokenData.expires_in * 1000;
    const sessionExpiresAt = new Date(expiresAt);

    // Store session in memory (for compatibility with existing code)
    sessions.set(sessionId, {
      userId: user.id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
    });

    // Store session in database for persistence
    await db
      .update(users)
      .set({
        currentSessionId: sessionId,
        sessionExpiresAt: sessionExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .run();

    console.log("Session created for user:", user.id);
    console.log("Session ID:", sessionId.substring(0, 8) + "...");

    // Set secure session cookie
    res.cookie("session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: tokenData.expires_in * 1000,
    });

    // Redirect to frontend
    const redirectUrl = `${FRONTEND_URL}/stash`;
    console.log("Redirecting to:", redirectUrl);

    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Discord OAuth2 Error:", error);
    res.status(500).send("Authentication failed");
  }
});

// GET /api/auth/verify - Verify if user is authenticated
router.get("/verify", async (req: Request, res: Response) => {
  try {
    // Get session ID from cookie
    const sessionId = req.cookies.session_id;

    console.log(
      "Session verification request - Session ID found:",
      !!sessionId
    );

    if (!sessionId) {
      res.status(401).json({
        success: false,
        error: "No session found",
      });
      return;
    }

    // Check if session exists and is valid - first check database, then memory
    let session = sessions.get(sessionId);
    let user = null;

    if (!session) {
      // Session not in memory, check database
      user = await db
        .select()
        .from(users)
        .where(eq(users.currentSessionId, sessionId))
        .get();

      if (!user || !user.sessionExpiresAt) {
        res.status(401).json({
          success: false,
          error: "Invalid session",
        });
        return;
      }

      // Check if database session is expired
      if (new Date() > user.sessionExpiresAt) {
        // Clear expired session from database
        await db
          .update(users)
          .set({
            currentSessionId: null,
            sessionExpiresAt: null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id))
          .run();

        res.clearCookie("session_id");
        res.status(401).json({
          success: false,
          error: "Session expired",
        });
        return;
      }

      // Restore session to memory for performance
      session = {
        userId: user.id,
        accessToken: user.discordAccessToken || "",
        refreshToken: user.discordRefreshToken || "",
        expiresAt: user.sessionExpiresAt.getTime(),
      };
      sessions.set(sessionId, session);
    } else {
      // Check if in-memory session is expired
      if (Date.now() > session.expiresAt) {
        sessions.delete(sessionId);

        // Also clear from database
        await db
          .update(users)
          .set({
            currentSessionId: null,
            sessionExpiresAt: null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, session.userId))
          .run();

        res.clearCookie("session_id");
        res.status(401).json({
          success: false,
          error: "Session expired",
        });
        return;
      }

      // Get user from database if not already loaded
      if (!user) {
        user = await db
          .select()
          .from(users)
          .where(eq(users.id, session.userId))
          .get();
      }
    }

    if (!user) {
      sessions.delete(sessionId);
      res.clearCookie("session_id");
      res.status(401).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    // Update last login time
    await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .run();

    console.log("User verified successfully:", user.id);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        globalName: user.globalName,
        avatar: user.avatar,
        email: user.email,
        verified: user.verified,
        hasStashcordGuild: user.hasStashcordGuild,
        stashcordGuildId: user.stashcordGuildId,
        defaultViewMode: user.defaultViewMode,
        storageQuotaUsed: user.storageQuotaUsed,
        storageQuotaLimit: user.storageQuotaLimit,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (error) {
    console.error("Session verification error:", error);
    res.status(401).json({
      success: false,
      error: "Session verification failed",
    });
  }
});

// POST /api/auth/logout - Logout user
router.post("/logout", async (req: Request, res: Response) => {
  const sessionId = req.cookies.session_id;

  if (sessionId) {
    // Remove from memory
    if (sessions.has(sessionId)) {
      const session = sessions.get(sessionId);
      sessions.delete(sessionId);

      // Remove from database
      if (session) {
        try {
          await db
            .update(users)
            .set({
              currentSessionId: null,
              sessionExpiresAt: null,
              updatedAt: new Date(),
            })
            .where(eq(users.id, session.userId))
            .run();
        } catch (error) {
          console.error("Error clearing database session:", error);
        }
      }
    } else {
      // Session not in memory, try to clear from database
      try {
        await db
          .update(users)
          .set({
            currentSessionId: null,
            sessionExpiresAt: null,
            updatedAt: new Date(),
          })
          .where(eq(users.currentSessionId, sessionId))
          .run();
      } catch (error) {
        console.error("Error clearing database session:", error);
      }
    }
  }

  res.clearCookie("session_id");
  res.json({ success: true, message: "Logged out successfully" });
});

// GET /api/auth/setup-status - Check if user has completed setup
router.get("/setup-status", async (req: Request, res: Response) => {
  try {
    const sessionId = req.cookies.session_id;

    if (!sessionId) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
      res.status(401).json({
        success: false,
        error: "Invalid session",
      });
      return;
    }

    // Get user setup status from database
    const user = await db
      .select({
        hasStashcordGuild: users.hasStashcordGuild,
        stashcordGuildId: users.stashcordGuildId,
        lastGuildCheck: users.lastGuildCheck,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .get();

    if (!user) {
      res.status(401).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    // Check if bot is actually in the server and has admin permissions
    let botInServer = false;
    let botHasAdminPerms = false;

    if (user.stashcordGuildId && user.hasStashcordGuild) {
      try {
        const botGuild = await discordBot.getGuildById(user.stashcordGuildId);
        if (botGuild) {
          botInServer = true;
          const botUserId = discordBot.getBotUserId();
          if (botUserId) {
            const botMember = await botGuild.members.fetch(botUserId);
            if (botMember) {
              botHasAdminPerms = botMember.permissions.has("Administrator");
              console.log(
                `Setup status check - Bot in server: ${botInServer}, Has admin: ${botHasAdminPerms}`
              );
            }
          }
        }
      } catch (error) {
        console.error("Error checking bot status during setup status:", error);
        // Keep the database values if we can't check Discord
        botInServer = user.hasStashcordGuild;
      }
    }

    res.json({
      success: true,
      serverCreated: !!user.stashcordGuildId,
      botInServer: botInServer,
      botHasAdminPerms: botHasAdminPerms,
      guildId: user.stashcordGuildId,
      lastChecked: user.lastGuildCheck,
      setupComplete: !!(
        user.stashcordGuildId &&
        botInServer &&
        botHasAdminPerms
      ),
    });
  } catch (error) {
    console.error("Setup status check error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check setup status",
    });
  }
});

// POST /api/auth/refresh-server-status - Force refresh server status by checking Discord API
router.post("/refresh-server-status", async (req: Request, res: Response) => {
  try {
    const sessionId = req.cookies.session_id;

    if (!sessionId) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
      res.status(401).json({
        success: false,
        error: "Invalid session",
      });
      return;
    }

    // Get user's current status
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .get();

    if (!user) {
      res.status(401).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    console.log("Refreshing server status for user:", user.id);

    // Fetch user's guilds from Discord API using the access token
    const guildsResponse = await fetch(
      `${DISCORD_API_BASE_URL}/users/@me/guilds`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    let updatedGuildId = user.stashcordGuildId;
    let hasStashcordGuild = false;
    let guildInfo = null;

    if (guildsResponse.ok) {
      const guilds = (await guildsResponse.json()) as Array<{
        id: string;
        name: string;
        owner: boolean;
        permissions: string;
        icon?: string;
      }>;

      console.log(`User is in ${guilds.length} guilds`);

      // If user has no designated guild ID, find potential guilds they own or have admin in
      if (!user.stashcordGuildId) {
        const potentialGuilds = guilds.filter(
          (guild) => guild.owner || (parseInt(guild.permissions) & 0x8) === 0x8 // Administrator permission
        );

        console.log(
          `Found ${potentialGuilds.length} guilds where user has admin permissions`
        );

        if (potentialGuilds.length > 0) {
          // For now, use the first guild they own, or the first admin guild
          const ownedGuild = potentialGuilds.find((g) => g.owner);
          updatedGuildId = ownedGuild ? ownedGuild.id : potentialGuilds[0].id;
          console.log(`Auto-selected guild: ${updatedGuildId}`);
        }
      }

      // Check if our bot is in the user's specified/selected server and verify it's named "Stashcord"
      if (updatedGuildId) {
        try {
          // Check if bot is in the guild
          const botGuild = await discordBot.getGuildById(updatedGuildId);

          // Check if bot is in the guild (any guild name is acceptable)
          if (botGuild) {
            hasStashcordGuild = true;
            guildInfo = {
              id: botGuild.id,
              name: botGuild.name,
              icon: botGuild.iconURL(),
              memberCount: botGuild.memberCount,
            };
            console.log(`Bot is in guild: ${botGuild.name} (${botGuild.id})`);
          } else {
            console.log(`Bot is NOT in guild: ${updatedGuildId}`);
            hasStashcordGuild = false;
            // Reset the guild ID since bot is not in the server
            updatedGuildId = null;
          }
        } catch (error) {
          console.log("Failed to check bot guild status:", error);
          hasStashcordGuild = false;
          // Reset the guild ID on error
          updatedGuildId = null;
        }
      }

      // If we cleared the guild ID, try to find a valid "Stashcord" guild
      if (!updatedGuildId) {
        const stashcordGuilds = guilds.filter(
          (guild) =>
            guild.name === "Stashcord" &&
            (guild.owner || (parseInt(guild.permissions) & 0x8) === 0x8)
        );

        if (stashcordGuilds.length > 0) {
          // Verify the bot is actually in this guild
          for (const guild of stashcordGuilds) {
            try {
              const botGuild = await discordBot.getGuildById(guild.id);
              if (botGuild && botGuild.name === "Stashcord") {
                updatedGuildId = guild.id;
                hasStashcordGuild = true;
                guildInfo = {
                  id: botGuild.id,
                  name: botGuild.name,
                  icon: botGuild.iconURL(),
                  memberCount: botGuild.memberCount,
                };
                console.log(
                  `Found valid Stashcord guild: ${botGuild.name} (${botGuild.id})`
                );
                break;
              }
            } catch (error) {
              console.log(`Failed to verify guild ${guild.id}:`, error);
            }
          }
        }
      }
    } else {
      console.log("Failed to fetch user guilds:", guildsResponse.status);
    }

    // Update user's guild information
    await db
      .update(users)
      .set({
        stashcordGuildId: updatedGuildId,
        hasStashcordGuild,
        lastGuildCheck: new Date(),
      })
      .where(eq(users.id, session.userId))
      .run();

    console.log(
      `Updated user guild info - Guild ID: ${updatedGuildId}, Bot in server: ${hasStashcordGuild}`
    );

    res.json({
      success: true,
      serverCreated: !!updatedGuildId,
      botInServer: hasStashcordGuild,
      guildId: updatedGuildId,
      guildInfo,
      lastChecked: new Date(),
      setupComplete: !!(updatedGuildId && hasStashcordGuild),
    });
  } catch (error) {
    console.error("Refresh server status error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to refresh server status",
    });
  }
});

// POST /api/auth/refresh-bot-status - Check if bot is in user's Stashcord guild with admin permissions
router.post("/refresh-bot-status", async (req: Request, res: Response) => {
  try {
    const sessionId = req.cookies.session_id;

    if (!sessionId) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
      res.status(401).json({
        success: false,
        error: "Invalid session",
      });
      return;
    }

    // Get user's current status
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .get();

    if (!user) {
      res.status(401).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    console.log("Checking bot status for user:", user.id);

    let botInGuild = false;
    let botHasAdminPerms = false;
    let guildInfo = null;
    let errorMessage = null;

    // Check if user has a designated guild
    if (!user.stashcordGuildId) {
      errorMessage = "No guild found for user. Please complete setup first.";
      console.log(errorMessage);
    } else {
      try {
        // Check if bot is in the user's selected guild
        const botGuild = await discordBot.getGuildById(user.stashcordGuildId);

        if (botGuild) {
          // Bot is in the guild, proceed with permission check
          botInGuild = true;

          // Check if bot has administrator permissions
          const botUserId = discordBot.getBotUserId();
          if (!botUserId) {
            errorMessage = "Bot user ID not available";
            console.log(errorMessage);
          } else {
            const botMember = await botGuild.members.fetch(botUserId);
            if (botMember) {
              botHasAdminPerms = botMember.permissions.has("Administrator");

              guildInfo = {
                id: botGuild.id,
                name: botGuild.name,
                icon: botGuild.iconURL(),
                memberCount: botGuild.memberCount,
                botRoles: botMember.roles.cache.map((role) => ({
                  id: role.id,
                  name: role.name,
                  permissions: role.permissions.toArray(),
                })),
              };

              console.log(
                `Bot status in guild ${botGuild.name} (${botGuild.id}): Present=${botInGuild}, Admin=${botHasAdminPerms}`
              );
            } else {
              errorMessage = "Bot member not found in guild";
              console.log(errorMessage);
            }
          }
        } else {
          errorMessage = "Bot is not in the specified guild";
          console.log(`Bot is NOT in guild: ${user.stashcordGuildId}`);
        }
      } catch (error) {
        errorMessage = "Failed to check bot status in guild";
        console.log("Failed to check bot guild status:", error);
      }
    }

    // Update user's bot status in database
    await db
      .update(users)
      .set({
        hasStashcordGuild: botInGuild && botHasAdminPerms,
        lastGuildCheck: new Date(),
      })
      .where(eq(users.id, session.userId))
      .run();

    console.log(
      `Updated bot status - In guild: ${botInGuild}, Has admin: ${botHasAdminPerms}`
    );

    res.json({
      success: true,
      botInGuild,
      botHasAdminPerms,
      guildId: user.stashcordGuildId,
      guildInfo,
      errorMessage,
      lastChecked: new Date(),
      botReady: botInGuild && botHasAdminPerms,
    });
  } catch (error) {
    console.error("Refresh bot status error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to refresh bot status",
    });
  }
});

export default router;
