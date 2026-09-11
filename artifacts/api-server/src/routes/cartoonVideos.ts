import express, { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
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

router.use(
  "/cartoon-videos/generated",
  express.static(generatedDirectory, {
    fallthrough: false,
    maxAge: "1h",
  }),
);

router.post(
  "/cartoon-videos/generate",
  express.raw({ type: "video/*", limit: "25mb" }),
  async (req, res) => {
    const input = req.body;
    if (!Buffer.isBuffer(input) || input.length === 0) {
      res.status(400).json({ error: "A video file is required." });
      return;
    }

    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: "Sign in to create a cartoon video." });
      return;
    }

    const clientKey = userId;
    const today = new Date().toISOString().slice(0, 10);
    if (dailyGenerations.get(clientKey) === today) {
      res.status(429).json({ error: "Daily cartoon limit reached. Try again tomorrow." });
      return;
    }

    await mkdir(generatedDirectory, { recursive: true });
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
      if (!Number.isFinite(duration) || duration <= 0 || duration > 5.5) {
        res.status(400).json({ error: "Video must be 5 seconds or shorter." });
        return;
      }

      await runFile("ffmpeg", [
        "-hide_banner", "-loglevel", "error", "-y",
        "-i", inputPath,
        "-vf",
        "scale='min(720,iw)':-2:force_original_aspect_ratio=decrease,hqdn3d=3:3:6:6,eq=saturation=1.55:contrast=1.12,unsharp=5:5:1.2:5:5:0,lutrgb=r='floor(val/32)*32':g='floor(val/32)*32':b='floor(val/32)*32'",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "24",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        "-t", "5",
        outputPath,
      ]);

      dailyGenerations.set(clientKey, today);
      const cleanupTimer = setTimeout(
        () => void rm(outputPath, { force: true }),
        60 * 60 * 1000,
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