import React from 'react';
import { WidgetComponentProps, WidgetRegistryEntry } from '../../types';
import { faTableCells } from '@fortawesome/free-solid-svg-icons';

const ALLTOKS48 = [
  'ich','frag','das','LLM','nach','dem','KV-','Cache',
  'wie','es','funk','tion','iert','end','K\u2081','V\u2081',
  'K\u2082','V\u2082','K\u2083','V\u2083','pro','mpt','sys','tem',
  'con','text','win','dow','att','head','lay','er',
  'norm','feed','fwd','res','id','ual','soft','max',
  'dot','prod','uct','scal','ed','next','tok','...',
];

const PageZoom: React.FC<WidgetComponentProps> = ({ width, height, frame }) => {
  const tf = frame % 48;
  const page = Math.floor(tf / 16);
  const slot = tf % 16;

  const renderCell = (idx: number, state: 'filled' | 'active' | 'empty' | 'prev') => {
    const tok = ALLTOKS48[idx % 48] || '\u00B7';
    const kn = idx + 1;
    const hasTok = state !== 'empty';

    const borderColor = state === 'active' ? '#6868c8' : state === 'filled' ? '#2a5040' : state === 'prev' ? '#2a4a38' : '#363660';
    const bg = state === 'active' ? '#242455' : state === 'filled' ? '#182820' : state === 'prev' ? '#141e14' : '#1a1a38';
    const shadow = state === 'active' ? '0 0 8px #6868d060' : 'none';
    const wordColor = state === 'active' ? '#a8a8f0' : state === 'filled' ? '#50b880' : state === 'prev' ? '#4a9068' : '#505078';
    const opacity = state === 'prev' ? 0.75 : 1;

    return (
      <div key={idx} style={{
        background: bg, border: `1px solid ${borderColor}`, borderRadius: 4,
        padding: '4px 2px', textAlign: 'center', boxShadow: shadow,
        transition: 'all .25s', minWidth: 0, opacity,
      }}>
        <div style={{ fontSize: 9, color: wordColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
          {hasTok ? tok : '\u00B7'}
        </div>
        <span style={{ fontSize: 8, color: hasTok ? '#a898f8' : '#303058', display: 'block' }}>
          {hasTok ? `K${kn}` : '\u00B7'}
        </span>
        <span style={{ fontSize: 8, color: hasTok ? '#f08888' : '#303058', display: 'block' }}>
          {hasTok ? `V${kn}` : '\u00B7'}
        </span>
      </div>
    );
  };

  const free = 16 - slot - 1;

  return (
    <div style={{ width, height, background: '#22224a', borderRadius: 14, padding: 22, color: '#d8d8f0', fontFamily: "'Courier New', monospace", border: '1px solid #3a3a66', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#7878c0', marginBottom: 4 }}>
        Page Zoom · Wie Token eine Page füllen
      </div>

      {/* Current page */}
      <div style={{ fontSize: 10, color: '#00ffcc', marginBottom: 2 }}>
        ▶ Page {page + 1} · aktiv
      </div>
      <div style={{ background: '#1a1a38', border: '1px solid #363660', borderRadius: 8, padding: 9 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 3 }}>
          {Array.from({ length: 16 }, (_, i) => {
            const ti = page * 16 + i;
            const state = i < slot ? 'filled' : i === slot ? 'active' : 'empty';
            return renderCell(ti, state);
          })}
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#8888b8', display: 'flex', gap: 14, alignItems: 'center' }}>
        <span>slot <span style={{ fontWeight: 700, color: '#00ffcc' }}>{slot + 1}</span>/16</span>
        <span style={{ color: '#6868a0' }}>{free > 0 ? `${free} Slots noch frei` : 'Page voll → neue Page startet'}</span>
      </div>

      {/* Previous page */}
      <div style={{ fontSize: 10, color: '#7878a8', marginTop: 6, marginBottom: 2 }}>
        {page === 0 ? '— noch keine vorherige Page' : `✓ Page ${page} · komplett (16/16)`}
      </div>
      <div style={{ background: '#1a1a38', border: '1px solid #363660', borderRadius: 8, padding: 9 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 3 }}>
          {Array.from({ length: 16 }, (_, i) => {
            if (page === 0) return renderCell(i, 'empty');
            const ti = (page - 1) * 16 + i;
            return renderCell(ti, 'prev');
          })}
        </div>
      </div>

      <div style={{ fontSize: 10, color: '#5858a0', marginTop: 4 }}>
        <span style={{ color: '#4aaa78' }}>■</span> gefüllt &nbsp;
        <span style={{ color: '#a0a0f0' }}>■</span> aktueller Token &nbsp;
        <span style={{ color: '#505080' }}>■</span> leer &nbsp;
        <span style={{ color: '#4a8a68', opacity: 0.8 }}>■</span> vorige Page (voll)
      </div>
    </div>
  );
};

export const pageZoomWidget: WidgetRegistryEntry = {
  name: 'pageZoom',
  displayName: 'Page Zoom',
  description: 'Zeigt wie Token eine KV-Cache Page füllen (Slot für Slot)',
  icon: faTableCells,
  component: PageZoom,
  nativeWidth: 740,
  nativeHeight: 520,
  defaultFps: 6,
  defaultDurationInFrames: 288,
  defaultElementWidth: 740,
  defaultElementHeight: 520,
};
