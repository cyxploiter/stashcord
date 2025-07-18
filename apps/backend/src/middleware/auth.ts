import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { sessions } from "../utils/sessions";

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const sessionId = req.cookies.session_id;

  if (!sessionId) {
    res.status(401).json({
      success: false,
      error: "Authentication required",
    });
    return;
  }

  try {
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

    // Attach user to request object
    req.user = {
      id: user.id,
      username: user.username,
      avatar: user.avatar || undefined,
    };
    req.userId = user.id; // Keep backward compatibility

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(403).json({
      success: false,
      error: "Authentication failed",
    });
  }
};
