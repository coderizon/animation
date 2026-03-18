import { useMemo, useState } from 'react';
import { useDrag } from 'react-dnd';
import { LogoAsset } from '../../types/animation';
import { getAllWidgets } from '../../widgets/registry';
import { WidgetRegistryEntry } from '../../widgets/types';

const svgModules = import.meta.glob('/public/assets/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const autoLogos: LogoAsset[] = Object.entries(svgModules).map(([path, url]) => {
  const filename = path.split('/').pop()!.replace('.svg', '');
  const name = filename
    .replace(/-color$/, '')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return { id: filename, name, src: url };
});

interface AssetLibraryProps {
  activeView: 'logos' | 'widgets';
  onChangeView: (view: 'logos' | 'widgets') => void;
}

const DraggableLogo: React.FC<{ asset: LogoAsset }> = ({ asset }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'ASSET',
    item: {
      type: 'ASSET',
      elementType: 'logo',
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
        backgroundColor: '#f8fafc',
        border: '1px solid #e4e7ec',
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
        e.currentTarget.style.borderColor = '#98a2b3';
        e.currentTarget.style.backgroundColor = '#ffffff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e4e7ec';
        e.currentTarget.style.backgroundColor = '#f8fafc';
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
      <span style={{
        fontSize: 10,
        fontWeight: 600,
        color: '#344054',
        textAlign: 'center',
        lineHeight: 1.25,
      }}>
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
        backgroundColor: '#f8fafc',
        border: '1px solid #e4e7ec',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 10,
        transition: 'all 0.2s',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#98a2b3';
        e.currentTarget.style.backgroundColor = '#ffffff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e4e7ec';
        e.currentTarget.style.backgroundColor = '#f8fafc';
      }}
    >
      <div style={{
        width: 54,
        height: 34,
        backgroundColor: '#111827',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#8ddcff',
        fontWeight: 700,
        fontSize: 18,
      }}>
        {entry.icon}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#101828' }}>
          {entry.displayName}
        </span>
        <span style={{ fontSize: 11, color: '#667085', lineHeight: 1.35 }}>
          {entry.description}
        </span>
      </div>
    </div>
  );
};

export const AssetLibrary: React.FC<AssetLibraryProps> = ({ activeView, onChangeView }) => {
  const [search, setSearch] = useState('');

  const filteredLogos = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return autoLogos;
    return autoLogos.filter((asset) => asset.name.toLowerCase().includes(normalizedSearch));
  }, [search]);

  const widgets = getAllWidgets();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <div style={{
        padding: 14,
        borderRadius: 14,
        backgroundColor: '#ffffff',
        border: '1px solid #e4e7ec',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#101828' }}>Insert Library</div>
          <div style={{ fontSize: 12, color: '#667085', marginTop: 4 }}>
            Formen, Text und Bilder liegen jetzt oben im Ribbon. Hier bleiben nur die groesseren Bibliotheken.
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 8,
        }}>
          {([
            { id: 'logos', label: 'Logos', hint: `${autoLogos.length} Assets` },
            { id: 'widgets', label: 'Widgets', hint: `${widgets.length} Presets` },
          ] as const).map((view) => {
            const isActive = activeView === view.id;
            return (
              <button
                key={view.id}
                onClick={() => onChangeView(view.id)}
                style={{
                  borderRadius: 12,
                  border: isActive ? '1px solid #111827' : '1px solid #e4e7ec',
                  backgroundColor: isActive ? '#111827' : '#f8fafc',
                  color: isActive ? '#ffffff' : '#344054',
                  padding: '10px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700 }}>{view.label}</span>
                <span style={{ fontSize: 11, opacity: isActive ? 0.78 : 0.72 }}>{view.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeView === 'logos' && (
        <div style={{
          padding: 14,
          borderRadius: 14,
          backgroundColor: '#ffffff',
          border: '1px solid #e4e7ec',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          minHeight: 0,
          flex: 1,
        }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Logos suchen"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #d0d5dd',
              backgroundColor: '#f8fafc',
              color: '#101828',
              fontSize: 13,
              outline: 'none',
            }}
          />

          <div style={{ fontSize: 12, color: '#667085' }}>
            {filteredLogos.length} Treffer. Ziehe ein Logo auf den Canvas.
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 8,
            overflowY: 'auto',
            paddingRight: 2,
          }}>
            {filteredLogos.map((logo) => (
              <DraggableLogo key={logo.id} asset={logo} />
            ))}
          </div>
        </div>
      )}

      {activeView === 'widgets' && (
        <div style={{
          padding: 14,
          borderRadius: 14,
          backgroundColor: '#ffffff',
          border: '1px solid #e4e7ec',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          minHeight: 0,
          flex: 1,
        }}>
          <div style={{ fontSize: 12, color: '#667085' }}>
            Ziehe ein Widget auf den Canvas oder fuege es oben im Ribbon direkt ein.
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
            gap: 10,
            overflowY: 'auto',
            paddingRight: 2,
          }}>
            {widgets.map((entry) => (
              <DraggableWidget key={entry.name} entry={entry} />
            ))}
          </div>
        </div>
      )}

      <div style={{
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#eef2ff',
        color: '#4338ca',
        fontSize: 11,
        lineHeight: 1.5,
      }}>
        Tipp: Ribbon fuer schnelles Einfuegen, Bibliothek fuer stoerungsfreie Auswahl und Drag-and-drop.
      </div>
    </div>
  );
};
