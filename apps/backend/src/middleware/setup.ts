import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { sessions } from "../utils/sessions";

export const requireSetupComplete = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const sessionId = req.cookies.session_id;

  if (!sessionId) {
    res.status(401).json({
      success: false,
      error: "Authentication required",
      redirectTo: "/login",
    });
    return;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    res.status(401).json({
      success: false,
      error: "Invalid session",
      redirectTo: "/login",
    });
    return;
  }

  // Check if user has completed setup
  db.select({
    hasStashcordGuild: users.hasStashcordGuild,
    stashcordGuildId: users.stashcordGuildId,
  })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1)
    .then((user) => {
      if (!user.length) {
        res.status(401).json({
          success: false,
          error: "User not found",
          redirectTo: "/login",
        });
        return;
      }

      const setupComplete = !!(
        user[0].stashcordGuildId && user[0].hasStashcordGuild
      );

      if (!setupComplete) {
        res.status(403).json({
          success: false,
          error: "Setup required",
          redirectTo: "/setup",
          setupStatus: {
            serverCreated: !!user[0].stashcordGuildId,
            botInServer: user[0].hasStashcordGuild || false,
          },
        });
        return;
      }

      next();
    })
    .catch((error) => {
      console.error("Setup check error:", error);
      res.status(500).json({
        success: false,
        error: "Setup check failed",
      });
    });
};
