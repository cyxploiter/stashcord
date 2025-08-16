import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { db } from "../db";
import { userSettings } from "../db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { stashFileFromUrl } from "../services/stash";

const stashRouter = Router();

const MAX_CHUNK_SIZE = 7 * 1024 * 1024; // 7MB

const StashFromUrlSchema = z.object({
    fileUrl: z.string().url(),
    fileName: z.string(),
    folderId: z.string(),
});

import { stashFileFromUrl } from "../services/stash";

stashRouter.post("/from-url", authenticateToken, async (req, res) => {
    const validation = StashFromUrlSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: "Invalid request body", details: validation.error.errors });
    }

    const { fileUrl, fileName, folderId } = validation.data;
    const userId = req.userId!;

    try {
        const newFile = await stashFileFromUrl(userId, fileUrl, fileName, folderId);
        res.status(201).json(newFile);
    } catch (error: any) {
        console.error("Error stashing file from URL:", error);
        // Check for specific errors to return better status codes
        if (error.message === "Duplicate file detected") {
            return res.status(409).json({ error: error.message });
        }
        if (error.message === "Folder not found or access denied") {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get/Set default stash folder
stashRouter.get("/settings/default-folder", authenticateToken, async (req, res) => {
    const settings = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, req.userId!),
        columns: {
            defaultStashFolderId: true
        }
    });

    res.json({ defaultStashFolderId: settings?.defaultStashFolderId || null });
});

const SetDefaultFolderSchema = z.object({
    folderId: z.string().nullable(),
});

stashRouter.post("/settings/default-folder", authenticateToken, async (req, res) => {
    const validation = SetDefaultFolderSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: "Invalid request body" });
    }

    const { folderId } = validation.data;

    await db.update(userSettings)
        .set({ defaultStashFolderId: folderId })
        .where(eq(userSettings.userId, req.userId!));

    res.status(200).json({ success: true });
});


export { stashRouter };
