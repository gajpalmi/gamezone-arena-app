import express, { Router, type IRouter } from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  GetCartoonVideoParams,
  GetCartoonVideoResponse,
  ListCartoonVideosQueryParams,
  ListCartoonVideosResponse,
} from "@workspace/api-zod";
import { cartoonVideos } from "../data/cartoonVideos";

const router: IRouter = Router();
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