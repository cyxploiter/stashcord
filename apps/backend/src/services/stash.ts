import { db } from "../db";
import {
  files,
  folders,
  fileChunks as chunks,
  userSettings,
} from "../db/schema";
import { eq, and } from "drizzle-orm";
import { discordBot } from "../bot/client";
import { settingsService } from "./settings";

const MAX_CHUNK_SIZE = 7 * 1024 * 1024; // 7MB

export async function stashFileFromUrl(
  userId: string,
  fileUrl: string,
  fileName: string,
  folderId: string
) {
  // 1. Fetch the file from the URL
  const { default: fetch } = await import("node-fetch");
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  const fileBuffer = Buffer.from(await response.arrayBuffer());
  const fileSize = fileBuffer.length;
  const mimeType =
    response.headers.get("content-type") || "application/octet-stream";

  // 2. Check folder permissions
  const folder = await db.query.folders.findFirst({
    where: and(
      eq(folders.discordForumId, folderId),
      eq(folders.ownerId, userId)
    ),
  });

  if (!folder) {
    throw new Error("Folder not found or access denied");
  }

  // 3. Check for duplicates (if enabled)
  const shouldDetectDuplicates = await settingsService.shouldDetectDuplicates(
    userId
  );
  if (shouldDetectDuplicates) {
    const existingFile = await db.query.files.findFirst({
      where: and(
        eq(files.name, fileName),
        eq(files.size, fileSize),
        eq(files.folderId, folderId),
        eq(files.ownerId, userId)
      ),
    });
    if (existingFile) {
      throw new Error("Duplicate file detected");
    }
  }

  // 4. Create Discord thread
  const thread = await discordBot.createForumPost(
    folder.discordForumId,
    fileName,
    `Stashed from: ${fileUrl}`
  );
  if (!thread) {
    throw new Error("Failed to create Discord thread");
  }

  // 5. Insert file record into DB
  const [newFile] = await db
    .insert(files)
    .values({
      name: fileName,
      originalName: fileName,
      slug: fileName.toLowerCase().replace(/ /g, "-"),
      folderId: folder.discordForumId,
      threadId: thread.postId,
      ownerId: userId,
      size: fileSize,
      mimeType: mimeType,
    })
    .returning();

  // 6. Chunk and upload the file
  const chunkSizeBytes = await settingsService.getChunkSizeBytes(userId);
  const effectiveChunkSize = Math.min(chunkSizeBytes, MAX_CHUNK_SIZE);
  const numChunks = Math.ceil(fileBuffer.length / effectiveChunkSize);

  for (let i = 0; i < numChunks; i++) {
    const start = i * effectiveChunkSize;
    const end = Math.min(start + effectiveChunkSize, fileBuffer.length);
    const chunk = fileBuffer.slice(start, end);

    const message = await discordBot.uploadFileChunk(
      thread.postId,
      chunk,
      i,
      fileName,
      numChunks
    );
    if (message) {
      await db.insert(chunks).values({
        fileThreadId: newFile.threadId,
        chunkIndex: i,
        discordMessageId: message.messageId,
        discordAttachmentId: message.attachmentId,
        cdnUrl: message.cdnUrl,
        size: chunk.length,
      });
    } else {
      // If a chunk fails, we should probably clean up. For now, just error out.
      // A more robust solution would delete the created thread and file record.
      throw new Error(`Failed to upload chunk ${i + 1}`);
    }
  }

  return newFile;
}
