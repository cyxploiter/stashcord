import { db } from "../db";
import { fileTypes, permissions } from "./schema";

export async function seedDatabase() {
  console.log("Seeding database...");

  // Seed file types
  const fileTypesData = [
    {
      name: "document",
      displayName: "Document",
      mimeTypes: JSON.stringify([
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "text/markdown",
        "application/rtf",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ]),
      maxSize: 104857600, // 100MB
      iconName: "FileText",
      color: "text-blue-600",
    },
    {
      name: "image",
      displayName: "Image",
      mimeTypes: JSON.stringify([
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
        "image/bmp",
        "image/tiff",
      ]),
      maxSize: 52428800, // 50MB
      iconName: "Image",
      color: "text-green-600",
    },
    {
      name: "video",
      displayName: "Video",
      mimeTypes: JSON.stringify([
        "video/mp4",
        "video/webm",
        "video/ogg",
        "video/avi",
        "video/mov",
        "video/quicktime",
        "video/x-msvideo",
      ]),
      maxSize: 1073741824, // 1GB
      iconName: "Video",
      color: "text-red-600",
    },
    {
      name: "audio",
      displayName: "Audio",
      mimeTypes: JSON.stringify([
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/ogg",
        "audio/webm",
        "audio/aac",
        "audio/flac",
      ]),
      maxSize: 209715200, // 200MB
      iconName: "Music",
      color: "text-purple-600",
    },
    {
      name: "archive",
      displayName: "Archive",
      mimeTypes: JSON.stringify([
        "application/zip",
        "application/x-rar-compressed",
        "application/x-tar",
        "application/gzip",
        "application/x-7z-compressed",
        "application/x-bzip2",
      ]),
      maxSize: 2147483648, // 2GB
      iconName: "Archive",
      color: "text-orange-600",
    },
    {
      name: "code",
      displayName: "Code",
      mimeTypes: JSON.stringify([
        "text/javascript",
        "application/javascript",
        "text/typescript",
        "text/html",
        "text/css",
        "application/json",
        "text/xml",
        "application/xml",
        "text/x-python",
        "text/x-java-source",
        "text/x-c",
        "text/x-c++",
        "text/x-csharp",
        "text/x-php",
        "text/x-ruby",
        "text/x-go",
        "text/x-rust",
      ]),
      maxSize: 52428800, // 50MB
      iconName: "Code",
      color: "text-indigo-600",
    },
    {
      name: "other",
      displayName: "Other",
      mimeTypes: JSON.stringify(["*/*"]), // Catch-all
      maxSize: 104857600, // 100MB
      iconName: "File",
      color: "text-gray-600",
    },
  ];

  try {
    for (const fileType of fileTypesData) {
      await db.insert(fileTypes).values(fileType).onConflictDoNothing();
    }
    console.log("✓ File types seeded");
  } catch (error) {
    console.error("Error seeding file types:", error);
  }

  // Seed permissions
  const permissionsData = [
    {
      name: "read",
      displayName: "Read",
      description: "Can view and download files",
    },
    {
      name: "write",
      displayName: "Write",
      description: "Can upload and modify files",
    },
    {
      name: "delete",
      displayName: "Delete",
      description: "Can delete files and folders",
    },
    {
      name: "share",
      displayName: "Share",
      description: "Can create share links",
    },
    {
      name: "admin",
      displayName: "Admin",
      description: "Full access to category/folder management",
    },
  ];

  try {
    for (const permission of permissionsData) {
      await db.insert(permissions).values(permission).onConflictDoNothing();
    }
    console.log("✓ Permissions seeded");
  } catch (error) {
    console.error("Error seeding permissions:", error);
  }

  console.log("Database seeding completed!");
}

// Helper function to get file type by MIME type
export async function getFileTypeByMimeType(mimeType: string) {
  const allFileTypes = await db.select().from(fileTypes);

  for (const fileType of allFileTypes) {
    const supportedMimes = JSON.parse(fileType.mimeTypes);
    if (supportedMimes.includes(mimeType) || supportedMimes.includes("*/*")) {
      return fileType;
    }
  }

  // Fallback to "other" type
  return allFileTypes.find((ft) => ft.name === "other") || allFileTypes[0];
}

// Helper function to validate file size
export async function validateFileSize(
  mimeType: string,
  size: number
): Promise<{ valid: boolean; maxSize?: number; error?: string }> {
  const fileType = await getFileTypeByMimeType(mimeType);

  if (!fileType) {
    return { valid: false, error: "Unsupported file type" };
  }

  if (fileType.maxSize && size > fileType.maxSize) {
    return {
      valid: false,
      maxSize: fileType.maxSize,
      error: `File size exceeds maximum allowed size for ${fileType.displayName.toLowerCase()} files (${Math.round(
        fileType.maxSize / 1024 / 1024
      )}MB)`,
    };
  }

  return { valid: true };
}
