import express, { Router, type IRouter, type Request } from "express";
import { getAuth } from "@clerk/express";
import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { promisify } from "node:util";
import {
  GetCartoonVideoParams,
  GetCartoonVideoResponse,
  ListCartoonVideosQueryParams,
  ListCartoonVideosResponse,
} from "@workspace/api-zod";
import { cartoonVideos } from "../data/cartoonVideos";

const router: IRouter = Router();
const runFile = promisify(execFile);
const generatedDirectory = path.join(os.tmpdir(), "gamezone-cartoon-videos");
const generatedLifetimeMs = 60 * 60 * 1000;
const dailyGenerations = new Map<string, string>();
const mediaDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "cartoon-videos",
);

router.use(
  "/cartoon-videos/media",
  express.static(mediaDirectory, {
    fallthrough: false,
    immutable: true,
    maxAge: "1d",
  }),
);

async function removeExpiredGeneratedVideos() {
  await mkdir(generatedDirectory, { recursive: true });
  const names = await readdir(generatedDirectory);
  await Promise.all(
    names
      .filter((name) => name.endsWith(".mp4"))
      .map(async (name) => {
        const filePath = path.join(generatedDirectory, name);
        const details = await stat(filePath);
        if (Date.now() - details.mtimeMs >= generatedLifetimeMs) {
          await rm(filePath, { force: true });
        }
      }),
  );
}

function getDailyClientKey(req: Request, userId?: string | null) {
  if (userId) return `user:${userId}`;

  const guestNetwork = req.ip || req.socket.remoteAddress || "unknown";
  const guestHash = createHash("sha256").update(guestNetwork).digest("hex");
  return `guest:${guestHash}`;
}

function removeOldGenerationLimits(today: string) {
  for (const [clientKey, date] of dailyGenerations) {
    if (date !== today) dailyGenerations.delete(clientKey);
  }
}

router.get("/cartoon-videos/generated/:fileName", async (req, res) => {
  const { fileName } = req.params;
  if (!/^[0-9a-f-]+\.mp4$/i.test(fileName)) {
    res.status(404).json({ error: "Cartoon video not found." });
    return;
  }
  const filePath = path.join(generatedDirectory, fileName);
  try {
    const details = await stat(filePath);
    if (Date.now() - details.mtimeMs >= generatedLifetimeMs) {
      await rm(filePath, { force: true });
      res.status(410).json({ error: "This cartoon video has expired." });
      return;
    }
    res.set("Cache-Control", "private, max-age=300");
    res.sendFile(filePath);
  } catch {
    res.status(404).json({ error: "Cartoon video not found." });
  }
});

router.post(
  "/cartoon-videos/generate",
  express.raw({ type: "video/*", limit: "100mb" }),
  async (req, res) => {
    const input = req.body;
    if (!Buffer.isBuffer(input) || input.length === 0) {
      res.status(400).json({ error: "A video file is required." });
      return;
    }

    const { userId } = getAuth(req);
    const clientKey = getDailyClientKey(req, userId);
    const today = new Date().toISOString().slice(0, 10);
    removeOldGenerationLimits(today);
    if (dailyGenerations.get(clientKey) === today) {
      res.status(429).json({
        error: userId
          ? "Daily cartoon limit reached. Try again tomorrow."
          : "Daily guest cartoon limit reached for this network. Try again tomorrow or sign in with another eligible account.",
      });
      return;
    }

    await mkdir(generatedDirectory, { recursive: true });
    await removeExpiredGeneratedVideos();
    const id = randomUUID();
    const inputPath = path.join(generatedDirectory, `${id}-input`);
    const outputPath = path.join(generatedDirectory, `${id}.mp4`);

    try {
      await writeFile(inputPath, input);
      const probe = await runFile("ffprobe", [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        inputPath,
      ]);
      const duration = Number.parseFloat(probe.stdout.trim());
      if (!Number.isFinite(duration) || duration <= 0 || duration > 60.5) {
        res.status(400).json({ error: "Video must be 1 minute or shorter." });
        return;
      }

      await runFile("ffmpeg", [
        "-hide_banner", "-loglevel", "error", "-y",
        "-i", inputPath,
        "-map", "0:v:0",
        "-map", "0:a?",
        "-vf",
        "scale='trunc(iw*min(1,min(720/iw,1280/ih))/2)*2':'trunc(ih*min(1,min(720/iw,1280/ih))/2)*2',fps=30,hqdn3d=3:3:6:6,eq=saturation=1.55:contrast=1.12,unsharp=5:5:1.2:5:5:0,lutrgb=r='floor(val/32)*32':g='floor(val/32)*32':b='floor(val/32)*32',format=yuv420p",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "24",
        "-profile:v", "main", "-level:v", "3.1", "-pix_fmt", "yuv420p",
        "-tag:v", "avc1",
        "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2",
        "-movflags", "+faststart",
        "-avoid_negative_ts", "make_zero",
        "-t", "60",
        outputPath,
      ]);

      const outputProbe = await runFile("ffprobe", [
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=codec_name,profile,level,pix_fmt,width,height,avg_frame_rate",
        "-of", "json",
        outputPath,
      ]);
      const outputMetadata = JSON.parse(outputProbe.stdout) as {
        streams?: Array<{
          codec_name?: string;
          profile?: string;
          level?: number;
          pix_fmt?: string;
          width?: number;
          height?: number;
          avg_frame_rate?: string;
        }>;
      };
      const videoStream = outputMetadata.streams?.[0];
      const [frameRateNumerator, frameRateDenominator] = (
        videoStream?.avg_frame_rate ?? "0/1"
      ).split("/").map(Number);
      const frameRate = frameRateNumerator / frameRateDenominator;
      if (
        videoStream?.codec_name !== "h264"
        || videoStream.profile !== "Main"
        || videoStream.level !== 31
        || videoStream.pix_fmt !== "yuv420p"
        || !videoStream.width
        || !videoStream.height
        || videoStream.width > 720
        || videoStream.height > 1280
        || !Number.isFinite(frameRate)
        || frameRate > 30.1
      ) {
        throw new Error("Generated video is not mobile compatible.");
      }

      dailyGenerations.set(clientKey, today);
      const cleanupTimer = setTimeout(
        () => void rm(outputPath, { force: true }),
        generatedLifetimeMs,
      );
      cleanupTimer.unref();
      res.status(201).json({
        id,
        videoUrl: `/api/cartoon-videos/generated/${id}.mp4`,
        expiresInSeconds: 3600,
      });
    } catch (error) {
      console.error("Cartoon generation failed", error);
      await rm(outputPath, { force: true });
      res.status(422).json({ error: "This video could not be processed. Try another MP4 or MOV file." });
    } finally {
      await rm(inputPath, { force: true });
    }
  },
);

router.get("/cartoon-videos", (req, res) => {
  const parsedQuery = ListCartoonVideosQueryParams.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({ error: "Invalid category filter." });
    return;
  }

  const category = parsedQuery.data.category?.trim().toLowerCase();
  const videos = category
    ? cartoonVideos.filter(
        (video) => video.category.toLowerCase() === category,
      )
    : cartoonVideos;

  res.set("Cache-Control", "public, max-age=300");
  res.json(ListCartoonVideosResponse.parse({ videos }));
});

router.get("/cartoon-videos/:videoId", (req, res) => {
  const parsedParams = GetCartoonVideoParams.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: "Invalid video ID." });
    return;
  }

  const video = cartoonVideos.find(
    (item) => item.id === parsedParams.data.videoId,
  );
  if (!video) {
    res.status(404).json({ error: "Cartoon video not found." });
    return;
  }

  res.set("Cache-Control", "public, max-age=300");
  res.json(GetCartoonVideoResponse.parse(video));
});

export default router;