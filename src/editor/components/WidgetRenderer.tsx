import { WidgetContent } from '../../types/project';
import { getWidget } from '../../widgets/registry';
import { useFrameAnimation } from '../../widgets/useFrameAnimation';

interface WidgetRendererProps {
  content: WidgetContent;
  width: number;
  height: number;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ content, width, height }) => {
  const entry = getWidget(content.widgetName);

  if (!entry) {
    return (
      <div style={{ color: '#ff5252', fontSize: 14, padding: 10 }}>
        Widget not found: {content.widgetName}
      </div>
    );
  }

  const { frame, isPlaying } = useFrameAnimation({
    fps: content.fps,
    durationInFrames: content.durationInFrames,
    loop: true,
  });

  const WidgetComponent = entry.component;
  const scaleX = width / entry.nativeWidth;
  const scaleY = height / entry.nativeHeight;

  return (
    <div style={{
      width: entry.nativeWidth,
      height: entry.nativeHeight,
      transform: `scale(${scaleX}, ${scaleY})`,
      transformOrigin: 'top left',
      overflow: 'hidden',
      pointerEvents: 'none',
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
  );
};
