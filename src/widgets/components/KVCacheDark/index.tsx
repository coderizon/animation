import React from 'react';
import { WidgetComponentProps, WidgetRegistryEntry } from '../../types';
import { faMemory } from '@fortawesome/free-solid-svg-icons';

const P = 128; // total pages per side
const BLOCKS_PER_ROW = 16;

// Person SVG icon
const PersonIcon: React.FC<{ color: string; opacity?: number }> = ({ color, opacity = 1 }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={color} opacity={opacity} style={{ flexShrink: 0 }}>
    <circle cx="12" cy="7" r="4" />
    <path d="M12 13c-4.42 0-8 1.79-8 4v1h16v-1c0-2.21-3.58-4-8-4z" />
  </svg>
);

// Ollama timeline events (all times in seconds relative to showColors start)
// Person 1: blue
// Person 2: purple
const P1_COLOR = '#3b82f6';
const P1_LIGHT = '#3b82f620';
const P1_PREALLOC = '#1a2a4a'; // dark blue tint for pre-alloc
const P2_COLOR = '#a855f7';
const P2_LIGHT = '#a855f720';
const P2_PREALLOC = '#2a1a3a'; // dark purple tint for pre-alloc

const KVCacheDark: React.FC<WidgetComponentProps> = ({ width, height, frame, fps }) => {
  const timeSec = frame / fps;

  // === PHASES ===
  const phase1End = 2;   // 0-2s: only border + title
  const phase2End = 4;   // 2-4s: grid appears in gray
  const showGrid = timeSec >= phase1End;
  const showColors = timeSec >= phase2End;
  const gridOpacity = !showGrid ? 0 : Math.min(1, (timeSec - phase1End) / 0.6);

  // Ollama scripted timeline (relative to phase2End)
  const ot = showColors ? timeSec - phase2End : -1;

  // Person 1 (blue) appears at t=0.5, starts filling immediately
  const p1Visible = ot >= 0.5;
  const p1PreAlloc = ot >= 1.0;
  const p1FillStart = 1.5;
  const p1FillCount = ot >= p1FillStart ? Math.min(12, Math.floor((ot - p1FillStart) / 0.15)) : 0;

  // Person 2 (purple) appears shortly after at t=1.5, fills in parallel
  const p2Visible = ot >= 1.5;
  const p2PreAlloc = ot >= 2.0;
  const p2FillStart = 2.5;
  const p2FillCount = ot >= p2FillStart ? Math.min(20, Math.floor((ot - p2FillStart) / 0.13)) : 0;

  // Person 3 (pink) appears shortly after at t=2.5, fills in parallel
  const P3_COLOR = '#ec4899';
  const P3_PREALLOC = '#3a1a2a';
  const p3Visible = ot >= 2.5;
  const p3PreAlloc = ot >= 3.0;
  const p3FillStart = 3.5;
  const p3FillCount = ot >= p3FillStart ? Math.min(18, Math.floor((ot - p3FillStart) / 0.14)) : 0;

  // Stats
  const ollamaUsed = p1FillCount + p2FillCount + p3FillCount;
  const ollamaPreAlloc = (p1PreAlloc ? 32 : 0) + (p2PreAlloc ? 32 : 0) + (p3PreAlloc ? 32 : 0);
  const ollamaUtil = ollamaPreAlloc > 0 ? Math.round(ollamaUsed / P * 100) : 0;
  const ollamaActive = (p1Visible ? 1 : 0) + (p2Visible ? 1 : 0) + (p3Visible ? 1 : 0);

  // vLLM side - keep simulation simple for now (prefix cache visible)
  const vllmPrefixCount = 8;

  // Dark theme colors
  const bgCell = '#0a0a0a';
  const borderCell = '#ffffff44';
  const textPrimary = '#ffffff';
  const textSecondary = '#cccccc';
  const textMuted = '#999999';
  const accentVLLM = '#00ffcc';
  const accentOllama = '#fbbf24';

  const renderOllamaGrid = () => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${BLOCKS_PER_ROW}, 1fr)`, gap: 2 }}>
      {Array.from({ length: P }, (_, i) => {
        let bg = '#333333'; // graue Blöcke bleiben als Default

        if (showColors) {
          // Slot 0: Person 1 (blocks 0-31)
          if (i < 32) {
            if (p1PreAlloc) {
              bg = i < p1FillCount ? P1_COLOR : P1_PREALLOC;
            }
          }
          // Slot 1: Person 2 (blocks 32-63)
          else if (i < 64) {
            if (p2PreAlloc) {
              bg = (i - 32) < p2FillCount ? P2_COLOR : P2_PREALLOC;
            }
          }
          // Slot 2: Person 3 (blocks 64-95)
          else if (i < 96) {
            if (p3PreAlloc) {
              bg = (i - 64) < p3FillCount ? P3_COLOR : P3_PREALLOC;
            }
          }
          // Rest: nicht erreichbar
          else {
            bg = '#0d0d0d';
          }
        }

        return <div key={i} style={{ height: 11, borderRadius: 2, background: bg, transition: 'background .3s' }} />;
      })}
    </div>
  );

  const renderVLLMGrid = () => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${BLOCKS_PER_ROW}, 1fr)`, gap: 2 }}>
      {Array.from({ length: P }, (_, i) => {
        let bg = bgCell;
        if (!showColors) {
          bg = '#333333';
        } else if (i < vllmPrefixCount) {
          bg = '#4a7fcc'; // shared prefix
        }
        return <div key={i} style={{ height: 11, borderRadius: 2, background: bg, transition: 'background .3s' }} />;
      })}
    </div>
  );

  // Persons display for Ollama
  const renderPersons = () => (
    <div style={{ minHeight: 25, display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5 }}>
      {p1Visible && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          opacity: p1Visible ? 1 : 0, transition: 'opacity 0.3s',
        }}>
          <PersonIcon color={P1_COLOR} />
          <span style={{ fontSize: 10, color: P1_COLOR, fontWeight: 700 }}>
            User 1 {p1FillCount > 0 ? `${Math.round(p1FillCount / 12 * 100)}%` : ''}
          </span>
        </div>
      )}
      {p2Visible && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          opacity: p2Visible ? 1 : 0, transition: 'opacity 0.3s',
        }}>
          <PersonIcon color={P2_COLOR} />
          <span style={{ fontSize: 10, color: P2_COLOR, fontWeight: 700 }}>
            User 2 {p2FillCount > 0 ? `${Math.round(p2FillCount / 20 * 100)}%` : ''}
          </span>
        </div>
      )}
      {p3Visible && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          opacity: p3Visible ? 1 : 0, transition: 'opacity 0.3s',
        }}>
          <PersonIcon color={P3_COLOR} />
          <span style={{ fontSize: 10, color: P3_COLOR, fontWeight: 700 }}>
            User 3 {p3FillCount > 0 ? `${Math.round(p3FillCount / 18 * 100)}%` : ''}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ width, height, background: 'transparent', borderRadius: 14, padding: 22, color: textPrimary, fontFamily: "'Courier New', monospace", border: '1px solid #ffffffaa', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: textSecondary, marginBottom: 16 }}>
        KV Cache · GPU Memory Simulation
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, flex: 1, opacity: gridOpacity, transition: 'opacity 0.5s' }}>
        {/* vLLM */}
        <div>
          <div style={{ height: 20, marginBottom: 7 }} />
          <div style={{ minHeight: 25, marginBottom: 5 }} />
          <div style={{ background: bgCell, border: `1px solid ${borderCell}`, borderRadius: 8, padding: 9, marginBottom: 7 }}>
            {renderVLLMGrid()}
            <div style={{ fontSize: 9, marginTop: 5, color: textMuted }}>
              {'\u25AA'} erste 8 Pages: Prefix cache — geteilt zwischen ALLEN Requests
            </div>
          </div>
          <div style={{ fontSize: 11, color: textSecondary, display: 'flex', gap: 10 }}>
            <span>util <span style={{ fontWeight: 700, fontSize: 12, color: accentVLLM }}>
              {showColors ? Math.round(vllmPrefixCount / P * 100) : 0}%
            </span></span>
            <span>aktiv <span style={{ fontWeight: 700, fontSize: 12, color: accentVLLM }}>0</span></span>
            <span>~<span style={{ fontWeight: 700, fontSize: 12, color: accentVLLM }}>0</span> tok/s</span>
          </div>
        </div>

        {/* Ollama */}
        <div>
          <div style={{ height: 20, marginBottom: 7 }} />
          {showColors ? renderPersons() : <div style={{ minHeight: 25, marginBottom: 5 }} />}
          <div style={{ background: bgCell, border: `1px solid ${borderCell}`, borderRadius: 8, padding: 9, marginBottom: 7 }}>
            {renderOllamaGrid()}
            <div style={{ fontSize: 9, marginTop: 5, color: textMuted }}>
              {'\u25AA'} 32 Pages pre-allokiert pro Session — Rest bleibt ungenutzt
            </div>
          </div>
          <div style={{ fontSize: 11, color: textSecondary, display: 'flex', gap: 10 }}>
            <span>util <span style={{ fontWeight: 700, fontSize: 12, color: accentOllama }}>{ollamaUtil}%</span></span>
            <span>aktiv <span style={{ fontWeight: 700, fontSize: 12, color: accentOllama }}>{ollamaActive}</span></span>
            <span>~<span style={{ fontWeight: 700, fontSize: 12, color: accentOllama }}>{ollamaActive * 8}</span> tok/s</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export const kvCacheDarkWidget: WidgetRegistryEntry = {
  name: 'kvCacheDark',
  displayName: 'KV Cache (Dark)',
  description: 'GPU Memory Simulation — schwarzes Design mit weißer Kontur',
  icon: faMemory,
  component: KVCacheDark,
  nativeWidth: 740,
  nativeHeight: 460,
  defaultFps: 12,
  defaultDurationInFrames: 360,
  defaultElementWidth: 740,
  defaultElementHeight: 460,
};
