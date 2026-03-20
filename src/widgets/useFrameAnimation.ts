import { useState, useEffect, useRef, useCallback } from 'react';
import { useProjectStore } from '../store/useProjectStore';

interface UseFrameAnimationOptions {
  fps: number;
  durationInFrames: number;
  loop?: boolean;
}

interface FrameAnimationResult {
  frame: number;
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  reset: () => void;
}

export function useFrameAnimation(options: UseFrameAnimationOptions): FrameAnimationResult {
  const { fps, durationInFrames, loop = false } = options;
  const isPlayingAll = useProjectStore((state) => state.isPlayingAll);
  const playbackState = useProjectStore((state) => state.playbackState);
  const [frame, setFrame] = useState(0);
  const [localPlaying, setLocalPlaying] = useState(false);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const frameRef = useRef(0);

  const isPlaying = isPlayingAll || localPlaying;
  const msPerFrame = 1000 / fps;
  const wasPausedRef = useRef(false);

  // Track pause state so we know when resuming
  useEffect(() => {
    if (playbackState === 'paused') {
      wasPausedRef.current = true;
    } else if (playbackState === 'stopped') {
      wasPausedRef.current = false;
    }
  }, [playbackState]);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // Only reset to frame 0 on full stop, not on pause — freeze current frame
      if (playbackState === 'stopped') {
        setFrame(0);
        frameRef.current = 0;
      }
      return;
    }

    lastTimeRef.current = performance.now();
    // Only reset to frame 0 on fresh play, not when resuming from pause
    if (wasPausedRef.current) {
      // Resume: keep current frame, just continue the RAF loop
      wasPausedRef.current = false;
    } else {
      frameRef.current = 0;
      setFrame(0);
    }

    const tick = (now: number) => {
      const elapsed = now - lastTimeRef.current;
      if (elapsed >= msPerFrame) {
        const framesToAdvance = Math.floor(elapsed / msPerFrame);
        lastTimeRef.current += framesToAdvance * msPerFrame;
        frameRef.current += framesToAdvance;

        if (frameRef.current >= durationInFrames) {
          if (loop) {
            frameRef.current = frameRef.current % durationInFrames;
          } else {
            frameRef.current = durationInFrames - 1;
            setFrame(frameRef.current);
            return;
          }
        }
        setFrame(frameRef.current);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, fps, durationInFrames, loop, msPerFrame]);

  useEffect(() => {
    if (!isPlayingAll && localPlaying) {
      setLocalPlaying(false);
    }
  }, [isPlayingAll, localPlaying]);

  const play = useCallback(() => setLocalPlaying(true), []);
  const pause = useCallback(() => setLocalPlaying(false), []);
  const reset = useCallback(() => {
    frameRef.current = 0;
    setFrame(0);
  }, []);

  return { frame, isPlaying, play, pause, reset };
}
