import express, { Router, type IRouter, type Request } from "express";
import { getAuth } from "@clerk/express";
import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { appendFile, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
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
const uploadLifetimeMs = 15 * 60 * 1000;
const maxVideoBytes = 100 * 1024 * 1024;
const uploadChunkBytes = 2 * 1024 * 1024;
const dailyGenerationLimit = 10;
const dailyGenerations = new Map<string, { date: string; count: number }>();
const mediaDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "cartoon-videos",
);
type UploadSession = {
  id: string;
  inputPath: string;
  size: number;
  received: number;
  nextChunk: number;
  clientKey: string;
  timer: NodeJS.Timeout;
};
const uploads = new Map<string, UploadSession>();
type CartoonJob = {
  id: string;
  inputPath: string;
  clientKey: string;
  userId: string | null;
  status: "processing" | "ready" | "failed";
  videoUrl?: string;
  error?: string;
  timer: NodeJS.Timeout;
};
const jobs = new Map<string, CartoonJob>();

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
      .filter((name) => name.endsWith(".mp4") || name.endsWith("-input"))
      .map(async (name) => {
        const filePath = path.join(generatedDirectory, name);
        const details = await stat(filePath);
        const lifetime = name.endsWith("-input") ? uploadLifetimeMs : generatedLifetimeMs;
        if (Date.now() - details.mtimeMs >= lifetime) {
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
  for (const [clientKey, usage] of dailyGenerations) {
    if (usage.date !== today) dailyGenerations.delete(clientKey);
  }
}

function reserveGenerationSlot(clientKey: string, today: string) {
  const usage = dailyGenerations.get(clientKey);
  const count = usage?.date === today ? usage.count : 0;
  if (count >= dailyGenerationLimit) return false;
  dailyGenerations.set(clientKey, { date: today, count: count + 1 });
  return true;
}

function releaseGenerationSlot(clientKey: string, today: string) {
  const usage = dailyGenerations.get(clientKey);
  if (!usage || usage.date !== today) return;
  if (usage.count <= 1) {
    dailyGenerations.delete(clientKey);
    return;
  }
  dailyGenerations.set(clientKey, { date: today, count: usage.count - 1 });
}

function getAuthClientKey(req: Request) {
  const { userId } = getAuth(req);
  return { userId, clientKey: getDailyClientKey(req, userId) };
}

async function removeUpload(session: UploadSession, removeFile = true) {
  clearTimeout(session.timer);
  uploads.delete(session.id);
  if (removeFile) await rm(session.inputPath, { force: true });
}

function refreshUploadExpiry(session: UploadSession) {
  clearTimeout(session.timer);
  session.timer = setTimeout(() => {
    const current = uploads.get(session.id);
    if (current) void removeUpload(current);
  }, uploadLifetimeMs);
  session.timer.unref();
}

async function createUploadSession(req: Request, size: number) {
  const id = randomUUID();
  await mkdir(generatedDirectory, { recursive: true });
  const inputPath = path.join(generatedDirectory, `${id}-input`);
  const timer = setTimeout(() => {
    const current = uploads.get(id);
    if (current) void removeUpload(current);
  }, uploadLifetimeMs);
  timer.unref();
  const session: UploadSession = {
    id, inputPath, size, received: 0, nextChunk: 0,
    clientKey: getAuthClientKey(req).clientKey, timer,
  };
  uploads.set(id, session);
  return session;
}

async function processCartoonVideo(inputPath: string, outputPath: string) {
  const probe = await runFile("ffprobe", [
    "-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", inputPath,
  ]);
  const duration = Number.parseFloat(probe.stdout.trim());
  if (!Number.isFinite(duration) || duration <= 0 || duration > 60.5) {
    throw new Error("Video must be 1 minute or shorter.");
  }
  await runFile("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", inputPath,
    "-filter_complex",
    "scale='trunc(iw*min(1,min(720/iw,1280/ih))/2)*2':'trunc(ih*min(1,min(720/iw,1280/ih))/2)*2',fps=30,hqdn3d=5:4:8:6,split=3[base][edgesrc][inksrc];[base]bilateral=sigmaS=5:sigmaR=0.15,eq=saturation=2.0:contrast=1.15:brightness=0.07:gamma=1.1,lutrgb=r='floor(val/48)*48':g='floor(val/48)*48':b='floor(val/48)*48',format=rgba[colors];[edgesrc]edgedetect=low=0.045:high=0.15,dilation,format=gray[alpha];[inksrc]lutrgb=r=0:g=0:b=0,format=rgba[ink];[ink][alpha]alphamerge[outlined];[colors][outlined]overlay=format=auto,format=yuv420p[cartoon]",
    "-map", "[cartoon]", "-map", "0:a?",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-profile:v", "main",
    "-level:v", "3.1", "-pix_fmt", "yuv420p", "-tag:v", "avc1",
    "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2",
    "-movflags", "+faststart", "-avoid_negative_ts", "make_zero", "-t", "60", outputPath,
  ]);
  const outputProbe = await runFile("ffprobe", [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=codec_name,profile,level,pix_fmt,width,height,avg_frame_rate",
    "-of", "json", outputPath,
  ]);
  const videoStream = (JSON.parse(outputProbe.stdout) as { streams?: Array<{
    codec_name?: string; profile?: string; level?: number; pix_fmt?: string;
    width?: number; height?: number; avg_frame_rate?: string;
  }> }).streams?.[0];
  const [numerator, denominator] = (videoStream?.avg_frame_rate ?? "0/1").split("/").map(Number);
  const frameRate = numerator / denominator;
  if (videoStream?.codec_name !== "h264" || videoStream.profile !== "Main" ||
      videoStream.level !== 31 || videoStream.pix_fmt !== "yuv420p" ||
      !videoStream.width || !videoStream.height || videoStream.width > 720 ||
      videoStream.height > 1280 || !Number.isFinite(frameRate) || frameRate > 30.1) {
    throw new Error("Generated video is not mobile compatible.");
  }
}

async function finishGeneration(req: Request, res: express.Response, inputPath: string, clientKey: string) {
  const today = new Date().toISOString().slice(0, 10);
  removeOldGenerationLimits(today);
  if (!reserveGenerationSlot(clientKey, today)) {
    await rm(inputPath, { force: true });
    res.status(429).json({ error: getAuth(req).userId
      ? "You have reached the daily limit of 10 cartoon videos. Try again tomorrow."
      : "This network has reached the daily guest limit of 10 cartoon videos. Try again tomorrow or sign in with another eligible account." });
    return;
  }
  const id = randomUUID();
  const outputPath = path.join(generatedDirectory, `${id}.mp4`);
  let succeeded = false;
  try {
    await processCartoonVideo(inputPath, outputPath);
    succeeded = true;
    const cleanupTimer = setTimeout(() => void rm(outputPath, { force: true }), generatedLifetimeMs);
    cleanupTimer.unref();
    res.status(201).json({ id, videoUrl: `/api/cartoon-videos/generated/${id}.mp4`, expiresInSeconds: 3600 });
  } catch (error) {
    console.error("Cartoon generation failed", error);
    await rm(outputPath, { force: true });
    res.status(422).json({ error: error instanceof Error && error.message === "Video must be 1 minute or shorter."
      ? error.message : "This video could not be processed. Try another MP4 or MOV file." });
  } finally {
    if (!succeeded) releaseGenerationSlot(clientKey, today);
    await rm(inputPath, { force: true });
  }
}

function jobResponse(job: CartoonJob) {
  return {
    jobId: job.id,
    status: job.status,
    ...(job.status === "ready" ? { id: job.id, videoUrl: job.videoUrl, expiresInSeconds: 3600 } : {}),
    ...(job.status === "failed" ? { error: job.error } : {}),
  };
}

function expireJob(job: CartoonJob) {
  clearTimeout(job.timer);
  jobs.delete(job.id);
  void rm(job.inputPath, { force: true });
}

async function runCartoonJob(job: CartoonJob) {
  const today = new Date().toISOString().slice(0, 10);
  removeOldGenerationLimits(today);
  if (!reserveGenerationSlot(job.clientKey, today)) {
    job.status = "failed";
    job.error = job.userId
      ? "You have reached the daily limit of 10 cartoon videos. Try again tomorrow."
      : "This network has reached the daily guest limit of 10 cartoon videos. Try again tomorrow or sign in with another eligible account.";
    await rm(job.inputPath, { force: true });
    return;
  }
  const outputPath = path.join(generatedDirectory, `${job.id}.mp4`);
  let succeeded = false;
  try {
    await processCartoonVideo(job.inputPath, outputPath);
    succeeded = true;
    job.status = "ready";
    job.videoUrl = `/api/cartoon-videos/generated/${job.id}.mp4`;
    const outputTimer = setTimeout(() => void rm(outputPath, { force: true }), generatedLifetimeMs);
    outputTimer.unref();
  } catch (error) {
    console.error("Cartoon generation failed", error);
    await rm(outputPath, { force: true });
    job.status = "failed";
    job.error = error instanceof Error && error.message === "Video must be 1 minute or shorter."
      ? error.message : "This video could not be processed. Try another MP4 or MOV file.";
  } finally {
    if (!succeeded) releaseGenerationSlot(job.clientKey, today);
    await rm(job.inputPath, { force: true });
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

router.post("/cartoon-videos/upload/init", express.json({ limit: "10kb" }), async (req, res) => {
  const size = Number(req.body?.size);
  if (!Number.isSafeInteger(size) || size <= 0 || size > maxVideoBytes) {
    res.status(413).json({ error: "Video must be 100 MB or smaller." });
    return;
  }
  await removeExpiredGeneratedVideos();
  const session = await createUploadSession(req, size);
  res.status(201).json({ uploadId: session.id, chunkSize: uploadChunkBytes, totalBytes: size });
});

router.post(
  "/cartoon-videos/upload/:uploadId/chunk",
  express.raw({ type: "*/*", limit: "2mb" }),
  async (req, res) => {
    const session = uploads.get(req.params.uploadId);
    const { clientKey } = getAuthClientKey(req);
    const chunkIndex = Number(req.header("X-Chunk-Index"));
    const offset = Number(req.header("X-Chunk-Offset"));
    const input = req.body;
    if (!session || session.clientKey !== clientKey) {
      res.status(404).json({ error: "Upload session not found or expired. Please start again." });
      return;
    }
    if (!Buffer.isBuffer(input) || input.length === 0 || input.length > uploadChunkBytes ||
        !Number.isSafeInteger(chunkIndex) || chunkIndex !== session.nextChunk ||
        !Number.isSafeInteger(offset) || offset !== session.received ||
        session.received + input.length > session.size) {
      await removeUpload(session);
      res.status(400).json({ error: "Invalid upload chunk order or size. Please start again." });
      return;
    }
    try {
      await appendFile(session.inputPath, input);
      session.received += input.length;
      session.nextChunk += 1;
      refreshUploadExpiry(session);
      res.json({ receivedBytes: session.received });
    } catch {
      await removeUpload(session);
      res.status(500).json({ error: "The video upload failed. Please try again." });
    }
  },
);

router.post("/cartoon-videos/upload/:uploadId/complete", express.json({ limit: "10kb" }), async (req, res) => {
  const { clientKey } = getAuthClientKey(req);
  const existingJob = jobs.get(req.params.uploadId);
  if (existingJob) {
    if (existingJob.clientKey !== clientKey) {
      res.status(404).json({ error: "Upload session not found or expired. Please start again." });
      return;
    }
    res.status(existingJob.status === "processing" ? 202 : 200).json(jobResponse(existingJob));
    return;
  }
  const session = uploads.get(req.params.uploadId);
  if (!session || session.clientKey !== clientKey) {
    res.status(404).json({ error: "Upload session not found or expired. Please start again." });
    return;
  }
  if (session.received !== session.size) {
    await removeUpload(session);
    res.status(400).json({ error: "The video upload is incomplete. Please try again." });
    return;
  }
  await removeUpload(session, false);
  const inputPath = path.join(generatedDirectory, `${session.id}-input`);
  const { userId } = getAuth(req);
  const timer = setTimeout(() => {
    const current = jobs.get(session.id);
    if (current) expireJob(current);
  }, generatedLifetimeMs + uploadLifetimeMs);
  timer.unref();
  const job: CartoonJob = {
    id: session.id,
    inputPath,
    clientKey,
    userId: userId ?? null,
    status: "processing",
    timer,
  };
  jobs.set(job.id, job);
  res.status(202).json(jobResponse(job));
  void runCartoonJob(job);
});

router.get("/cartoon-videos/upload/:uploadId/status", async (req, res) => {
  const job = jobs.get(req.params.uploadId);
  const { clientKey } = getAuthClientKey(req);
  if (!job || job.clientKey !== clientKey) {
    res.status(404).json({ error: "Cartoon processing job not found or expired." });
    return;
  }
  res.status(job.status === "processing" ? 202 : 200).json(jobResponse(job));
});

router.post("/cartoon-videos/generate", express.raw({ type: "video/*", limit: "100mb" }), async (req, res) => {
  const input = req.body;
  if (!Buffer.isBuffer(input) || input.length === 0) {
    res.status(400).json({ error: "A video file is required." });
    return;
  }
  if (input.length > maxVideoBytes) {
    res.status(413).json({ error: "Video must be 100 MB or smaller." });
    return;
  }
  const { clientKey } = getAuthClientKey(req);
  await mkdir(generatedDirectory, { recursive: true });
  const inputPath = path.join(generatedDirectory, `${randomUUID()}-input`);
  await writeFile(inputPath, input);
  await finishGeneration(req, res, inputPath, clientKey);
});

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