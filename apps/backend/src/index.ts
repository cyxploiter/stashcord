import express, { Request } from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createServer } from "http";
import authRouter from "./routes/auth";
import folderRouter from "./routes/folders";
import fileRouter from "./routes/files";
import settingsRouter from "./routes/settings";
import { stashRouter } from "./routes/stash";
import setupRouter from "./routes/setup";
import { initializeDatabase } from "./init-db";
import { discordBot } from "./bot/client";
import { webSocketService } from "./services/websocket";

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

app.use(express.json());
app.use(cookieParser());

// Configure CORS to allow frontend
app.use(
  cors({
    origin: process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000", // Frontend URL
    credentials: true, // Allow cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/api/auth", authRouter);
app.use("/api/folders", folderRouter);
app.use("/api/files", fileRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/stash", stashRouter);
app.use("/api/setup", setupRouter);

app.get("/", (req, res) => {
  res.send("Stashcord Backend is running!");
});

server.listen(Number(PORT), "0.0.0.0", async () => {
  console.log(`Server is running on port ${PORT}`);

  // Initialize WebSocket service
  webSocketService.initialize(server);
  console.log("WebSocket service initialized");

  // Initialize database
  try {
    // Never force reset in normal server startup
    await initializeDatabase();
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  }

  // Initialize Discord bot
  try {
    await discordBot.start();
    console.log("Discord bot initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Discord bot:", error);
    console.log(
      "The app will continue running, but bot features will be unavailable"
    );
  }
});
