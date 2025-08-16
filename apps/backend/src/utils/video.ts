import ffmpeg from "fluent-ffmpeg";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import fileType from "file-type";
import { settingsService } from "../services/settings";

// Configure FFmpeg paths for Windows
try {
  // Try to set FFmpeg paths if they're available in environment or common locations
  const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
  const ffprobePath = process.env.FFPROBE_PATH || "ffprobe";

  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);
} catch (error) {
  console.warn("FFmpeg configuration warning:", error);
}

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  format: string;
  bitrate: number;
  fps: number;
}

export interface ThumbnailResult {
  thumbnailPath: string;
  thumbnailBuffer: Buffer;
  width: number;
  height: number;
}

/**
 * Generate a 9-grid thumbnail for a video file with user-specific settings
 */
export async function generateVideoThumbnail(
  videoPath: string,
  outputDir: string,
  userId: string,
  options: {
    quality?: number; // 1-100 (will be overridden by user settings)
    videoInfo?: VideoInfo; // Pass video info to avoid duplicate ffprobe calls
  } = {}
): Promise<ThumbnailResult | null> {
  // Check if user has thumbnail generation enabled
  const shouldGenerateThumbnails =
    await settingsService.shouldGenerateThumbnails(userId);
  if (!shouldGenerateThumbnails) {
    return null;
  }

  // Get user's preferred thumbnail quality
  const userQuality = await settingsService.getThumbnailQuality(userId);
  const { quality = userQuality, videoInfo } = options;

  // Get video info if not provided
  const info = videoInfo || (await getVideoInfo(videoPath));
  const { width: videoWidth, height: videoHeight, duration } = info;

  // Calculate frame size for 3x3 grid (each frame is 1/3 of video width/height)
  const frameWidth = Math.floor(videoWidth / 3);
  const frameHeight = Math.floor(videoHeight / 3);

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Generate 9 frames at different timestamps
  const timeOffsets = [
    duration * 0.1, // 10%
    duration * 0.2, // 20%
    duration * 0.3, // 30%
    duration * 0.4, // 40%
    duration * 0.5, // 50%
    duration * 0.6, // 60%
    duration * 0.7, // 70%
    duration * 0.8, // 80%
    duration * 0.9, // 90%
  ];

  const framePromises = timeOffsets.map((timeOffset, index) => {
    return new Promise<Buffer>((resolve, reject) => {
      const tempFramePath = path.join(
        outputDir,
        `temp_frame_${Date.now()}_${index}.jpg`
      );

      ffmpeg(videoPath)
        .seekInput(Math.max(0, timeOffset))
        .frames(1)
        .size(`${frameWidth}x${frameHeight}`)
        .output(tempFramePath)
        .on("end", async () => {
          try {
            const frameBuffer = await fs.readFile(tempFramePath);
            await fs.unlink(tempFramePath); // Clean up temp file
            resolve(frameBuffer);
          } catch (error) {
            reject(error);
          }
        })
        .on("error", reject)
        .run();
    });
  });

  try {
    // Wait for all frames to be generated
    const frameBuffers = await Promise.all(framePromises);

    // Create 3x3 grid using Sharp
    const gridImage = sharp({
      create: {
        width: videoWidth,
        height: videoHeight,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    });

    // Composite all frames into a 3x3 grid
    const composite = frameBuffers.map((buffer, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      return {
        input: buffer,
        top: row * frameHeight,
        left: col * frameWidth,
      };
    });

    // Create video info overlay text
    const videoName = path.basename(videoPath);
    const duration = formatDuration(info.duration);
    const resolution = `${videoWidth}x${videoHeight}`;
    const fileSize = await getFileSize(videoPath);
    const fileSizeText = formatFileSize(fileSize);

    // Create overlay text lines
    const overlayLines = [
      videoName.length > 30 ? videoName.substring(0, 27) + "..." : videoName,
      `${resolution} • ${duration}`,
      fileSizeText,
    ];

    // Calculate font size based on video dimensions
    const fontSize = Math.max(12, Math.min(24, Math.floor(videoWidth / 40)));
    const lineHeight = fontSize * 1.4;

    // Create SVG overlay with video info
    const overlayHeight = overlayLines.length * lineHeight + 20;
    const overlayWidth = Math.min(
      videoWidth - 20,
      Math.max(200, videoName.length * (fontSize * 0.6))
    );

    const svgOverlay = `
      <svg width="${overlayWidth}" height="${overlayHeight}">
        <rect x="0" y="0" width="${overlayWidth}" height="${overlayHeight}" 
              fill="rgba(0,0,0,0.7)" rx="8" ry="8"/>
        ${overlayLines
          .map(
            (line, index) =>
              `<text x="10" y="${20 + index * lineHeight}" 
                 font-family="Arial, sans-serif" font-size="${fontSize}" 
                 fill="white" font-weight="${
                   index === 0 ? "bold" : "normal"
                 }">${line}</text>`
          )
          .join("")}
      </svg>
    `;

    // Add overlay to composite array
    composite.push({
      input: Buffer.from(svgOverlay),
      top: 10,
      left: 10,
    });

    const thumbnailBuffer = await gridImage
      .composite(composite)
      .jpeg({ quality, progressive: true })
      .toBuffer();

    const thumbnailFilename = `thumb_9grid_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 15)}.jpg`;
    const thumbnailPath = path.join(outputDir, thumbnailFilename);

    // Save the final thumbnail
    await fs.writeFile(thumbnailPath, thumbnailBuffer);

    console.log(
      `Generated 9-grid thumbnail: ${thumbnailPath}, buffer size: ${thumbnailBuffer.length}`
    );

    return {
      thumbnailPath,
      thumbnailBuffer,
      width: videoWidth,
      height: videoHeight,
    };
  } catch (error) {
    console.error("9-grid thumbnail generation error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("ffprobe")) {
      throw new Error(
        "FFprobe not found. Please install FFmpeg and ensure it's in your PATH."
      );
    } else if (errorMessage.includes("ffmpeg")) {
      throw new Error(
        "FFmpeg not found. Please install FFmpeg and ensure it's in your PATH."
      );
    } else {
      throw error;
    }
  }
}

/**
 * Generate a simple single-frame thumbnail for a video file
 */
export async function generateSimpleVideoThumbnail(
  videoPath: string,
  outputDir: string,
  options: {
    quality?: number; // 1-100
  } = {}
): Promise<ThumbnailResult> {
  const { quality = 85 } = options;

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `simple_thumbnail_${Date.now()}.jpg`);

  return new Promise<ThumbnailResult>((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(2) // Seek to 2 seconds into the video
      .frames(1)
      .output(outputPath)
      .on("end", async () => {
        try {
          // Read the generated thumbnail
          const thumbnailBuffer = await fs.readFile(outputPath);

          // Get image dimensions
          const metadata = await sharp(thumbnailBuffer).metadata();
          const width = metadata.width || 0;
          const height = metadata.height || 0;

          // Clean up the temporary file
          try {
            await fs.unlink(outputPath);
            console.log(`Cleaned up simple thumbnail file: ${outputPath}`);
          } catch (unlinkError) {
            console.warn(
              "Failed to clean up simple thumbnail file:",
              unlinkError
            );
          }

          resolve({
            thumbnailPath: outputPath,
            thumbnailBuffer,
            width,
            height,
          });
        } catch (error) {
          reject(error);
        }
      })
      .on("error", reject)
      .run();
  });
}

/**
 * Get video metadata information
 */
export async function getVideoInfo(videoPath: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        console.error("FFprobe error:", err);
        if (err.message && err.message.includes("ffprobe")) {
          reject(
            new Error(
              "FFprobe not found. Please install FFmpeg and ensure it's in your PATH."
            )
          );
        } else {
          reject(err);
        }
        return;
      }

      const videoStream = metadata.streams.find(
        (stream) => stream.codec_type === "video"
      );
      if (!videoStream) {
        reject(new Error("No video stream found"));
        return;
      }

      const duration = metadata.format?.duration || 0;
      const bitrate = metadata.format?.bit_rate
        ? parseInt(metadata.format.bit_rate.toString())
        : 0;

      resolve({
        duration,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        format: metadata.format?.format_name || "unknown",
        bitrate,
        fps: videoStream.r_frame_rate ? eval(videoStream.r_frame_rate) : 0,
      });
    });
  });
}

/**
 * Check if a file is a video based on its buffer
 */
export async function isVideoFile(buffer: Buffer): Promise<boolean> {
  try {
    const type = await fileType.fromBuffer(buffer);
    return type?.mime.startsWith("video/") || false;
  } catch {
    return false;
  }
}

/**
 * Get video file type from buffer
 */
export async function getVideoFileType(buffer: Buffer): Promise<string | null> {
  try {
    const type = await fileType.fromBuffer(buffer);
    if (type?.mime.startsWith("video/")) {
      return type.ext;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get file size in bytes
 */
export async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * Format duration in seconds to human readable format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}
