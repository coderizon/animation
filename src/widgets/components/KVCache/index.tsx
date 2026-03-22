import React, { useRef, useCallback } from 'react';
import { WidgetComponentProps, WidgetRegistryEntry } from '../../types';
import { faMemory } from '@fortawesome/free-solid-svg-icons';

const P = 128;
const PFX = 8;
const OS = 32;
const MOL = 3;
const CLR = ['#3b82f6','#a855f7','#ec4899','#f97316','#22c55e','#06b6d4','#f43f5e','#e879f9','#84cc16','#fb923c','#38bdf8','#c084fc'];

interface Req {
  id: number;
  c: string;
  l: string;
  t: number;
  max: number;
  done: boolean;
  vp: number[];
  os: number;
}

interface SimState {
  rs: Req[];
  rid: number;
  vp: (number | string | null)[];
  osl: (number | null)[];
}

function initState(): SimState {
  const vp = new Array(P).fill(null);
  for (let i = 0; i < PFX; i++) vp[i] = 'x';
  return { rs: [], rid: 0, vp, osl: new Array(MOL).fill(null) };
}

function allocVLLM(r: Req, vp: (number | string | null)[]) {
  const f: number[] = [];
  for (let i = PFX; i < P && f.length < 3; i++) if (!vp[i]) f.push(i);
  if (f.length === 3) f.forEach(p => { vp[p] = r.id; r.vp.push(p); });
}

function allocOllama(r: Req, osl: (number | null)[]) {
  const s = osl.findIndex(x => x === null);
  if (s !== -1) { osl[s] = r.id; r.os = s; }
}

function addReq(state: SimState): SimState {
  const alive = state.rs.filter(r => !r.done);
  if (alive.length >= 13) return state;
  const r: Req = { id: state.rid, c: CLR[state.rid % CLR.length], l: 'R' + (state.rid + 1), t: 0, max: 15 + Math.floor(Math.random() * 30), done: false, vp: [], os: -1 };
  state.rid++;
  state.rs.push(r);
  allocVLLM(r, state.vp);
  allocOllama(r, state.osl);
  return state;
}

function tick(state: SimState): SimState {
  state.rs.filter(r => !r.done).forEach(r => {
    if (r.vp.length > 0 || r.os >= 0) {
      r.t++;
      if (r.vp.length > 0 && r.t % 5 === 0) {
        for (let i = PFX; i < P; i++) { if (!state.vp[i]) { state.vp[i] = r.id; r.vp.push(i); break; } }
      }
      if (r.t >= r.max) {
        r.done = true;
        r.vp.forEach(p => state.vp[p] = null); r.vp = [];
        if (r.os >= 0) { state.osl[r.os] = null; r.os = -1; }
        state.rs.filter(x => !x.done && x.vp.length === 0).forEach(x => allocVLLM(x, state.vp));
        state.rs.filter(x => !x.done && x.os === -1).forEach(x => allocOllama(x, state.osl));
      }
    }
  });
  state.rs = state.rs.filter(r => !r.done);
  return state;
}

const KVCache: React.FC<WidgetComponentProps> = ({ width, height, frame, fps }) => {
  const stateRef = useRef<SimState>(initState());
  const lastTickRef = useRef(0);
  const autoAddRef = useRef(0);

  const tickInterval = Math.max(1, Math.round(fps * 0.165));

  if (frame !== lastTickRef.current) {
    lastTickRef.current = frame;
    if (frame % tickInterval === 0) {
      stateRef.current = tick(stateRef.current);
    }
    // Auto-add requests periodically
    if (frame % (tickInterval * 8) === 0 && frame > 0) {
      autoAddRef.current++;
      stateRef.current = addReq(stateRef.current);
    }
    // Initial burst
    if (frame === 1) {
      for (let i = 0; i < 3; i++) stateRef.current = addReq(stateRef.current);
    }
  }

  const s = stateRef.current;
  const alive = s.rs.filter(r => !r.done);
  const vu = Math.round(s.vp.filter(p => p !== null).length / P * 100);
  const va = alive.filter(r => r.vp.length > 0).length;
  const vt = va * 14 + (va > 0 ? 10 : 0);
  const oa = s.osl.filter(x => x !== null).length;
  const ou = Math.round(oa * OS / P * 100);
  const ot = oa * 8;

  const renderGrid = useCallback((pages: (number | string | null)[], isOllama: boolean) => {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: 2 }}>
        {Array.from({ length: P }, (_, i) => {
          let bg = '#222248';
          if (isOllama) {
            const sl = Math.floor(i / OS);
            if (sl >= MOL) { bg = '#1e1e48'; }
            else {
              const sid = s.osl[sl];
              if (sid !== null) {
                const r = alive.find(x => x.id === sid);
                const pos = i % OS, used = r ? Math.min(OS, Math.floor(r.t * 0.75)) : 0;
                bg = pos < used ? (r ? r.c + 'ee' : '#999') : '#4d3818';
              }
            }
          } else {
            const o = pages[i];
            if (o === 'x') bg = '#4a7fcc';
            else if (o !== null) { const r = alive.find(x => x.id === o); bg = r ? r.c + 'ee' : '#999'; }
          }
          return <div key={i} style={{ height: 11, borderRadius: 2, background: bg, transition: 'background .28s' }} />;
        })}
      </div>
    );
  }, [alive, s.osl, s.vp]);

  const renderReqs = useCallback((isOllama: boolean) => (
    <div style={{ minHeight: 25, display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', marginBottom: 5 }}>
      {alive.map(r => {
        const active = isOllama ? r.os >= 0 : r.vp.length > 0;
        return (
          <div key={r.id} style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 3, fontWeight: 700, color: '#000',
            background: r.c, opacity: active ? 1 : 0.35, filter: active ? 'none' : 'grayscale(.4)',
          }}>
            {r.l} {!active ? '\u23F3' : Math.min(100, Math.round(r.t / r.max * 100)) + '%'}
          </div>
        );
      })}
    </div>
  ), [alive]);

  return (
    <div style={{ width, height, background: '#22224a', borderRadius: 14, padding: 22, color: '#d8d8f0', fontFamily: "'Courier New', monospace", border: '1px solid #3a3a66', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#7878c0', marginBottom: 16 }}>
        KV Cache · GPU Memory Simulation
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, flex: 1 }}>
        {/* vLLM */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#00ffcc', marginBottom: 7 }}>vLLM · PagedAttention</div>
          {renderReqs(false)}
          <div style={{ background: '#1a1a38', border: '1px solid #363660', borderRadius: 8, padding: 9, marginBottom: 7 }}>
            {renderGrid(s.vp, false)}
            <div style={{ fontSize: 9, marginTop: 5, color: '#5080b0' }}>▪ erste 8 Pages: Prefix cache — geteilt zwischen ALLEN Requests</div>
          </div>
          <div style={{ fontSize: 11, color: '#8888b8', display: 'flex', gap: 10 }}>
            <span>util <span style={{ fontWeight: 700, fontSize: 12, color: '#00ffcc' }}>{vu}%</span></span>
            <span>aktiv <span style={{ fontWeight: 700, fontSize: 12, color: '#00ffcc' }}>{va}</span></span>
            <span>~<span style={{ fontWeight: 700, fontSize: 12, color: '#00ffcc' }}>{vt}</span> tok/s</span>
          </div>
        </div>

        {/* Ollama */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', marginBottom: 7 }}>Ollama · llama.cpp</div>
          {renderReqs(true)}
          <div style={{ background: '#1a1a38', border: '1px solid #363660', borderRadius: 8, padding: 9, marginBottom: 7 }}>
            {renderGrid(s.vp, true)}
            <div style={{ fontSize: 9, marginTop: 5, color: '#9a6030' }}>▪ 32 Pages pre-allokiert pro Session — Rest bleibt ungenutzt</div>
          </div>
          <div style={{ fontSize: 11, color: '#8888b8', display: 'flex', gap: 10 }}>
            <span>util <span style={{ fontWeight: 700, fontSize: 12, color: '#fbbf24' }}>{ou}%</span></span>
            <span>aktiv <span style={{ fontWeight: 700, fontSize: 12, color: '#fbbf24' }}>{oa}</span></span>
            <span>~<span style={{ fontWeight: 700, fontSize: 12, color: '#fbbf24' }}>{ot}</span> tok/s</span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height: 1, background: '#303058', margin: '14px 0' }} />

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 10, color: '#7878b0' }}>
        {[
          { bg: '#4a7fcc', label: 'Shared prefix (vLLM)' },
          { bg: '#222248', border: '1px solid #363660', label: 'Frei' },
          { bg: '#4d3818', label: 'Pre-alloc / verschwendet' },
          { bg: '#3b82f6', label: 'Aktiver Request' },
          { bg: '#1e1e48', label: 'Nicht erreichbar (Ollama)' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, flexShrink: 0, background: l.bg, border: l.border }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export const kvCacheWidget: WidgetRegistryEntry = {
  name: 'kvCache',
  displayName: 'KV Cache',
  description: 'GPU Memory Simulation: vLLM PagedAttention vs Ollama llama.cpp',
  icon: faMemory,
  component: KVCache,
  nativeWidth: 740,
  nativeHeight: 460,
  defaultFps: 12,
  defaultDurationInFrames: 360,
  defaultElementWidth: 740,
  defaultElementHeight: 460,
};
