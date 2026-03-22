import { WidgetContent } from '../../types/project';
import { getWidget } from '../../widgets/registry';
import { useFrameAnimation } from '../../widgets/useFrameAnimation';
import { useProjectStore } from '../../store/useProjectStore';
import { getAnimations } from '../../types/project';

interface WidgetRendererProps {
  content: WidgetContent;
  width: number;
  height: number;
  elementId?: string;
  /** Explicit currentTime from player (overrides store) */
  currentTimeOverride?: number;
  /** Explicit animation delay from player */
  delayOverride?: number;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ content, width, height, elementId, currentTimeOverride, delayOverride }) => {
  const entry = getWidget(content.widgetName);
  const storeCurrentTime = useProjectStore((s) => s.currentTime);
  const playbackState = useProjectStore((s) => s.playbackState);
  const isPlayingAll = useProjectStore((s) => s.isPlayingAll);
  const element = useProjectStore((s) => elementId ? s.project.elements.find(e => e.id === elementId) : undefined);

  if (!entry) {
    return (
      <div style={{ color: '#ff5252', fontSize: 14, padding: 10 }}>
        Widget not found: {content.widgetName}
      </div>
    );
  }

  // Determine currentTime and delay — player passes overrides, editor uses store
  const currentTime = currentTimeOverride ?? storeCurrentTime;
  const anims = element ? getAnimations(element) : [];
  const firstDelay = delayOverride ?? (anims.length > 0 ? Math.min(...anims.map(a => a.delay || 0)) : 0);

  const elapsedMs = Math.max(0, currentTime - firstDelay);
  const timeBasedFrame = Math.floor(elapsedMs / 1000 * content.fps);
  const clampedFrame = Math.min(Math.max(0, timeBasedFrame), content.durationInFrames - 1);

  // Fallback to RAF-based animation only when no timeline context
  const { frame: rafFrame, isPlaying: rafPlaying } = useFrameAnimation({
    fps: content.fps,
    durationInFrames: content.durationInFrames,
    loop: true,
  });

  // Use timeline-based frame when playing, paused, scrubbing, or when player provides override
  const hasOverride = currentTimeOverride !== undefined;
  const useTimeline = hasOverride || isPlayingAll || playbackState === 'paused' || currentTime > 0;
  const frame = useTimeline ? clampedFrame : rafFrame;
  const isPlaying = hasOverride || isPlayingAll || rafPlaying;

  const WidgetComponent = entry.component;
  const scaleX = width / entry.nativeWidth;
  const scaleY = height / entry.nativeHeight;

  return (
    <div style={{
      width,
      height,
      position: 'relative',
      overflow: 'hidden',
      pointerEvents: 'none',
    }}>
      <div style={{
        width: entry.nativeWidth,
        height: entry.nativeHeight,
        transform: `scale(${scaleX}, ${scaleY})`,
        transformOrigin: 'top left',
        position: 'absolute',
        top: 0,
        left: 0,
      }}>
        <WidgetComponent
          frame={frame}
          fps={content.fps}
          durationInFrames={content.durationInFrames}
          width={entry.nativeWidth}
          height={entry.nativeHeight}
          isPlaying={isPlaying}
          props={content.props}
        />
      </div>
    </div>
  );
};
