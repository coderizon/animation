import React from 'react';
import { WidgetComponentProps, WidgetRegistryEntry } from '../../types';
import { faMemory } from '@fortawesome/free-solid-svg-icons';

const P = 128; // total pages per side
const BLOCKS_PER_ROW = 16;
const SLOT_COUNT = 4;
const PAGES_PER_SLOT = 32;
const PREFIX_PAGES = 8; // vLLM shared prefix cache

// Person SVG icon
const PersonIcon: React.FC<{ color: string; opacity?: number }> = ({ color, opacity = 1 }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={color} opacity={opacity} style={{ flexShrink: 0 }}>
    <circle cx="12" cy="7" r="4" />
    <path d="M12 13c-4.42 0-8 1.79-8 4v1h16v-1c0-2.21-3.58-4-8-4z" />
  </svg>
);

// Request colors
const REQ_COLORS = ['#3b82f6', '#a855f7', '#ec4899', '#f97316', '#22c55e', '#06b6d4', '#f43f5e', '#e879f9', '#84cc16', '#fb923c'];
const PREALLOC_COLORS = ['#1a2a4a', '#2a1a3a', '#3a1a2a', '#3a2a1a', '#1a3a2a', '#1a2a3a', '#3a1a1a', '#2a1a3a', '#1a2a1a', '#3a2a1a'];

// ── Request definition ──
interface RequestDef {
  arriveAt: number;
  duration: number;
  maxFill: number;
}

// Ollama requests (relative to ot=0, i.e. timeSec=4)
const OLLAMA_REQUESTS: RequestDef[] = [
  { arriveAt: 0.5,  duration: 3.5, maxFill: 22 },
  { arriveAt: 1.0,  duration: 4.5, maxFill: 28 },
  { arriveAt: 1.5,  duration: 3.0, maxFill: 18 },
  { arriveAt: 2.0,  duration: 4.0, maxFill: 24 },
  { arriveAt: 3.0,  duration: 3.5, maxFill: 20 },
  { arriveAt: 3.8,  duration: 3.0, maxFill: 16 },
  { arriveAt: 5.0,  duration: 4.0, maxFill: 24 },
  { arriveAt: 7.0,  duration: 3.0, maxFill: 18 },
  { arriveAt: 8.5,  duration: 3.5, maxFill: 22 },
  { arriveAt: 10.0, duration: 3.0, maxFill: 16 },
  { arriveAt: 12.0, duration: 4.0, maxFill: 26 },
];

// vLLM requests (relative to vt=0, i.e. timeSec=14)
// More requests, shorter durations, higher throughput
const VLLM_REQUESTS: RequestDef[] = [
  { arriveAt: 0.3,  duration: 2.5, maxFill: 6 },
  { arriveAt: 0.6,  duration: 3.0, maxFill: 8 },
  { arriveAt: 1.0,  duration: 2.0, maxFill: 5 },
  { arriveAt: 1.3,  duration: 2.8, maxFill: 7 },
  { arriveAt: 1.8,  duration: 2.2, maxFill: 6 },
  { arriveAt: 2.2,  duration: 3.5, maxFill: 10 },
  { arriveAt: 2.8,  duration: 2.0, maxFill: 5 },
  { arriveAt: 3.2,  duration: 2.5, maxFill: 7 },
  { arriveAt: 3.8,  duration: 3.0, maxFill: 8 },
  { arriveAt: 4.3,  duration: 2.0, maxFill: 5 },
  { arriveAt: 4.8,  duration: 2.8, maxFill: 7 },
  { arriveAt: 5.5,  duration: 3.0, maxFill: 9 },
  { arriveAt: 6.2,  duration: 2.5, maxFill: 6 },
  { arriveAt: 7.0,  duration: 3.0, maxFill: 8 },
];

// ── Shared request state ──
interface ReqState {
  id: number;
  color: string;
  preAllocColor: string;
  arrived: boolean;
  active: boolean;
  queued: boolean;
  done: boolean;
  slot: number;
  fillCount: number;
  startedAt: number;
  progress: number;
}

// ── Ollama simulation (slot-based, pre-alloc) ──
function computeOllamaState(ot: number): { reqs: ReqState[]; slots: (number | null)[] } {
  const slots: (number | null)[] = new Array(SLOT_COUNT).fill(null);
  const reqs: ReqState[] = OLLAMA_REQUESTS.map((_, i) => ({
    id: i, color: REQ_COLORS[i % REQ_COLORS.length], preAllocColor: PREALLOC_COLORS[i % PREALLOC_COLORS.length],
    arrived: false, active: false, queued: false, done: false,
    slot: -1, fillCount: 0, startedAt: -1, progress: 0,
  }));

  const STEP = 0.05;
  for (let t = 0; t <= ot + STEP / 2; t += STEP) {
    for (const r of reqs) { if (!r.arrived && OLLAMA_REQUESTS[r.id].arriveAt <= t) { r.arrived = true; r.queued = true; } }
    for (const r of reqs) { if (r.active && !r.done && r.startedAt >= 0 && t - r.startedAt >= OLLAMA_REQUESTS[r.id].duration) { r.done = true; r.active = false; r.queued = false; if (r.slot >= 0) { slots[r.slot] = null; r.slot = -1; } } }
    for (const r of reqs) { if (r.queued && !r.active && !r.done) { const fs = slots.findIndex(s => s === null); if (fs >= 0) { slots[fs] = r.id; r.slot = fs; r.active = true; r.queued = false; r.startedAt = t; } } }
  }
  for (const r of reqs) {
    if ((r.active || r.done) && r.startedAt >= 0) {
      const def = OLLAMA_REQUESTS[r.id];
      const elapsed = Math.min(ot - r.startedAt, def.duration);
      r.fillCount = Math.max(0, Math.min(def.maxFill, Math.floor(elapsed * def.maxFill / def.duration)));
      r.progress = Math.min(100, Math.round((elapsed / def.duration) * 100));
    }
  }
  return { reqs, slots };
}

// ── vLLM simulation (PagedAttention, dynamic pages, no slot limit) ──
interface VllmReqState {
  id: number;
  color: string;
  arrived: boolean;
  active: boolean;
  done: boolean;
  pages: number[]; // allocated page indices
  startedAt: number;
  progress: number;
  targetPages: number;
}

function computeVllmState(vt: number): { reqs: VllmReqState[]; pageMap: (number | null)[] } {
  // pageMap[i] = request id that owns page i, or null, or 'prefix' (-1)
  const pageMap: (number | null)[] = new Array(P).fill(null);
  // Prefix pages are always allocated
  for (let i = 0; i < PREFIX_PAGES; i++) pageMap[i] = -1;

  const reqs: VllmReqState[] = VLLM_REQUESTS.map((def, i) => ({
    id: i, color: REQ_COLORS[i % REQ_COLORS.length],
    arrived: false, active: false, done: false,
    pages: [], startedAt: -1, progress: 0,
    targetPages: def.maxFill,
  }));

  const STEP = 0.05;
  for (let t = 0; t <= vt + STEP / 2; t += STEP) {
    // Arrivals
    for (const r of reqs) {
      if (!r.arrived && VLLM_REQUESTS[r.id].arriveAt <= t) {
        r.arrived = true;
        r.active = true;
        r.startedAt = t;
      }
    }

    // Completions
    for (const r of reqs) {
      if (r.active && !r.done && r.startedAt >= 0 && t - r.startedAt >= VLLM_REQUESTS[r.id].duration) {
        r.done = true;
        r.active = false;
        // Free pages
        for (const p of r.pages) pageMap[p] = null;
        r.pages = [];
      }
    }

    // Allocate pages dynamically for active requests
    for (const r of reqs) {
      if (r.active && r.startedAt >= 0) {
        const elapsed = t - r.startedAt;
        const def = VLLM_REQUESTS[r.id];
        const needed = Math.min(def.maxFill, Math.floor(elapsed * def.maxFill / def.duration) + 1);
        while (r.pages.length < needed) {
          // Find next free page (skip prefix pages)
          const freePage = pageMap.findIndex((v, idx) => idx >= PREFIX_PAGES && v === null);
          if (freePage === -1) break; // no free pages
          pageMap[freePage] = r.id;
          r.pages.push(freePage);
        }
      }
    }
  }

  // Final progress
  for (const r of reqs) {
    if ((r.active || r.done) && r.startedAt >= 0) {
      const elapsed = Math.min(vt - r.startedAt, VLLM_REQUESTS[r.id].duration);
      r.progress = Math.min(100, Math.round((elapsed / VLLM_REQUESTS[r.id].duration) * 100));
    }
  }

  return { reqs, pageMap };
}

const KVCacheDark: React.FC<WidgetComponentProps> = ({ width, height, frame, fps }) => {
  const timeSec = frame / fps;

  // === PHASES ===
  const phase1End = 2;   // 0-2s: only border + title
  const phase2End = 4;   // 2-4s: grid appears in gray
  const vllmStartSec = 14; // absolute: vLLM animation starts
  const showGrid = timeSec >= phase1End;
  const showColors = timeSec >= phase2End;
  const showVllm = timeSec >= vllmStartSec;
  const gridOpacity = !showGrid ? 0 : Math.min(1, (timeSec - phase1End) / 0.6);

  // Ollama simulation (relative to phase2End)
  const ot = showColors ? timeSec - phase2End : -1;
  const ollamaSim = showColors ? computeOllamaState(ot) : null;

  // vLLM simulation (relative to vllmStartSec)
  const vt = showVllm ? timeSec - vllmStartSec : -1;
  const vllmSim = showVllm ? computeVllmState(vt) : null;

  // Dark theme colors
  const bgCell = '#0a0a0a';
  const borderCell = '#ffffff44';
  const textPrimary = '#ffffff';
  const textSecondary = '#cccccc';
  const textMuted = '#999999';
  const accentVLLM = '#00ffcc';
  const accentOllama = '#fbbf24';

  // ── Ollama grid ──
  const renderOllamaGrid = () => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${BLOCKS_PER_ROW}, 1fr)`, gap: 2 }}>
      {Array.from({ length: P }, (_, i) => {
        let bg = '#333333';
        if (showColors && ollamaSim) {
          const slotIdx = Math.floor(i / PAGES_PER_SLOT);
          const posInSlot = i % PAGES_PER_SLOT;
          if (slotIdx >= SLOT_COUNT) {
            bg = '#0d0d0d';
          } else {
            const occupantId = ollamaSim.slots[slotIdx];
            if (occupantId !== null) {
              const req = ollamaSim.reqs[occupantId];
              bg = posInSlot < req.fillCount ? req.color : req.preAllocColor;
            } else {
              bg = '#222248';
            }
          }
        }
        return <div key={i} style={{ height: 11, borderRadius: 2, background: bg, transition: 'background .3s' }} />;
      })}
    </div>
  );

  // ── vLLM grid ──
  const renderVLLMGrid = () => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${BLOCKS_PER_ROW}, 1fr)`, gap: 2 }}>
      {Array.from({ length: P }, (_, i) => {
        let bg = '#333333'; // gray until animation starts
        if (showVllm && vllmSim) {
          const owner = vllmSim.pageMap[i];
          if (owner === -1) {
            bg = '#4a7fcc'; // prefix cache
          } else if (owner !== null) {
            const req = vllmSim.reqs[owner];
            bg = req ? req.color : '#999';
          } else {
            bg = bgCell; // free page (dark)
          }
        } else if (showColors) {
          // Between phase2End and vllmStart: still gray
          bg = '#333333';
        }
        return <div key={i} style={{ height: 11, borderRadius: 2, background: bg, transition: 'background .3s' }} />;
      })}
    </div>
  );

  // ── Stats ──
  const activeOllama = ollamaSim ? ollamaSim.reqs.filter(r => r.active) : [];
  const queuedOllama = ollamaSim ? ollamaSim.reqs.filter(r => r.queued) : [];
  const ollamaActive = activeOllama.length;
  const ollamaUsed = activeOllama.reduce((sum, r) => sum + r.fillCount, 0);
  const ollamaUtil = ollamaActive > 0 ? Math.round(ollamaUsed / P * 100) : 0;

  const activeVllm = vllmSim ? vllmSim.reqs.filter(r => r.active) : [];
  const vllmUsedPages = vllmSim ? vllmSim.pageMap.filter(v => v !== null).length : 0;
  const vllmActiveCount = activeVllm.length;
  const vllmUtil = showVllm ? Math.round(vllmUsedPages / P * 100) : 0;
  const vllmTokS = vllmActiveCount * 14 + (vllmActiveCount > 0 ? 10 : 0);

  // ── Person badges ──
  const renderOllamaPersons = () => (
    <div style={{ minHeight: 25, display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5, flexWrap: 'wrap' }}>
      {activeOllama.map(r => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <PersonIcon color={r.color} />
          <span style={{ fontSize: 10, color: r.color, fontWeight: 700 }}>R{r.id + 1} {r.progress}%</span>
        </div>
      ))}
      {queuedOllama.map(r => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 3, opacity: 0.45 }}>
          <PersonIcon color={r.color} opacity={0.5} />
          <span style={{ fontSize: 10, color: r.color, fontWeight: 700 }}>R{r.id + 1} ⏳</span>
        </div>
      ))}
    </div>
  );

  const renderVllmPersons = () => (
    <div style={{ minHeight: 25, display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5, flexWrap: 'wrap' }}>
      {activeVllm.map(r => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <PersonIcon color={r.color} />
          <span style={{ fontSize: 10, color: r.color, fontWeight: 700 }}>R{r.id + 1} {r.progress}%</span>
        </div>
      ))}
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
          <div style={{ fontSize: 13, fontWeight: 700, color: accentVLLM, height: 20, marginBottom: 7 }}>
            {showColors ? 'vLLM · PagedAttention' : ''}
          </div>
          {showVllm ? renderVllmPersons() : <div style={{ minHeight: 25, marginBottom: 5 }} />}
          <div style={{ background: bgCell, border: `1px solid ${borderCell}`, borderRadius: 8, padding: 9, marginBottom: 7 }}>
            {renderVLLMGrid()}
            <div style={{ fontSize: 9, marginTop: 5, color: textMuted }}>
              {'\u25AA'} {showVllm ? 'Pages dynamisch allokiert — kein Verschnitt' : 'erste 8 Pages: Prefix cache — geteilt zwischen ALLEN Requests'}
            </div>
          </div>
          <div style={{ fontSize: 11, color: textSecondary, display: 'flex', gap: 10 }}>
            <span>util <span style={{ fontWeight: 700, fontSize: 12, color: accentVLLM }}>{vllmUtil}%</span></span>
            <span>aktiv <span style={{ fontWeight: 700, fontSize: 12, color: accentVLLM }}>{vllmActiveCount}</span></span>
            <span>~<span style={{ fontWeight: 700, fontSize: 12, color: accentVLLM }}>{vllmTokS}</span> tok/s</span>
          </div>
        </div>

        {/* Ollama */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: accentOllama, height: 20, marginBottom: 7 }}>
            {showColors ? 'Ollama · llama.cpp' : ''}
          </div>
          {showColors ? renderOllamaPersons() : <div style={{ minHeight: 25, marginBottom: 5 }} />}
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
          {queuedOllama.length > 0 && (
            <div style={{ fontSize: 10, color: '#ff6b6b', marginTop: 5, fontWeight: 600 }}>
              ⚠ {queuedOllama.length} Request{queuedOllama.length > 1 ? 's' : ''} in Warteschlange — kein freier Slot!
            </div>
          )}
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
  defaultDurationInFrames: 600,
  defaultElementWidth: 740,
  defaultElementHeight: 460,
};
