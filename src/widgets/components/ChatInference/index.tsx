import React from 'react';
import { WidgetComponentProps, WidgetRegistryEntry } from '../../types';
import { faComments } from '@fortawesome/free-solid-svg-icons';
import { Send } from 'lucide-react';

function ease(t: number) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function typewriter(text: string, progress: number): string {
  return text.slice(0, Math.floor(text.length * Math.max(0, Math.min(1, progress))));
}

const MistralLogo: React.FC<{ size: number; glow?: number }> = ({ size, glow = 0 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
    style={{ filter: glow > 0 ? `drop-shadow(0 0 ${4 + glow * 8}px rgba(255,175,0,${0.3 + glow * 0.5}))` : undefined }}>
    <path d="M3.428 3.4h3.429v3.428H3.428V3.4zm13.714 0h3.43v3.428h-3.43V3.4z" fill="gold" />
    <path d="M3.428 6.828h6.857v3.429H3.429V6.828zm10.286 0h6.857v3.429h-6.857V6.828z" fill="#FFAF00" />
    <path d="M3.428 10.258h17.144v3.428H3.428v-3.428z" fill="#FF8205" />
    <path d="M3.428 13.686h3.429v3.428H3.428v-3.428zm6.858 0h3.429v3.428h-3.429v-3.428zm6.856 0h3.43v3.428h-3.43v-3.428z" fill="#FA500F" />
    <path d="M0 17.114h10.286v3.429H0v-3.429zm13.714 0H24v3.429H13.714v-3.429z" fill="#E10500" />
  </svg>
);

const MiniNeuralNet: React.FC<{ size: number; frame: number; active: boolean }> = ({ size, frame, active }) => {
  const cx = 50, cy = 50, r = 32, nr = 3.8;
  const angles = [-90, -18, 54, 126, 198];
  const getPos = (i: number) => {
    const a = angles[i] * Math.PI / 180;
    const seed = i * 1.7 + 0.3;
    return {
      x: cx + r * Math.cos(a) + (active ? Math.sin(frame * 0.02 * seed + i * 2.1) * 1.8 : 0),
      y: cy + r * Math.sin(a) + (active ? Math.cos(frame * 0.017 * seed + i * 1.8) * 1.6 : 0),
    };
  };
  const nodes = angles.map((_, i) => getPos(i));
  const edges: [number, number][] = [[0,1],[1,2],[2,3],[3,4],[4,0]];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow: 'visible' }}>
      <defs>
        <filter id="nnG"><feGaussianBlur stdDeviation="1.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <radialGradient id="nnR" cx="40%" cy="35%"><stop offset="0%" stopColor="#5FE8A0" /><stop offset="100%" stopColor="#34C77B" /></radialGradient>
      </defs>
      {edges.map(([a, b], i) => (
        <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
          stroke="#2B5CFF" strokeWidth={2.2} strokeLinecap="round"
          opacity={active ? 0.35 + 0.15 * Math.sin(frame * 0.03 + i * 1.2) + 0.2 : 0.25} />
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={nr * (active ? 1 + 0.06 * Math.sin(frame * 0.025 + i * 1.5) : 1)}
          fill="url(#nnR)" filter="url(#nnG)" opacity={active ? 1 : 0.5} />
      ))}
    </svg>
  );
};

const USER_MSG = 'Erkläre mir KV Cache kurz';
const RESP_MSG = 'Der KV Cache speichert berechnete Key-Value Paare aus der Attention-Schicht zwischen. So müssen bei der Token-Generierung frühere Positionen nicht neu berechnet werden. Das reduziert die Latenz erheblich.';
const FONT = "'Inter', 'SF Pro Display', -apple-system, sans-serif";

const ChatInference: React.FC<WidgetComponentProps> = ({ width, height, frame, fps }) => {
  const t = frame / fps;
  const s = Math.min(width / 1000, height / 550);

  // ── Timeline ──
  const fadeIn = Math.min(1, t / 0.5);
  const userTypeProgress = (t - 0.8) / 1.5;
  const reqArrowProgress = ease(Math.max(0, Math.min(1, (t - 2.5) / 0.6)));
  const serverGlow = t >= 3.1 && t < 3.8 ? Math.min(1, (t - 3.1) / 0.3) : (t >= 3.8 ? Math.max(0, 1 - (t - 3.8) / 0.3) : 0);
  const vllmGlow = t >= 3.4 && t < 4.2 ? ease(Math.min(1, (t - 3.4) / 0.3)) : (t >= 4.2 ? Math.max(0, 1 - (t - 4.2) / 0.3) : 0);
  const nnAppear = ease(Math.max(0, Math.min(1, (t - 3.8) / 0.5)));
  const isInferring = t >= 4.3 && t < 7.0;
  const mistralGlow = isInferring ? 0.5 + 0.5 * Math.sin((t - 4.3) * 4) : 0;
  const respArrowProgress = ease(Math.max(0, Math.min(1, (t - 7.0) / 0.5)));
  const respTypeProgress = (t - 7.8) / 4.0;
  const doneGlow = t >= 11.8 ? Math.min(1, (t - 11.8) / 0.5) : 0;
  const isThinking = t >= 4.3 && t < 7.8;
  const thinkPhase = isThinking ? (t - 4.3) * 2.5 : 0;
  const dot1 = isThinking ? 0.4 + 0.6 * Math.sin(thinkPhase * Math.PI) : 0;
  const dot2 = isThinking ? 0.4 + 0.6 * Math.sin((thinkPhase - 0.3) * Math.PI) : 0;
  const dot3 = isThinking ? 0.4 + 0.6 * Math.sin((thinkPhase - 0.6) * Math.PI) : 0;

  // ── Layout ──
  const chatX = 30 * s;
  const chatW = 460 * s;
  const chatH = 460 * s;
  const chatY = 40 * s;

  const stackX = 690 * s;
  const stackW = 270 * s;
  const stackCenterX = stackX + stackW / 2;
  const srvY = 260 * s;
  const srvH = 50 * s;
  const vllmY = srvY + srvH + 14 * s;
  const vllmH = 38 * s;
  const nnSize = 140 * s;
  const nnY = srvY - nnSize - 10 * s;

  const arrowStartX = chatX + chatW;
  const arrowEndX = stackX;
  const arrowLen = arrowEndX - arrowStartX - 10 * s;
  const arrowY1 = chatY + chatH * 0.38;
  const arrowY2 = chatY + chatH * 0.52;

  return (
    <div style={{
      width, height, background: 'transparent',
      fontFamily: FONT, color: '#ffffff',
      position: 'relative', overflow: 'hidden', opacity: fadeIn,
    }}>

      {/* ── Chat Window (OpenWebUI style) ── */}
      <div style={{
        position: 'absolute', left: chatX, top: chatY,
        width: chatW, height: chatH,
        background: '#1a1a1a',
        border: 'none',
        borderRadius: 20 * s,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: `0 0 ${1 * s}px rgba(255,255,255,0.15), 0 0 ${30 * s}px rgba(255,255,255,0.04), 0 ${12 * s}px ${40 * s}px rgba(0,0,0,0.6)`,
      }}>

        {/* Start screen: logo + model name (visible before conversation) */}
        {userTypeProgress <= 0 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 6 * s,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 * s }}>
              <img src="/assets/openwebui.svg" alt="OpenWebUI" style={{ width: 26 * s, height: 26 * s }} />
              <span style={{ fontSize: 18 * s, fontWeight: 600, color: '#ffffff' }}>Mistral Large</span>
            </div>
          </div>
        )}

        {/* Conversation view (after typing starts) */}
        {userTypeProgress > 0 && (
          <div style={{
            flex: 1, padding: `${18 * s}px ${18 * s}px ${8 * s}px`,
            display: 'flex', flexDirection: 'column', gap: 14 * s,
            overflow: 'hidden',
          }}>
            {/* User message */}
            <div style={{
              alignSelf: 'stretch',
              background: '#262626',
              borderRadius: 12 * s,
              padding: `${10 * s}px ${16 * s}px`,
              fontSize: 12.5 * s, color: '#e0e0e0',
              lineHeight: 1.55, fontWeight: 400,
            }}>
              {typewriter(USER_MSG, userTypeProgress)}
              {userTypeProgress > 0 && userTypeProgress < 1 && (
                <span style={{ display: 'inline-block', width: 1.5 * s, height: 14 * s, background: '#888', marginLeft: 1, verticalAlign: 'text-bottom', opacity: Math.sin(t * 6) > 0 ? 1 : 0 }} />
              )}
            </div>

            {/* Thinking dots */}
            {isThinking && respTypeProgress <= 0 && (
              <div style={{ display: 'flex', gap: 4 * s, padding: `${4 * s}px ${4 * s}px` }}>
                {[dot1, dot2, dot3].map((op, i) => (
                  <div key={i} style={{
                    width: 5 * s, height: 5 * s, borderRadius: '50%',
                    background: '#888', opacity: Math.max(0.2, op),
                    transform: `translateY(${-op * 3 * s}px)`,
                  }} />
                ))}
              </div>
            )}

            {/* Response */}
            {respTypeProgress > 0 && (
              <div style={{
                fontSize: 12.5 * s, color: doneGlow > 0 ? '#e8e8e8' : '#d0d0d0',
                lineHeight: 1.65, fontWeight: 400,
                padding: `${2 * s}px ${4 * s}px`,
              }}>
                {typewriter(RESP_MSG, respTypeProgress)}
                {respTypeProgress > 0 && respTypeProgress < 1 && (
                  <span style={{ display: 'inline-block', width: 1.5 * s, height: 13 * s, background: '#888', marginLeft: 1, verticalAlign: 'text-bottom', opacity: Math.sin(t * 8) > 0 ? 1 : 0 }} />
                )}
              </div>
            )}
          </div>
        )}

        {/* Input bar */}
        <div style={{ padding: `${6 * s}px ${14 * s}px ${10 * s}px` }}>
          <div style={{
            background: '#f0f0f0',
            borderRadius: 22 * s,
            padding: `${6 * s}px ${6 * s}px ${6 * s}px ${16 * s}px`,
            display: 'flex', flexDirection: 'column', gap: 4 * s,
          }}>
            {/* Input text */}
            <div style={{
              fontSize: 11.5 * s, color: '#999',
              padding: `${4 * s}px 0`,
              minHeight: 18 * s,
            }}>
              {userTypeProgress > 0 ? '' : 'Nachricht eingeben...'}
            </div>

            {/* Tool row */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {/* Left tools */}
              <div style={{ display: 'flex', gap: 4 * s }}>
                <div style={{ width: 22 * s, height: 22 * s, borderRadius: 6 * s, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width={12 * s} height={12 * s} viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth={2} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </div>
                <div style={{ width: 22 * s, height: 22 * s, borderRadius: 6 * s, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width={12 * s} height={12 * s} viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
                </div>
              </div>

              <div style={{ flex: 1 }} />

              {/* Right: send button */}
              <div style={{
                width: 28 * s, height: 28 * s, borderRadius: '50%',
                background: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 ${1 * s}px ${3 * s}px rgba(0,0,0,0.15)`,
              }}>
                <Send size={13 * s} color="#1a1a1a" strokeWidth={2.5} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: 6 * s, fontSize: 8 * s, color: '#444' }}>
            Open WebUI · v0.6.34
          </div>
        </div>
      </div>

      {/* ── Request Arrow ── */}
      {reqArrowProgress > 0 && (
        <div style={{ position: 'absolute', left: arrowStartX + 5 * s, top: arrowY1 }}>
          <div style={{ width: arrowLen * reqArrowProgress, height: 1.5 * s, background: 'linear-gradient(90deg, #3b82f620, #3b82f6)', borderRadius: 1 }} />
          {reqArrowProgress > 0.85 && (
            <div style={{
              position: 'absolute', right: -(arrowLen * (1 - reqArrowProgress)) - 5 * s, top: -3 * s,
              borderTop: `${4 * s}px solid transparent`, borderBottom: `${4 * s}px solid transparent`,
              borderLeft: `${6 * s}px solid #3b82f6`,
              opacity: Math.min(1, (reqArrowProgress - 0.85) / 0.15),
            }} />
          )}
          <div style={{ position: 'absolute', top: -13 * s, left: '50%', transform: 'translateX(-50%)', fontSize: 8 * s, color: '#3b82f640', fontWeight: 500, letterSpacing: 1.5 * s, textTransform: 'uppercase' as const }}>
            request
          </div>
        </div>
      )}

      {/* ── Response Arrow ── */}
      {respArrowProgress > 0 && (
        <div style={{ position: 'absolute', left: arrowStartX + 5 * s + arrowLen * (1 - respArrowProgress), top: arrowY2 }}>
          <div style={{ width: arrowLen * respArrowProgress, height: 1.5 * s, background: 'linear-gradient(270deg, #22c55e20, #22c55e)', borderRadius: 1 }} />
          {respArrowProgress > 0.85 && (
            <div style={{
              position: 'absolute', left: -5 * s, top: -3 * s,
              borderTop: `${4 * s}px solid transparent`, borderBottom: `${4 * s}px solid transparent`,
              borderRight: `${6 * s}px solid #22c55e`,
              opacity: Math.min(1, (respArrowProgress - 0.85) / 0.15),
            }} />
          )}
          <div style={{ position: 'absolute', bottom: -13 * s, left: '50%', transform: 'translateX(-50%)', fontSize: 8 * s, color: '#22c55e40', fontWeight: 500, letterSpacing: 1.5 * s, textTransform: 'uppercase' as const }}>
            response
          </div>
        </div>
      )}

      {/* ── Right: Server Stack ── */}

      {/* Neural Net + Mistral */}
      <div style={{
        position: 'absolute', left: stackCenterX - nnSize / 2, top: nnY,
        opacity: nnAppear, transform: `scale(${0.8 + nnAppear * 0.2})`,
      }}>
        <MiniNeuralNet size={nnSize} frame={frame} active={isInferring || respTypeProgress > 0} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <MistralLogo size={36 * s} glow={mistralGlow} />
        </div>
      </div>

      {/* DGX Spark */}
      <div style={{
        position: 'absolute', left: stackX, top: srvY, width: stackW, height: srvH,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        filter: serverGlow > 0 ? `drop-shadow(0 0 ${12 * s * serverGlow}px rgba(100,180,255,${serverGlow * 0.4})) brightness(${1 + serverGlow * 0.3})` : undefined,
      }}>
        <img src="/images/dgxspark.png" alt="DGX Spark" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>

      {/* vLLM Engine */}
      <div style={{
        position: 'absolute', left: stackX, top: vllmY, width: stackW, height: vllmH,
        borderRadius: 8 * s,
        border: `${1 * s}px solid ${vllmGlow > 0 ? `rgba(86,200,255,${0.2 + vllmGlow * 0.4})` : '#ffffff10'}`,
        background: '#0a0a14',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 * s,
        boxShadow: vllmGlow > 0 ? `0 0 ${14 * s * vllmGlow}px rgba(86,200,255,${vllmGlow * 0.2})` : 'none',
      }}>
        <img src="/assets/vllm-color.svg" alt="vLLM" style={{ width: 20 * s, height: 20 * s, objectFit: 'contain' }} />
        <span style={{ fontSize: 10 * s, color: vllmGlow > 0 ? '#90d8ff' : '#555', fontWeight: 500 }}>
          Inferenz-Engine
        </span>
      </div>

      {/* Stack connection lines */}
      <div style={{
        position: 'absolute', left: stackCenterX - 0.5 * s, top: nnY + nnSize - 5 * s,
        width: 1 * s, height: srvY - (nnY + nnSize) + 10 * s,
        background: nnAppear > 0 ? `rgba(43,92,255,${nnAppear * 0.3})` : 'transparent',
      }} />
      <div style={{
        position: 'absolute', left: stackCenterX - 0.5 * s, top: srvY + srvH,
        width: 1 * s, height: vllmY - srvY - srvH,
        background: '#ffffff10',
      }} />
    </div>
  );
};

export const chatInferenceWidget: WidgetRegistryEntry = {
  name: 'chatInference',
  displayName: 'Chat Inference',
  description: 'User-Anfrage an LLM mit OpenWebUI Chat, Server-Stack und Streaming-Antwort',
  icon: faComments,
  component: ChatInference,
  nativeWidth: 1000,
  nativeHeight: 550,
  defaultFps: 24,
  defaultDurationInFrames: 312,
  defaultElementWidth: 1000,
  defaultElementHeight: 550,
};
