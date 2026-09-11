import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  Repeat,
  Volume2,
  VolumeX,
} from 'lucide-react';

import VideoTemplate, { SCENE_DURATIONS } from './VideoTemplate';
import { useSceneControls } from './useSceneControls';

const SCENE_DETAILS: Record<string, { title: string; filePath: string }> = {
  hero: { title: 'Arena Reveal', filePath: 'src/components/video/video_scenes/Scene1_Hero.tsx' },
  games: { title: 'Games and Ludo', filePath: 'src/components/video/video_scenes/Scene2_Games.tsx' },
  profiles: { title: 'Profiles and Friends', filePath: 'src/components/video/video_scenes/Scene3_Profiles.tsx' },
  rewards: { title: 'Rewards and Maps', filePath: 'src/components/video/video_scenes/Scene4_Rewards.tsx' },
  performance: { title: 'Release Improvements', filePath: 'src/components/video/video_scenes/Scene5_Performance.tsx' },
  outro: { title: 'Final Lockup', filePath: 'src/components/video/video_scenes/Scene6_Outro.tsx' },
};

const PROGRESS_TICK_MS = 60;

function formatTime(durationMs: number) {
  const seconds = Math.max(0, Math.floor(durationMs / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function PlaybackStatus({
  sceneKeys,
  activeIndex,
  activeDuration,
  activeStartTime,
  totalDuration,
  tick,
  paused,
  onJumpTo,
}: {
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  activeStartTime: number;
  totalDuration: number;
  tick: number;
  paused: boolean;
  onJumpTo: (index: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const elapsedBaseRef = useRef(0);

  useEffect(() => {
    setElapsed(0);
    elapsedBaseRef.current = 0;
  }, [tick]);

  useEffect(() => {
    if (paused) return;
    const start = performance.now();
    const id = window.setInterval(() => {
      setElapsed(elapsedBaseRef.current + performance.now() - start);
    }, PROGRESS_TICK_MS);
    return () => {
      window.clearInterval(id);
      elapsedBaseRef.current += performance.now() - start;
    };
  }, [paused, tick]);

  const progress = activeDuration ? Math.min(1, elapsed / activeDuration) : 0;
  const totalElapsed = Math.min(totalDuration, activeStartTime + Math.min(elapsed, activeDuration));

  return (
    <>
      <div className="flex flex-1 items-center gap-1.5">
        {sceneKeys.map((key, index) => (
          <button
            key={key}
            type="button"
            onClick={() => onJumpTo(index)}
            className="relative h-3 min-h-3 flex-1 cursor-pointer overflow-hidden rounded-full bg-white/20 transition-all hover:h-4"
            aria-label={`Jump to scene ${index + 1}`}
          >
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-cyan-300"
              style={{ width: `${index === activeIndex ? progress * 100 : 0}%` }}
            />
          </button>
        ))}
      </div>
      <span className="shrink-0 font-mono text-lg text-white/70">
        {activeIndex + 1}/{sceneKeys.length}
      </span>
      <span className="min-w-[11ch] shrink-0 text-right font-mono text-lg text-white/80">
        {formatTime(totalElapsed)} / {formatTime(totalDuration)}
      </span>
    </>
  );
}

export default function VideoWithControls() {
  const isIframed = typeof window !== 'undefined' && window.self !== window.top;
  const controls = useSceneControls(SCENE_DURATIONS);
  const [muted, setMuted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);

  const jumpTo = useCallback(
    (index: number) => {
      controls.jumpTo(index);
      const key = controls.sceneKeys[index];
      const details = SCENE_DETAILS[key];
      if (!details) return;
      window.parent.postMessage(
        {
          type: 'REPLIT_VIDEO_SCENE_SELECTED',
          payload: {
            sceneIndex: index,
            sceneCount: controls.sceneKeys.length,
            sceneTitle: details.title,
            filePath: details.filePath,
            lineNumber: 1,
          },
        },
        '*',
      );
    },
    [controls],
  );

  useEffect(() => {
    if (!controls.paused) return;
    const animations = document
      .getAnimations()
      .filter((animation) => animation.playState === 'running');
    animations.forEach((animation) => animation.pause());
    return () => animations.forEach((animation) => animation.play());
  }, [controls.paused]);

  if (!isIframed) return <VideoTemplate />;

  const barVisible = !collapsed || hovering;

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <VideoTemplate
        key={controls.mountKey}
        durations={controls.durations}
        paused={controls.paused}
        muted={muted}
        onSceneChange={controls.onSceneChange}
      />
      <div
        className="absolute inset-x-0 bottom-0 z-[100] flex h-1/4 flex-col justify-end"
        onPointerEnter={() => setHovering(true)}
        onPointerLeave={() => setHovering(false)}
      >
        <div className="flex-1" />
        <div
          className={`flex items-center gap-3 bg-black/65 px-5 py-4 backdrop-blur-md transition-all duration-200 ${
            barVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
          }`}
        >
          <button type="button" onClick={controls.togglePause} className="grid h-12 w-12 shrink-0 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white" aria-label={controls.paused ? 'Play' : 'Pause'}>
            {controls.paused ? <Play /> : <Pause />}
          </button>
          <button type="button" onClick={controls.toggleLock} className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg ${controls.locked ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10'}`} aria-label="Loop current scene">
            <Repeat />
          </button>
          <button type="button" onClick={() => setMuted((value) => !value)} className="grid h-12 w-12 shrink-0 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white" aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? <VolumeX /> : <Volume2 />}
          </button>
          <div className="h-10 w-px bg-white/15" />
          <PlaybackStatus
            sceneKeys={controls.sceneKeys}
            activeIndex={controls.activeIndex}
            activeDuration={controls.activeDuration}
            activeStartTime={controls.activeStartTime}
            totalDuration={controls.totalDuration}
            tick={controls.tick}
            paused={controls.paused}
            onJumpTo={jumpTo}
          />
          <button type="button" onClick={() => setCollapsed((value) => !value)} className="grid h-12 w-12 shrink-0 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white" aria-label={collapsed ? 'Show controls' : 'Hide controls'}>
            {collapsed ? <ChevronUp /> : <ChevronDown />}
          </button>
        </div>
      </div>
    </div>
  );
}