import { GetCartoonVideoResponse } from "@workspace/api-zod";

export const cartoonVideos = [
  GetCartoonVideoResponse.parse({
    id: "gamezone-buddy",
    title: "Meet Gamezone Buddy",
    thumbnailUrl: "/api/cartoon-videos/media/gamezone-buddy.png",
    videoUrl: "/api/cartoon-videos/media/gamezone-buddy.mp4",
    description:
      "Meet Gamezone Buddy, an original character created for GAMEZONE ARENA. This short animation is owned by the project and safe to feature in the app.",
    category: "Gamezone Original",
    durationSeconds: 8,
    license: "Original GAMEZONE ARENA content",
    sourceUrl: "/api/cartoon-videos/media/gamezone-buddy.mp4",
  }),
] as const;