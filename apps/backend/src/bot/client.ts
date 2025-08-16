import {
  Client,
  GatewayIntentBits,
  Guild,
  User,
  OAuth2Guild,
  Interaction,
  ApplicationCommandType,
  MessageContextMenuCommandInteraction,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  StringSelectMenuInteraction,
  Attachment,
} from "discord.js";
import { db } from "../db";
import { users, userSettings, folders } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { stashFileFromUrl } from "../services/stash";

interface DiscordUserGuilds {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

class StashcordBot {
  private client: Client;
  private isReady = false;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.once("ready", async () => {
      console.log(`Discord bot logged in as ${this.client.user?.tag}!`);
      this.isReady = true;

      // Log the invite link for easy access
      try {
        const inviteLink = await this.createInviteLink();
        console.log("🔗 Bot Invite Link:", inviteLink);
      } catch (error) {
        console.error("Failed to generate invite link:", error);
      }
    });

    this.client.on("error", (error) => {
      console.error("Discord bot error:", error);
    });

    this.client.on('interactionCreate', (interaction) => this.handleInteraction(interaction));
  }

  private async handleInteraction(interaction: Interaction) {
    if (interaction.isMessageContextMenuCommand() && interaction.commandName === 'Stash It') {
        await this.handleStashItCommand(interaction);
    } else if (interaction.isStringSelectMenu()) {
        await this.handleFolderSelection(interaction);
    }
  }

  private async handleStashItCommand(interaction: MessageContextMenuCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const targetMessage = interaction.targetMessage;
    const attachment = targetMessage.attachments.first();

    if (!attachment) {
        await interaction.editReply({ content: 'I couldn\'t find a file attached to that message.' });
        return;
    }

    const userId = interaction.user.id;
    const settings = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, userId),
        columns: { defaultStashFolderId: true },
    });

    if (settings?.defaultStashFolderId) {
        try {
            await stashFileFromUrl(userId, attachment.url, attachment.name, settings.defaultStashFolderId);
            await interaction.editReply({ content: `File stashed successfully to your default folder!` });
        } catch (error: any) {
            await interaction.editReply({ content: `Failed to stash file: ${error.message}` });
        }
    } else {
        const userFolders = await db.query.folders.findMany({
            where: eq(folders.ownerId, userId),
        });

        if (userFolders.length === 0) {
            await interaction.editReply({ content: 'You don\'t have any folders yet. Please create one in the web UI first.' });
            return;
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`stash-folder-select_${attachment.url}_${attachment.name}`)
            .setPlaceholder('Choose a folder to stash the file in')
            .addOptions(userFolders.map(folder => ({
                label: folder.name,
                value: folder.discordForumId,
            })));

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

        await interaction.editReply({
            content: 'You don\'t have a default folder set. Please choose a destination:',
            components: [row],
        });
    }
  }

  private async handleFolderSelection(interaction: StringSelectMenuInteraction) {
    await interaction.deferUpdate();
    const [customId, fileUrl, fileName] = interaction.customId.split('_');

    if (customId !== 'stash-folder-select') return;

    const folderId = interaction.values[0];
    const userId = interaction.user.id;

    try {
        await stashFileFromUrl(userId, fileUrl, fileName, folderId);
        await interaction.editReply({ content: 'File stashed successfully!', components: [] });
    } catch (error: any) {
        await interaction.editReply({ content: `Failed to stash file: ${error.message}`, components: [] });
    }
  }

  async start() {
    if (!process.env.DISCORD_BOT_TOKEN) {
      throw new Error("DISCORD_BOT_TOKEN environment variable is required");
    }

    try {
      await this.client.login(process.env.DISCORD_BOT_TOKEN);
      console.log("Discord bot started successfully");
    } catch (error) {
      console.error("Failed to start Discord bot:", error);
      throw error;
    }
  }

  async stop() {
    if (this.client) {
      await this.client.destroy();
      this.isReady = false;
      console.log("Discord bot stopped");
    }
  }

  // User Authentication Methods using Discord.js Client
  async fetchUser(userId: string): Promise<User | null> {
    if (!this.isReady) {
      console.log("Bot is not ready yet");
      return null;
    }

    try {
      return await this.client.users.fetch(userId);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      return null;
    }
  }

  getBotUserId(): string | null {
    if (!this.isReady || !this.client.user) {
      return null;
    }
    return this.client.user.id;
  }

  async getUserGuilds(accessToken: string): Promise<DiscordUserGuilds[]> {
    if (!this.isReady) {
      console.log("Bot is not ready yet");
      return [];
    }

    try {
      // Use Discord.js REST client for OAuth2 operations
      const response = await fetch(
        "https://discord.com/api/v10/users/@me/guilds",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to fetch user guilds:", response.status);
        return [];
      }

      const guilds = (await response.json()) as DiscordUserGuilds[];
      return guilds;
    } catch (error) {
      console.error("Error fetching user guilds:", error);
      return [];
    }
  }

  async checkUserInStashcordGuild(
    accessToken: string
  ): Promise<{ hasStashcordGuild: boolean; guildId: string | null }> {
    const userGuilds = await this.getUserGuilds(accessToken);
    const stashcordGuild = userGuilds.find(
      (guild) => guild.name === "Stashcord"
    );

    console.log(
      "User guilds:",
      userGuilds.map((g) => g.name)
    );
    console.log("Has Stashcord guild:", !!stashcordGuild);
    console.log("Stashcord guild ID:", stashcordGuild?.id || null);

    return {
      hasStashcordGuild: !!stashcordGuild,
      guildId: stashcordGuild?.id || null,
    };
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string
  ): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
  } | null> {
    try {
      const response = await fetch("https://discord.com/api/v10/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID as string,
          client_secret: process.env.DISCORD_CLIENT_SECRET as string,
          grant_type: "authorization_code",
          code: code,
          redirect_uri: redirectUri,
          scope: "identify guilds",
        }).toString(),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Token exchange failed:", response.status, errorData);
        return null;
      }

      return (await response.json()) as {
        access_token: string;
        token_type: string;
        expires_in: number;
        refresh_token: string;
        scope: string;
      };
    } catch (error) {
      console.error("Token exchange error:", error);
      return null;
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
  } | null> {
    try {
      const response = await fetch("https://discord.com/api/v10/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID as string,
          client_secret: process.env.DISCORD_CLIENT_SECRET as string,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }).toString(),
      });

      if (!response.ok) {
        console.error(
          "Token refresh failed:",
          response.status,
          await response.text()
        );
        return null;
      }

      return (await response.json()) as {
        access_token: string;
        token_type: string;
        expires_in: number;
        refresh_token: string;
        scope: string;
      };
    } catch (error) {
      console.error("Token refresh error:", error);
      return null;
    }
  }

  async fetchUserFromToken(accessToken: string): Promise<{
    id: string;
    username: string;
    avatar: string | null;
  } | null> {
    try {
      const response = await fetch("https://discord.com/api/v10/users/@me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        console.error("Failed to fetch user data:", response.status);
        return null;
      }

      return (await response.json()) as {
        id: string;
        username: string;
        avatar: string | null;
      };
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  }

  // Guild Management Methods
  async joinGuild(guildId: string): Promise<boolean> {
    if (!this.isReady) {
      console.log("Bot is not ready yet");
      return false;
    }

    try {
      const guild = await this.client.guilds.fetch(guildId);
      if (guild) {
        console.log(`Bot is already in guild: ${guild.name}`);
        return true;
      }
    } catch (error) {
      console.log("Bot is not in the specified guild");
      return false;
    }

    return false;
  }

  async createInviteLink(): Promise<string> {
    if (!this.client.user) {
      throw new Error("Bot is not ready");
    }

    const clientId = this.client.user.id;
    const permissions = "8"; // Administrator permissions (for development)

    return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=bot%20applications.commands`;
  }

  async getGuildByName(guildName: string): Promise<Guild | null> {
    if (!this.isReady) {
      return null;
    }

    const guilds = await this.client.guilds.fetch();
    for (const [guildId, partialGuild] of guilds) {
      const fullGuild = await partialGuild.fetch();
      if (fullGuild.name === guildName) {
        return fullGuild;
      }
    }

    return null;
  }

  async getGuildById(guildId: string): Promise<Guild | null> {
    if (!this.isReady) {
      return null;
    }

    try {
      return await this.client.guilds.fetch(guildId);
    } catch (error) {
      console.error(`Failed to fetch guild ${guildId}:`, error);
      return null;
    }
  }

  async isBotInGuild(guildId: string): Promise<boolean> {
    const guild = await this.getGuildById(guildId);
    return !!guild;
  }

  // Channel and File Management Methods
  async createCategory(
    guildId: string,
    categoryName: string
  ): Promise<string | null> {
    if (!this.isReady) {
      console.log("Bot is not ready yet");
      return null;
    }

    try {
      const guild = await this.getGuildById(guildId);
      if (!guild) {
        console.error(`Guild ${guildId} not found`);
        return null;
      }

      const category = await guild.channels.create({
        name: categoryName,
        type: 4, // CategoryChannel
      });

      console.log(`Created category: ${category.name} (${category.id})`);
      return category.id;
    } catch (error) {
      console.error("Failed to create category:", error);
      return null;
    }
  }

  async createChannel(
    guildId: string,
    channelName: string,
    categoryId?: string
  ): Promise<string | null> {
    if (!this.isReady) {
      console.log("Bot is not ready yet");
      return null;
    }

    try {
      const guild = await this.getGuildById(guildId);
      if (!guild) {
        console.error(`Guild ${guildId} not found`);
        return null;
      }

      const channel = await guild.channels.create({
        name: channelName,
        type: 0, // TextChannel
        parent: categoryId || undefined,
      });

      console.log(
        `Created channel: ${channel.name} (${channel.id}) in category ${categoryId}`
      );
      return channel.id;
    } catch (error) {
      console.error("Failed to create channel:", error);
      return null;
    }
  }

  async createForumChannel(
    guildId: string,
    forumName: string,
    forumDescription?: string
  ): Promise<string | null> {
    if (!this.isReady) {
      console.log("Bot is not ready yet");
      return null;
    }

    try {
      const guild = await this.getGuildById(guildId);
      if (!guild) {
        console.error(`Guild ${guildId} not found`);
        return null;
      }

      const forumChannel = await guild.channels.create({
        name: forumName,
        type: 15, // ForumChannel
        topic: forumDescription || `Forum for ${forumName} files`,
      });

      console.log(
        `Created forum channel: ${forumChannel.name} (${forumChannel.id})`
      );
      return forumChannel.id;
    } catch (error) {
      console.error("Failed to create forum channel:", error);
      return null;
    }
  }

  async createForumWebhook(
    forumId: string,
    webhookName: string
  ): Promise<string | null> {
    if (!this.isReady) {
      console.log("Bot is not ready yet");
      return null;
    }

    try {
      const forumChannel = await this.client.channels.fetch(forumId);
      if (!forumChannel || forumChannel.type !== 15) {
        console.error(
          `Forum ${forumId} not found or not a valid forum channel`
        );
        return null;
      }

      // Create a webhook for the forum channel
      const webhook = await forumChannel.createWebhook({
        name: webhookName,
        reason: "Creating webhook for file uploads with larger size limits",
      });

      console.log(
        `Created webhook: ${webhook.name} (${webhook.id}) for forum: ${forumId}`
      );
      return webhook.url;
    } catch (error) {
      console.error("Failed to create forum webhook:", error);
      return null;
    }
  }

  async createForumPost(
    forumId: string,
    postName: string,
    fileName: string,
    webhookUrl?: string,
    embedOptions?: {
      isVideo?: boolean;
      thumbnailBuffer?: Buffer;
      videoInfo?: {
        duration: number;
        width: number;
        height: number;
        format: string;
        bitrate: number;
        fps: number;
      };
      fileSize?: number;
    }
  ): Promise<{
    postId: string;
    webhookUrl?: string;
    thumbnailUrl?: string;
  } | null> {
    if (!this.isReady) {
      console.log("Bot is not ready yet");
      return null;
    }

    try {
      const forumChannel = await this.client.channels.fetch(forumId);
      if (!forumChannel || forumChannel.type !== 15) {
        console.error(
          `Forum ${forumId} not found or not a valid forum channel`
        );
        return null;
      }

      // Create webhook if not provided
      let finalWebhookUrl = webhookUrl;
      if (!finalWebhookUrl) {
        const newWebhookUrl = await this.createForumWebhook(
          forumId,
          "Stashcord"
        );
        if (!newWebhookUrl) {
          console.error("Failed to create webhook for forum");
          return null;
        }
        finalWebhookUrl = newWebhookUrl;
      }

      // First, create a basic forum post without attachments
      const messageOptions: any = {
        name: postName,
        message: {
          content: embedOptions?.isVideo
            ? `🎬 **${fileName}**\n\nVideo file storage post created. File chunks will be uploaded here via webhook for larger file support.`
            : `📁 **${fileName}**\n\nFile storage post created. File chunks will be uploaded here via webhook for larger file support.`,
        },
      };

      // Add video embed if this is a video file (but without thumbnail initially)
      if (embedOptions?.isVideo && embedOptions.videoInfo) {
        const { videoInfo, fileSize } = embedOptions;

        // Helper function to format duration
        const formatDuration = (seconds: number): string => {
          const hours = Math.floor(seconds / 3600);
          const minutes = Math.floor((seconds % 3600) / 60);
          const secs = Math.floor(seconds % 60);
          if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
              .toString()
              .padStart(2, "0")}`;
          }
          return `${minutes}:${secs.toString().padStart(2, "0")}`;
        };

        // Helper function to format file size
        const formatFileSize = (bytes: number): string => {
          const sizes = ["B", "KB", "MB", "GB", "TB"];
          if (bytes === 0) return "0 B";
          const i = Math.floor(Math.log(bytes) / Math.log(1024));
          return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
        };

        const embed: any = {
          title: `🎬 ${fileName}`,
          color: 0x7289da, // Discord blue
          fields: [
            {
              name: "📺 Resolution",
              value: `${videoInfo.width}x${videoInfo.height}`,
              inline: true,
            },
            {
              name: "⏱️ Duration",
              value: formatDuration(videoInfo.duration),
              inline: true,
            },
            {
              name: "🎞️ FPS",
              value: `${videoInfo.fps.toFixed(1)} fps`,
              inline: true,
            },
            {
              name: "📊 Bitrate",
              value: `${Math.round(videoInfo.bitrate / 1000)} kbps`,
              inline: true,
            },
            {
              name: "💾 Size",
              value: fileSize ? formatFileSize(fileSize) : "Unknown",
              inline: true,
            },
            {
              name: "🎬 Format",
              value: videoInfo.format.toUpperCase(),
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
          footer: {
            text: "Stashcord Video Storage",
          },
        };

        messageOptions.message.embeds = [embed];
      }

      console.log(`Creating forum post with options:`, {
        name: messageOptions.name,
        hasMessage: !!messageOptions.message,
        hasEmbeds: !!messageOptions.message?.embeds,
      });

      const forumPost = await forumChannel.threads.create(messageOptions);

      console.log(
        `Created forum post: ${postName} (${forumPost.id}) for file: ${fileName}`
      );

      // If this is a video with thumbnail, upload the thumbnail separately and update the embed
      let thumbnailUrl: string | undefined;
      if (embedOptions?.isVideo && embedOptions.thumbnailBuffer) {
        console.log(
          `Video has thumbnail buffer, uploading as separate message...`
        );
        try {
          // Send thumbnail as a separate message in the thread
          const thumbnailMessage = await forumPost.send({
            content: "📸 **Video Thumbnail**",
            files: [
              {
                attachment: embedOptions.thumbnailBuffer,
                name: "thumbnail.jpg",
              },
            ],
          });

          console.log(`Uploaded thumbnail message:`, {
            messageId: thumbnailMessage.id,
            attachmentCount: thumbnailMessage.attachments.size,
          });

          if (thumbnailMessage.attachments.size > 0) {
            const thumbnailAttachment = thumbnailMessage.attachments.first();
            if (thumbnailAttachment) {
              thumbnailUrl = thumbnailAttachment.url;
              console.log(`✅ Got thumbnail URL from Discord: ${thumbnailUrl}`);

              // Now update the original embed to include the thumbnail
              try {
                const starterMessage = await forumPost.fetchStarterMessage();
                if (starterMessage && starterMessage.embeds.length > 0) {
                  const originalEmbed = starterMessage.embeds[0];
                  const updatedEmbed = {
                    ...originalEmbed.toJSON(),
                    thumbnail: { url: thumbnailUrl },
                  };

                  await starterMessage.edit({
                    content: starterMessage.content,
                    embeds: [updatedEmbed],
                  });

                  console.log(
                    `✅ Updated starter message embed with thumbnail URL`
                  );
                }
              } catch (embedError) {
                console.warn(
                  "Failed to update embed with thumbnail:",
                  embedError
                );
                // Continue anyway since we have the thumbnail URL
              }
            }
          } else {
            console.log(`❌ No attachments found in thumbnail message`);
          }
        } catch (error) {
          console.warn("Failed to upload thumbnail separately:", error);
        }
      } else {
        console.log(
          `No thumbnail to process. isVideo: ${
            embedOptions?.isVideo
          }, hasThumbnailBuffer: ${!!embedOptions?.thumbnailBuffer}`
        );
      }

      return {
        postId: forumPost.id,
        webhookUrl: finalWebhookUrl,
        thumbnailUrl,
      };
    } catch (error) {
      console.error("Failed to create forum post:", error);
      return null;
    }
  }

  async uploadFileChunkViaWebhook(
    webhookUrl: string,
    threadId: string,
    chunkBuffer: Buffer,
    chunkIndex: number,
    fileName: string,
    totalChunks: number
  ): Promise<{
    messageId: string;
    attachmentId: string;
    cdnUrl: string;
  } | null> {
    try {
      // Create chunk filename
      const chunkFileName = `${fileName}.chunk${chunkIndex
        .toString()
        .padStart(3, "0")}`;

      // Prepare form data for webhook
      const formData = new FormData();
      formData.append(
        "content",
        `Chunk ${chunkIndex + 1}/${totalChunks} of **${fileName}**`
      );

      // Create a blob from the buffer for the file
      const blob = new Blob([chunkBuffer], {
        type: "application/octet-stream",
      });
      formData.append("files[0]", blob, chunkFileName);

      // Add thread_id as URL parameter for forum channel posts
      const webhookUrlWithThread = `${webhookUrl}?thread_id=${threadId}`;

      // Send via webhook
      const response = await fetch(webhookUrlWithThread, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Webhook upload failed: ${response.status} ${response.statusText}`
        );
        console.error(`Error details:`, errorText);
        console.error(`Chunk size: ${chunkBuffer.length} bytes`);
        return null;
      }

      const messageData = (await response.json()) as any;

      if (!messageData.attachments || messageData.attachments.length === 0) {
        console.error("No attachment found in webhook response");
        return null;
      }

      const attachment = messageData.attachments[0];
      console.log(
        `Uploaded chunk ${
          chunkIndex + 1
        }/${totalChunks} for ${fileName} via webhook`
      );

      return {
        messageId: messageData.id,
        attachmentId: attachment.id,
        cdnUrl: attachment.url,
      };
    } catch (error) {
      console.error("Failed to upload file chunk via webhook:", error);
      return null;
    }
  }

  // Legacy method - keep for backward compatibility but prefer webhook method
  async uploadFileChunk(
    threadId: string,
    chunkBuffer: Buffer,
    chunkIndex: number,
    fileName: string,
    totalChunks: number
  ): Promise<{
    messageId: string;
    attachmentId: string;
    cdnUrl: string;
  } | null> {
    if (!this.isReady) {
      console.log("Bot is not ready yet");
      return null;
    }

    try {
      const thread = await this.client.channels.fetch(threadId);
      if (!thread || !thread.isThread()) {
        console.error(`Thread ${threadId} not found or not a thread`);
        return null;
      }

      // Create chunk filename
      const chunkFileName = `${fileName}.chunk${chunkIndex
        .toString()
        .padStart(3, "0")}`;

      // Send the chunk as an attachment
      const message = await thread.send({
        content: `Chunk ${chunkIndex + 1}/${totalChunks} of **${fileName}**`,
        files: [
          {
            attachment: chunkBuffer,
            name: chunkFileName,
          },
        ],
      });

      const attachment = message.attachments.first();
      if (!attachment) {
        console.error("No attachment found in uploaded message");
        return null;
      }

      console.log(
        `Uploaded chunk ${chunkIndex + 1}/${totalChunks} for ${fileName}`
      );

      return {
        messageId: message.id,
        attachmentId: attachment.id,
        cdnUrl: attachment.url,
      };
    } catch (error) {
      console.error("Failed to upload file chunk:", error);
      return null;
    }
  }

  async downloadFileChunk(cdnUrl: string): Promise<Buffer | null> {
    try {
      const response = await fetch(cdnUrl);
      if (!response.ok) {
        console.error(`Failed to download chunk: ${response.status}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error("Failed to download file chunk:", error);
      return null;
    }
  }

  async deleteMessage(channelId: string, messageId: string): Promise<boolean> {
    if (!this.isReady) {
      console.log("Bot is not ready yet");
      return false;
    }

    try {
      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased() || channel.isDMBased()) {
        console.error(
          `Channel ${channelId} not found or not a valid text channel`
        );
        return false;
      }

      const message = await channel.messages.fetch(messageId);
      await message.delete();

      console.log(`Deleted message ${messageId} from channel ${channelId}`);
      return true;
    } catch (error) {
      console.error("Failed to delete message:", error);
      return false;
    }
  }

  async deleteChannel(channelId: string): Promise<boolean> {
    if (!this.isReady) {
      console.log("Bot is not ready yet");
      return false;
    }

    try {
      const channel = await this.client.channels.fetch(channelId);
      if (!channel) {
        console.error(`Channel ${channelId} not found`);
        return false;
      }

      await channel.delete();
      console.log(`Deleted channel ${channelId}`);
      return true;
    } catch (error) {
      console.error("Failed to delete channel:", error);
      return false;
    }
  }

  async deleteThread(threadId: string): Promise<boolean> {
    if (!this.isReady) {
      console.log("Bot is not ready yet");
      return false;
    }

    try {
      const thread = await this.client.channels.fetch(threadId);
      if (!thread || !thread.isThread()) {
        console.error(`Thread ${threadId} not found or not a thread`);
        return false;
      }

      await thread.delete();
      console.log(`Deleted thread ${threadId}`);
      return true;
    } catch (error) {
      console.error("Failed to delete thread:", error);
      return false;
    }
  }

  async updateChannelName(
    channelId: string,
    newName: string
  ): Promise<boolean> {
    if (!this.isReady) {
      console.log("Bot is not ready yet");
      return false;
    }

    try {
      const channel = await this.client.channels.fetch(channelId);
      if (!channel) {
        console.error(`Channel ${channelId} not found`);
        return false;
      }

      if (!("edit" in channel)) {
        console.error(`Channel ${channelId} is not editable`);
        return false;
      }

      await channel.edit({ name: newName });
      console.log(`Updated channel ${channelId} name to: ${newName}`);
      return true;
    } catch (error) {
      console.error("Failed to update channel name:", error);
      return false;
    }
  }

  async sendFileCompleteMessage(
    threadId: string,
    fileName: string,
    fileSize: number,
    totalChunks: number
  ): Promise<string | null> {
    if (!this.isReady) {
      console.log("Bot is not ready yet");
      return null;
    }

    try {
      const thread = await this.client.channels.fetch(threadId);
      if (!thread || !thread.isThread()) {
        console.error(`Thread ${threadId} not found or not a thread`);
        return null;
      }

      const message = await thread.send({
        content: `✅ **File Upload Complete**\n\n📁 **${fileName}**\n📊 Size: ${this.formatFileSize(
          fileSize
        )}\n🧩 Chunks: ${totalChunks}\n\nFile has been successfully stored and is ready for download.`,
      });

      console.log(`Sent completion message for ${fileName}`);
      return message.id;
    } catch (error) {
      console.error("Failed to send file complete message:", error);
      return null;
    }
  }

  private formatFileSize(bytes: number): string {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  }

  isConnected(): boolean {
    return this.isReady;
  }

  getClient(): Client {
    return this.client;
  }

  /**
   * Create a dedicated webhook for a specific file upload to avoid rate limiting
   * This webhook will be deleted after the file upload is complete
   */
  async createDedicatedFileWebhook(
    threadId: string,
    fileName: string
  ): Promise<string | null> {
    if (!this.isReady) {
      console.log("Bot is not ready yet");
      return null;
    }

    try {
      const thread = await this.client.channels.fetch(threadId);
      if (!thread || !thread.isThread()) {
        console.error(`Thread ${threadId} not found or not a thread`);
        return null;
      }

      const parentChannel = thread.parent;
      if (!parentChannel) {
        console.error(`Parent channel for thread ${threadId} not found`);
        return null;
      }

      const webhook = await parentChannel.createWebhook({
        name: `File-${fileName.slice(0, 20)}-${Date.now()}`, // Shortened name with timestamp
        reason: `Dedicated webhook for file upload: ${fileName}`,
      });

      console.log(
        `Created dedicated webhook for file ${fileName}: ${webhook.id}`
      );
      return webhook.url;
    } catch (error) {
      console.error("Failed to create dedicated file webhook:", error);
      return null;
    }
  }

  /**
   * Delete a webhook by URL to clean up after file upload
   */
  async deleteDedicatedFileWebhook(webhookUrl: string): Promise<boolean> {
    if (!this.isReady) {
      console.log("Bot is not ready yet");
      return false;
    }

    try {
      // Extract webhook ID and token from URL
      const webhookUrlMatch = webhookUrl.match(/\/webhooks\/(\d+)\/([^?]+)/);
      if (!webhookUrlMatch) {
        console.error("Invalid webhook URL format");
        return false;
      }

      const webhookId = webhookUrlMatch[1];
      const webhookToken = webhookUrlMatch[2];

      // Delete webhook using REST API
      const response = await fetch(
        `https://discord.com/api/v10/webhooks/${webhookId}/${webhookToken}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        console.log(`Successfully deleted dedicated webhook: ${webhookId}`);
        return true;
      } else {
        console.error(
          `Failed to delete webhook: ${response.status} ${response.statusText}`
        );
        return false;
      }
    } catch (error) {
      console.error("Failed to delete dedicated file webhook:", error);
      return false;
    }
  }
}

// Singleton instance
export const discordBot = new StashcordBot();
