import {
  VideoPausedContext,
  VideoCanvas,
  type VideoAspectRatio,
  useVideoPlayer,
} from '@/lib/video';
import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { Scene1_Hero } from './video_scenes/Scene1_Hero';
import { Scene2_Games } from './video_scenes/Scene2_Games';
import { Scene3_Profiles } from './video_scenes/Scene3_Profiles';
import { Scene4_Rewards } from './video_scenes/Scene4_Rewards';
import { Scene5_Performance } from './video_scenes/Scene5_Performance';
import { Scene6_Outro } from './video_scenes/Scene6_Outro';

export const SCENE_DURATIONS = {
  hero: 4000,
  games: 5000,
  profiles: 4500,
  rewards: 4500,
  performance: 5000,
  outro: 4000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  hero: Scene1_Hero,
  games: Scene2_Games,
  profiles: Scene3_Profiles,
  rewards: Scene4_Rewards,
  performance: Scene5_Performance,
  outro: Scene6_Outro,
};

const SCENE_START_SEC = (() => {
  const offsets: Record<string, number> = {};
  let cumulativeMs = 0;
  Object.entries(SCENE_DURATIONS).forEach(([key, duration]) => {
    offsets[key] = cumulativeMs / 1000;
    cumulativeMs += duration;
  });
  return offsets;
})();

const VIDEO_ASPECT_RATIO: VideoAspectRatio = '16:9';

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  paused = false,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  paused?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop, paused });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSceneKeyRef = useRef<string | null>(null);
  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.45;
    if (paused) {
      audio.pause();
      return;
    }
    if (lastSceneKeyRef.current !== currentSceneKey) {
      lastSceneKeyRef.current = currentSceneKey;
      const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
      if (Math.abs(audio.currentTime - targetTime) > 0.18) {
        audio.currentTime = targetTime;
      }
    }
    audio.play().catch(() => {});
  }, [baseSceneKey, currentSceneKey, muted, paused]);

  return (
    <VideoPausedContext.Provider value={paused}>
    <VideoCanvas
      aspectRatio={VIDEO_ASPECT_RATIO}
      style={{ backgroundColor: 'var(--color-brand-bg)', overflow: 'hidden' }}
    >
      {/* Persistent Background Layer */}
      <motion.div
        className="absolute inset-0 z-0 opacity-40 bg-cover bg-center mix-blend-screen"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/arena-bg.jpg)` }}
        animate={{
          scale: [1, 1.1, 1.05, 1.15, 1.1, 1],
          opacity: [0.3, 0.5, 0.4, 0.6, 0.4, 0.3]
        }}
        transition={{ duration: 27, ease: "linear" }}
      />
      
      {/* Persistent Noise Overlay */}
      <div 
        className="absolute inset-0 z-50 pointer-events-none opacity-20 mix-blend-overlay"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      />

      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>
      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
      />
    </VideoCanvas>
    </VideoPausedContext.Provider>
  );
}
