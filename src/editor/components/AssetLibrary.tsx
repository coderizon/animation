import { useEffect, useMemo, useRef, useState } from 'react';
import { useDrag } from 'react-dnd';
import { LogoAsset } from '../../types/animation';
import { getAllWidgets } from '../../widgets/registry';
import { WidgetRegistryEntry } from '../../widgets/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const svgModules = import.meta.glob('/public/assets/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const imageModules = import.meta.glob('/public/images/*.{png,jpg,jpeg,gif,webp,svg}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

interface ImageAsset {
  id: string;
  name: string;
  src: string;
}

const autoImages: ImageAsset[] = Object.entries(imageModules)
  .map(([path, url]) => {
    const filename = path.split('/').pop()!;
    const name = filename.replace(/\.[^.]+$/, '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return { id: filename, name, src: url };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const autoLogos: LogoAsset[] = Object.entries(svgModules)
  .map(([path, url]) => {
    const filename = path.split('/').pop()!.replace('.svg', '');
    const name = filename
      .replace(/-color$/, '')
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return { id: filename, name, src: url };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

interface AssetLibraryProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  activeView: 'logos' | 'widgets' | 'images';
  onChangeView: (view: 'logos' | 'widgets' | 'images') => void;
  onClose: () => void;
}

const DraggableLogo: React.FC<{ asset: LogoAsset }> = ({ asset }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'ASSET',
    item: {
      type: 'ASSET',
      elementType: 'logo',
      name: asset.name,
      content: {
        type: 'logo',
        src: asset.src,
        alt: asset.name,
      },
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
        padding: 12,
        backgroundColor: 'var(--ae-bg-input)',
        border: '1px solid var(--ae-border)',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        transition: 'all 0.2s',
        userSelect: 'none',
        minHeight: 92,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--ae-border-strong)';
        e.currentTarget.style.backgroundColor = 'var(--ae-bg-panel-raised)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--ae-border)';
        e.currentTarget.style.backgroundColor = 'var(--ae-bg-input)';
      }}
    >
      <img
        src={asset.src}
        alt={asset.name}
        style={{
          width: 48,
          height: 48,
          objectFit: 'contain',
          pointerEvents: 'none',
        }}
      />
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--ae-text-primary)',
          textAlign: 'center',
          lineHeight: 1.25,
        }}
      >
        {asset.name}
      </span>
    </div>
  );
};

const DraggableImage: React.FC<{ asset: ImageAsset }> = ({ asset }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'ASSET',
    item: {
      type: 'ASSET',
      elementType: 'image',
      name: asset.name,
      content: {
        type: 'image',
        src: asset.src,
        alt: asset.name,
      },
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
        padding: 8,
        backgroundColor: 'var(--ae-bg-input)',
        border: '1px solid var(--ae-border)',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.2s',
        userSelect: 'none',
        minHeight: 92,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--ae-border-strong)';
        e.currentTarget.style.backgroundColor = 'var(--ae-bg-panel-raised)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--ae-border)';
        e.currentTarget.style.backgroundColor = 'var(--ae-bg-input)';
      }}
    >
      <img
        src={asset.src}
        alt={asset.name}
        style={{
          width: '100%',
          height: 56,
          objectFit: 'cover',
          borderRadius: 6,
          pointerEvents: 'none',
        }}
      />
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--ae-text-primary)', textAlign: 'center', lineHeight: 1.25 }}>
        {asset.name}
      </span>
    </div>
  );
};

const DraggableWidget: React.FC<{ entry: WidgetRegistryEntry }> = ({ entry }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'ASSET',
    item: {
      type: 'ASSET',
      elementType: 'widget' as const,
      name: entry.displayName || entry.name,
      content: {
        type: 'widget',
        widgetName: entry.name,
        fps: entry.defaultFps,
        durationInFrames: entry.defaultDurationInFrames,
      },
      defaultWidth: entry.defaultElementWidth,
      defaultHeight: entry.defaultElementHeight,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
        padding: 14,
        backgroundColor: 'var(--ae-bg-input)',
        border: '1px solid var(--ae-border)',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 10,
        transition: 'all 0.2s',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--ae-border-strong)';
        e.currentTarget.style.backgroundColor = 'var(--ae-bg-panel-raised)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--ae-border)';
        e.currentTarget.style.backgroundColor = 'var(--ae-bg-input)';
      }}
    >
      <div
        style={{
          width: 54,
          height: 34,
          backgroundColor: 'var(--ae-bg-shell)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ae-accent-strong)',
          fontWeight: 700,
          fontSize: 18,
        }}
      >
        <FontAwesomeIcon icon={entry.icon} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ae-text-primary)' }}>
          {entry.displayName}
        </span>
        <span style={{ fontSize: 11, color: 'var(--ae-text-secondary)', lineHeight: 1.35 }}>
          {entry.description}
        </span>
      </div>
    </div>
  );
};

export const AssetLibrary: React.FC<AssetLibraryProps> = ({
  anchorRef,
  isOpen,
  activeView,
  onChangeView,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const anchorNode = anchorRef.current;

      if (popoverRef.current?.contains(target)) return;
      if (anchorNode?.contains(target)) return;
      onClose();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [anchorRef, isOpen, onClose]);

  const filteredLogos = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return autoLogos;
    return autoLogos.filter((asset) => asset.name.toLowerCase().includes(normalizedSearch));
  }, [search]);

  const widgets = getAllWidgets();

  if (!isOpen || !anchorRef.current) return null;

  const width = activeView === 'logos' ? 520 : activeView === 'images' ? 520 : 440;
  const rect = anchorRef.current.getBoundingClientRect();
  const left = Math.min(Math.max(rect.right - width, 12), window.innerWidth - width - 12);
  const top = rect.bottom + 10;

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top,
        left,
        width,
        maxHeight: '72vh',
        overflow: 'hidden',
        backgroundColor: 'var(--ae-bg-panel)',
        border: '1px solid var(--ae-border)',
        borderRadius: 18,
        boxShadow: 'var(--ae-shadow-floating)',
        zIndex: 1250,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: 18,
          borderBottom: '1px solid var(--ae-border)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ae-text-primary)' }}>Bibliothek</div>
            <div style={{ fontSize: 12, color: 'var(--ae-text-secondary)', marginTop: 4 }}>
              Ziehe Elemente direkt auf den Canvas. Die linke Leiste ist jetzt frei.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {([
              { id: 'logos' as const, label: 'Logos', hint: `${autoLogos.length} Assets` },
              { id: 'images' as const, label: 'Bilder', hint: `${autoImages.length} Dateien` },
              { id: 'widgets' as const, label: 'Widgets', hint: `${widgets.length} Presets` },
            ]).map((view) => {
              const isActive = activeView === view.id;
              return (
                <button
                  key={view.id}
                  onClick={() => onChangeView(view.id)}
                  style={{
                    borderRadius: 12,
                    border: isActive ? '1px solid var(--ae-accent)' : '1px solid var(--ae-border)',
                    backgroundColor: isActive ? 'var(--ae-accent-overlay)' : 'var(--ae-bg-input)',
                    color: isActive ? 'var(--ae-accent-strong)' : 'var(--ae-text-primary)',
                    padding: '10px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    minWidth: 120,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{view.label}</span>
                  <span style={{ fontSize: 11, opacity: isActive ? 0.82 : 0.72 }}>{view.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            border: '1px solid var(--ae-border)',
            backgroundColor: 'var(--ae-bg-panel-raised)',
            color: 'var(--ae-text-secondary)',
            fontSize: 18,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      {activeView === 'logos' && (
        <div
          style={{
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minHeight: 0,
            flex: 1,
          }}
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Logos suchen"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid var(--ae-border)',
              backgroundColor: 'var(--ae-bg-input)',
              color: 'var(--ae-text-primary)',
              fontSize: 13,
              outline: 'none',
            }}
          />

          <div style={{ fontSize: 12, color: 'var(--ae-text-secondary)' }}>
            {filteredLogos.length} Treffer. Ziehe ein Logo auf den Canvas.
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 8,
              overflowY: 'auto',
              paddingRight: 4,
              minHeight: 0,
              flex: 1,
            }}
          >
            {filteredLogos.map((logo) => (
              <DraggableLogo key={logo.id} asset={logo} />
            ))}
          </div>
        </div>
      )}

      {activeView === 'images' && (
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--ae-text-secondary)' }}>
            {autoImages.length > 0
              ? `${autoImages.length} Bilder. Ziehe ein Bild auf den Canvas.`
              : 'Lege Bilder in /public/images/ ab und starte den Dev-Server neu.'}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 8,
            overflowY: 'auto',
            paddingRight: 4,
            minHeight: 0,
            flex: 1,
          }}>
            {autoImages.map((img) => (
              <DraggableImage key={img.id} asset={img} />
            ))}
          </div>
        </div>
      )}

      {activeView === 'widgets' && (
        <div
          style={{
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minHeight: 0,
            flex: 1,
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--ae-text-secondary)' }}>
            Ziehe ein Widget auf den Canvas oder fuege es im Ribbon direkt ein.
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
              gap: 10,
              overflowY: 'auto',
              paddingRight: 4,
              minHeight: 0,
              flex: 1,
            }}
          >
            {widgets.map((entry) => (
              <DraggableWidget key={entry.name} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
