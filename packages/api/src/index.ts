import axios from "axios";
import { z } from "zod";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";

// Schemas
export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string().nullable(),
});

export const folderSchema = z.object({
  id: z.number(),
  name: z.string(),
  discordChannelId: z.string(),
  userId: z.string(),
  createdAt: z.string(),
});

export const fileSchema = z.object({
  id: z.number(),
  name: z.string(),
  folderId: z.number(),
  discordThreadId: z.string(),
  userId: z.string(),
  size: z.number(),
  createdAt: z.string(),
});

export const chunkSchema = z.object({
  id: z.number(),
  fileId: z.number(),
  chunkIndex: z.number(),
  discordMessageId: z.string(),
  cdnUrl: z.string(),
});

export const guildSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  owner: z.boolean(),
  permissions: z.string(),
});

export const setupStatusSchema = z.object({
  serverCreated: z.boolean(),
  botInServer: z.boolean(),
  botHasAdminPerms: z.boolean().optional(),
  guildId: z.string().nullable(),
  setupComplete: z.boolean(),
  lastChecked: z.string().nullable(),
  errorMessage: z.string().nullable().optional(),
});

// Types
export type User = z.infer<typeof userSchema>;
export type Folder = z.infer<typeof folderSchema>;
export type File = z.infer<typeof fileSchema>;
export type Chunk = z.infer<typeof chunkSchema>;
export type Guild = z.infer<typeof guildSchema>;
export type SetupStatus = z.infer<typeof setupStatusSchema>;

// API Client
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send cookies with requests
});

export const authApi = {
  discordLogin: () => {
    window.location.href = `${API_BASE_URL}/auth/discord`;
  },
  discordCallback: async (code: string) => {
    const res = await api.get(`/auth/discord/callback?code=${code}`);
    return res.data;
  },
};

export const setupApi = {
  getGuilds: async () => {
    const res = await api.get<{ guilds: Guild[] }>("/setup/guilds");
    return z.array(guildSchema).parse(res.data.guilds);
  },
  completeSetup: async (guildId: string) => {
    const res = await api.post("/setup/complete", { guildId });
    return res.data;
  },
  getStatus: async () => {
    const res = await api.get("/auth/setup-status");
    return setupStatusSchema.parse(res.data);
  },
  refreshStatus: async () => {
    const res = await api.post("/auth/refresh-server-status");
    return setupStatusSchema.parse(res.data);
  },
  checkBotAdminStatus: async () => {
    const res = await api.post("/auth/refresh-bot-status");
    return setupStatusSchema.parse(res.data);
  },
};

export const folderApi = {
  getFolders: async () => {
    const res = await api.get<Folder[]>("/folders");
    return z.array(folderSchema).parse(res.data);
  },
  createFolder: async (name: string) => {
    const res = await api.post<Folder>("/folders", { name });
    return folderSchema.parse(res.data);
  },
};

export const fileApi = {
  getFiles: async (folderId: number) => {
    const res = await api.get<File[]>(`/files?folderId=${folderId}`);
    return z.array(fileSchema).parse(res.data);
  },
  uploadFile: async (
    file: Blob, // Accepts File or Blob from input
    folderId: number,
    onUploadProgress?: (progressEvent: any) => void
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folderId", folderId.toString());

    const res = await api.post<File>("/files/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress,
    });
    return fileSchema.parse(res.data);
  },
  downloadFile: (fileId: number) => {
    window.open(`${API_BASE_URL}/files/download/${fileId}`, "_blank");
  },
  deleteFile: async (fileId: number) => {
    await api.delete(`/files/file/${fileId}`);
  },
};
