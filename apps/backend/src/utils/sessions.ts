import crypto from "crypto";

// Session interface
export interface Session {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Simple in-memory session store (use Redis or database in production)
export const sessions = new Map<string, Session>();

// Generate secure random session ID
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Generate random state for CSRF protection
export function generateState(): string {
  return crypto.randomBytes(16).toString("base64url");
}

// Simple state store for OAuth CSRF protection (use Redis or database in production)
export const states = new Set<string>();

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes
