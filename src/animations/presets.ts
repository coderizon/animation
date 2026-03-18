import { AnimationPreset } from '../types/animation';
import { AnimationPresetName } from '../types/project';

// Animation Preset Definitions

export const animationPresets: Record<AnimationPresetName, AnimationPreset> = {
  // ─── NONE ────────────────────────────────────────────
  none: {
    name: 'none',
    displayName: 'No Animation',
    description: 'Element appears instantly',
    icon: '—',
    defaultDuration: 0,
    variants: {
      hidden: {},
      visible: {}
    }
  },

  // ─── FADE ────────────────────────────────────────────
  fadeIn: {
    name: 'fadeIn',
    displayName: 'Fade In',
    description: 'Element fades in smoothly',
    icon: '↗',
    defaultDuration: 600,
    variants: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 }
    }
  },

  fadeOut: {
    name: 'fadeOut',
    displayName: 'Fade Out',
    description: 'Element fades out',
    icon: '↘',
    defaultDuration: 600,
    variants: {
      hidden: { opacity: 1 },
      visible: { opacity: 0 }
    }
  },

  softFadeOut: {
    name: 'softFadeOut',
    displayName: 'Weiches Ausfaden',
    description: 'Element fades out softly while pulling back',
    icon: '🌫',
    defaultDuration: 1000,
    variants: {
      hidden: { opacity: 1, scale: 1 },
      visible: {
        opacity: 0,
        scale: 0.95,
        transition: { duration: 1, ease: [0.4, 0, 0.2, 1] }
      }
    }
  },

  // ─── SLIDE ───────────────────────────────────────────
  slideInLeft: {
    name: 'slideInLeft',
    displayName: 'Slide from Left',
    description: 'Element slides in from the left',
    icon: '←',
    defaultDuration: 500,
    variants: {
      hidden: { opacity: 0, x: -100 },
      visible: { opacity: 1, x: 0 }
    }
  },

  slideInRight: {
    name: 'slideInRight',
    displayName: 'Slide from Right',
    description: 'Element slides in from the right',
    icon: '→',
    defaultDuration: 500,
    variants: {
      hidden: { opacity: 0, x: 100 },
      visible: { opacity: 1, x: 0 }
    }
  },

  slideInTop: {
    name: 'slideInTop',
    displayName: 'Slide from Top',
    description: 'Element slides in from above',
    icon: '↑',
    defaultDuration: 500,
    variants: {
      hidden: { opacity: 0, y: -100 },
      visible: { opacity: 1, y: 0 }
    }
  },

  slideInBottom: {
    name: 'slideInBottom',
    displayName: 'Slide from Bottom',
    description: 'Element slides in from below',
    icon: '↓',
    defaultDuration: 500,
    variants: {
      hidden: { opacity: 0, y: 100 },
      visible: { opacity: 1, y: 0 }
    }
  },

  slideOutLeft: {
    name: 'slideOutLeft',
    displayName: 'Slide Out Left',
    description: 'Element slides out to the left',
    icon: '⇐',
    defaultDuration: 500,
    variants: {
      hidden: { opacity: 1, x: 0 },
      visible: { opacity: 0, x: -150 }
    }
  },

  slideOutRight: {
    name: 'slideOutRight',
    displayName: 'Slide Out Right',
    description: 'Element slides out to the right',
    icon: '⇒',
    defaultDuration: 500,
    variants: {
      hidden: { opacity: 1, x: 0 },
      visible: { opacity: 0, x: 150 }
    }
  },

  // ─── SCALE & ZOOM ───────────────────────────────────
  scaleIn: {
    name: 'scaleIn',
    displayName: 'Scale In',
    description: 'Element scales from small to normal',
    icon: '+',
    defaultDuration: 600,
    variants: {
      hidden: { opacity: 0, scale: 0.5 },
      visible: { opacity: 1, scale: 1 }
    }
  },

  scaleOut: {
    name: 'scaleOut',
    displayName: 'Scale Out',
    description: 'Element scales from normal to large',
    icon: '−',
    defaultDuration: 600,
    variants: {
      hidden: { opacity: 1, scale: 1 },
      visible: { opacity: 0, scale: 1.5 }
    }
  },

  scalePop: {
    name: 'scalePop',
    displayName: 'Scale Pop',
    description: 'Element pops in with overshoot',
    icon: '💥',
    defaultDuration: 500,
    variants: {
      hidden: { opacity: 0, scale: 0 },
      visible: {
        opacity: 1,
        scale: 1,
        transition: {
          type: 'spring',
          stiffness: 400,
          damping: 15
        }
      }
    }
  },

  zoomIn: {
    name: 'zoomIn',
    displayName: 'Zoom In',
    description: 'Camera zooms into the element',
    icon: '🔍',
    defaultDuration: 800,
    variants: {
      hidden: { opacity: 0, scale: 0.3 },
      visible: {
        opacity: 1,
        scale: 1,
        transition: { ease: [0.25, 0.46, 0.45, 0.94] }
      }
    }
  },

  zoomOut: {
    name: 'zoomOut',
    displayName: 'Zoom Out',
    description: 'Camera zooms out from element',
    icon: '🔎',
    defaultDuration: 800,
    variants: {
      hidden: { opacity: 0, scale: 2 },
      visible: {
        opacity: 1,
        scale: 1,
        transition: { ease: [0.25, 0.46, 0.45, 0.94] }
      }
    }
  },

  cameraPush: {
    name: 'cameraPush',
    displayName: 'Camera Push',
    description: 'Slow camera push forward',
    icon: '🎥',
    defaultDuration: 2000,
    variants: {
      hidden: { scale: 1, opacity: 1 },
      visible: {
        scale: 1.15,
        opacity: 1,
        transition: { duration: 2, ease: [0.4, 0, 0.2, 1] }
      }
    }
  },

  // ─── ROTATION ────────────────────────────────────────
  rotate: {
    name: 'rotate',
    displayName: 'Rotate',
    description: 'Element rotates while appearing',
    icon: '↻',
    defaultDuration: 800,
    variants: {
      hidden: { opacity: 0, rotate: -180 },
      visible: { opacity: 1, rotate: 0 }
    }
  },

  rotationReveal: {
    name: 'rotationReveal',
    displayName: 'Rotation Reveal',
    description: 'Element spins in from zero with scale',
    icon: '🔄',
    defaultDuration: 800,
    variants: {
      hidden: { opacity: 0, rotate: -360, scale: 0 },
      visible: {
        opacity: 1,
        rotate: 0,
        scale: 1,
        transition: { type: 'spring', stiffness: 200, damping: 20 }
      }
    }
  },

  flipIn: {
    name: 'flipIn',
    displayName: 'Flip In X',
    description: 'Element flips in horizontally',
    icon: '⟳',
    defaultDuration: 700,
    variants: {
      hidden: { opacity: 0, rotateY: 90 },
      visible: { opacity: 1, rotateY: 0 }
    }
  },

  flipInY: {
    name: 'flipInY',
    displayName: 'Flip In Y',
    description: 'Element flips in vertically',
    icon: '🔃',
    defaultDuration: 700,
    variants: {
      hidden: { opacity: 0, rotateX: 90 },
      visible: { opacity: 1, rotateX: 0 }
    }
  },

  // ─── BOUNCE & ELASTIC ───────────────────────────────
  bounce: {
    name: 'bounce',
    displayName: 'Bounce',
    description: 'Element bounces in',
    icon: '↕',
    defaultDuration: 800,
    variants: {
      hidden: { opacity: 0, y: -50 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          type: 'spring',
          bounce: 0.5
        }
      }
    }
  },

  elasticIn: {
    name: 'elasticIn',
    displayName: 'Elastic In',
    description: 'Element stretches in elastically',
    icon: '🧲',
    defaultDuration: 1000,
    variants: {
      hidden: { opacity: 0, scaleX: 0.3, scaleY: 0.3 },
      visible: {
        opacity: 1,
        scaleX: 1,
        scaleY: 1,
        transition: {
          type: 'spring',
          stiffness: 300,
          damping: 10
        }
      }
    }
  },

  elasticScale: {
    name: 'elasticScale',
    displayName: 'Elastic Scale',
    description: 'Element scales with elastic bounce',
    icon: '🪀',
    defaultDuration: 900,
    variants: {
      hidden: { opacity: 0, scale: 0 },
      visible: {
        opacity: 1,
        scale: [0, 1.2, 0.9, 1.05, 1],
        transition: { times: [0, 0.4, 0.6, 0.8, 1] }
      }
    }
  },

  pulse: {
    name: 'pulse',
    displayName: 'Pulse',
    description: 'Element pulses in size',
    icon: '◉',
    defaultDuration: 600,
    variants: {
      hidden: { scale: 1, opacity: 1 },
      visible: {
        scale: [1, 1.15, 1],
        opacity: 1,
        transition: { times: [0, 0.5, 1] }
      }
    }
  },

  shake: {
    name: 'shake',
    displayName: 'Shake',
    description: 'Element shakes horizontally',
    icon: '~',
    defaultDuration: 500,
    variants: {
      hidden: { x: 0, opacity: 1 },
      visible: {
        x: [0, -10, 10, -10, 10, 0],
        opacity: 1,
        transition: { times: [0, 0.2, 0.4, 0.6, 0.8, 1] }
      }
    }
  },

  // ─── REVEAL & MASK ──────────────────────────────────
  wipeRight: {
    name: 'wipeRight',
    displayName: 'Wipe Right',
    description: 'Element reveals with a wipe from left to right',
    icon: '▶',
    defaultDuration: 800,
    variants: {
      hidden: { clipPath: 'inset(0 100% 0 0)', opacity: 1 },
      visible: {
        clipPath: 'inset(0 0% 0 0)',
        opacity: 1,
        transition: { ease: [0.4, 0, 0.2, 1] }
      }
    }
  },

  wipeDown: {
    name: 'wipeDown',
    displayName: 'Wipe Down',
    description: 'Element reveals with a wipe from top to bottom',
    icon: '🔽',
    defaultDuration: 800,
    variants: {
      hidden: { clipPath: 'inset(0 0 100% 0)', opacity: 1 },
      visible: {
        clipPath: 'inset(0 0 0% 0)',
        opacity: 1,
        transition: { ease: [0.4, 0, 0.2, 1] }
      }
    }
  },

  wipeLeft: {
    name: 'wipeLeft',
    displayName: 'Wipe Left',
    description: 'Element reveals with a wipe from right to left',
    icon: '◀',
    defaultDuration: 800,
    variants: {
      hidden: { clipPath: 'inset(0 0 0 100%)', opacity: 1 },
      visible: {
        clipPath: 'inset(0 0 0 0%)',
        opacity: 1,
        transition: { ease: [0.4, 0, 0.2, 1] }
      }
    }
  },

  barReveal: {
    name: 'barReveal',
    displayName: 'Bar Reveal',
    description: 'Element appears behind a horizontal bar',
    icon: '▬',
    defaultDuration: 800,
    variants: {
      hidden: { clipPath: 'inset(50% 0 50% 0)', opacity: 1 },
      visible: {
        clipPath: 'inset(0% 0 0% 0)',
        opacity: 1,
        transition: { ease: [0.4, 0, 0.2, 1] }
      }
    }
  },

  maskCircle: {
    name: 'maskCircle',
    displayName: 'Formmaske Kreis',
    description: 'Element reveals through a circular mask',
    icon: '⭕',
    defaultDuration: 900,
    variants: {
      hidden: { clipPath: 'circle(0% at 50% 50%)', opacity: 1 },
      visible: {
        clipPath: 'circle(75% at 50% 50%)',
        opacity: 1,
        transition: { ease: [0.4, 0, 0.2, 1] }
      }
    }
  },

  // ─── STROKE & SHAPE ─────────────────────────────────
  strokeDraw: {
    name: 'strokeDraw',
    displayName: 'Stroke Draw',
    description: 'Element draws its outline progressively',
    icon: '✏️',
    defaultDuration: 1200,
    variants: {
      hidden: { pathLength: 0, opacity: 0.5 },
      visible: {
        pathLength: 1,
        opacity: 1,
        transition: { ease: [0.4, 0, 0.2, 1] }
      }
    }
  },

  shapeAssembly: {
    name: 'shapeAssembly',
    displayName: 'Shape-Aufbau',
    description: 'Element assembles from scattered pieces',
    icon: '🧩',
    defaultDuration: 1000,
    variants: {
      hidden: { opacity: 0, scale: 0.5, rotate: -45, y: 30 },
      visible: {
        opacity: 1,
        scale: 1,
        rotate: 0,
        y: 0,
        transition: {
          type: 'spring',
          stiffness: 150,
          damping: 15
        }
      }
    }
  },

  // ─── GLITCH & DIGITAL ───────────────────────────────
  glitch: {
    name: 'glitch',
    displayName: 'Glitch',
    description: 'Digital glitch effect with rapid flickers',
    icon: '⚡',
    defaultDuration: 600,
    variants: {
      hidden: { opacity: 0, x: 0, skewX: 0 },
      visible: {
        opacity: [0, 1, 0.7, 1, 0.8, 1],
        x: [0, -5, 8, -3, 4, 0],
        skewX: [0, -5, 3, -2, 1, 0],
        transition: { times: [0, 0.15, 0.3, 0.5, 0.75, 1] }
      }
    }
  },

  rgbSplit: {
    name: 'rgbSplit',
    displayName: 'RGB Split',
    description: 'Chromatic aberration / RGB offset effect',
    icon: '🌈',
    defaultDuration: 700,
    variants: {
      hidden: {
        opacity: 0,
        textShadow: '-8px 0 #ff0000, 8px 0 #0000ff',
        filter: 'blur(4px)'
      },
      visible: {
        opacity: 1,
        textShadow: '0px 0 #ff0000, 0px 0 #0000ff',
        filter: 'blur(0px)',
        transition: { ease: [0.4, 0, 0.2, 1] }
      }
    }
  },

  scanlines: {
    name: 'scanlines',
    displayName: 'Scanlines',
    description: 'CRT scanline reveal effect',
    icon: '📺',
    defaultDuration: 800,
    variants: {
      hidden: {
        opacity: 0,
        filter: 'brightness(2) contrast(2)',
        scaleY: 1.05
      },
      visible: {
        opacity: [0, 0.3, 0.7, 0.4, 1],
        filter: 'brightness(1) contrast(1)',
        scaleY: 1,
        transition: { times: [0, 0.2, 0.5, 0.7, 1] }
      }
    }
  },

  // ─── LIGHT & SHINE ──────────────────────────────────
  lightSweep: {
    name: 'lightSweep',
    displayName: 'Light Sweep',
    description: 'A light sweep passes over the element',
    icon: '✨',
    defaultDuration: 1000,
    variants: {
      hidden: {
        opacity: 0.6,
        filter: 'brightness(0.5)',
        x: -20
      },
      visible: {
        opacity: 1,
        filter: 'brightness(1)',
        x: 0,
        transition: { ease: [0.4, 0, 0.2, 1] }
      }
    }
  },

  lightShadow: {
    name: 'lightShadow',
    displayName: 'Licht & Schatten',
    description: 'Element appears with dramatic light/shadow',
    icon: '🌗',
    defaultDuration: 1200,
    variants: {
      hidden: {
        opacity: 0,
        filter: 'brightness(0) drop-shadow(0 0 0px rgba(255,255,255,0))'
      },
      visible: {
        opacity: 1,
        filter: 'brightness(1) drop-shadow(0 4px 20px rgba(255,255,255,0.3))',
        transition: { ease: [0.4, 0, 0.2, 1] }
      }
    }
  },

  // ─── MOTION ─────────────────────────────────────────
  motionBlur: {
    name: 'motionBlur',
    displayName: 'Motion Blur',
    description: 'Fast move with blur effect',
    icon: '💨',
    defaultDuration: 400,
    variants: {
      hidden: { opacity: 0, x: -80, filter: 'blur(10px)' },
      visible: {
        opacity: 1,
        x: 0,
        filter: 'blur(0px)',
        transition: { ease: [0.16, 1, 0.3, 1] }
      }
    }
  },

  slowDrift: {
    name: 'slowDrift',
    displayName: 'Langsame Drift',
    description: 'Slow cinematic camera drift',
    icon: '🎬',
    defaultDuration: 3000,
    variants: {
      hidden: { x: -30, y: -10, opacity: 0.8 },
      visible: {
        x: 0,
        y: 0,
        opacity: 1,
        transition: { duration: 3, ease: [0.4, 0, 0.2, 1] }
      }
    }
  },

  parallaxDepth: {
    name: 'parallaxDepth',
    displayName: 'Parallax Depth',
    description: 'Element moves with depth/parallax feel',
    icon: '🏔',
    defaultDuration: 1200,
    variants: {
      hidden: { opacity: 0, y: 60, scale: 0.9 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { ease: [0.25, 0.46, 0.45, 0.94] }
      }
    }
  },

  subtle3D: {
    name: 'subtle3D',
    displayName: 'Dezente 3D-Tiefe',
    description: 'Subtle 3D depth rotation on appear',
    icon: '🧊',
    defaultDuration: 900,
    variants: {
      hidden: { opacity: 0, rotateX: 15, rotateY: -10, scale: 0.95 },
      visible: {
        opacity: 1,
        rotateX: 0,
        rotateY: 0,
        scale: 1,
        transition: { ease: [0.25, 0.46, 0.45, 0.94] }
      }
    }
  },

  // ─── PARTICLE & DISSOLVE ────────────────────────────
  particleBuild: {
    name: 'particleBuild',
    displayName: 'Partikel-Aufbau',
    description: 'Element builds up from scattered particles',
    icon: '🌟',
    defaultDuration: 1200,
    variants: {
      hidden: {
        opacity: 0,
        scale: 0.3,
        filter: 'blur(20px)',
        rotate: 10
      },
      visible: {
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
        rotate: 0,
        transition: {
          duration: 1.2,
          ease: [0.4, 0, 0.2, 1]
        }
      }
    }
  },

  particleDissolve: {
    name: 'particleDissolve',
    displayName: 'Partikel-Zerfall',
    description: 'Element dissolves into particles',
    icon: '💫',
    defaultDuration: 1000,
    variants: {
      hidden: { opacity: 1, scale: 1, filter: 'blur(0px)' },
      visible: {
        opacity: 0,
        scale: 1.2,
        filter: 'blur(15px)',
        transition: {
          duration: 1,
          ease: [0.4, 0, 0.2, 1]
        }
      }
    }
  },

  // ─── DRAMATIC ───────────────────────────────────────
  explode: {
    name: 'explode',
    displayName: 'Explode',
    description: 'Element explodes outward and disappears',
    icon: '💣',
    defaultDuration: 800,
    variants: {
      hidden: { opacity: 1, scale: 1 },
      visible: {
        opacity: 0,
        scale: [1, 1.1, 2.5],
        filter: ['blur(0px)', 'blur(0px)', 'blur(8px)'],
        transition: { times: [0, 0.2, 1], ease: [0.4, 0, 1, 1] }
      }
    }
  },

  liquidReveal: {
    name: 'liquidReveal',
    displayName: 'Liquid Reveal',
    description: 'Fluid/liquid-like reveal with distortion',
    icon: '🌊',
    defaultDuration: 1000,
    variants: {
      hidden: {
        opacity: 0,
        scaleY: 0.6,
        scaleX: 1.2,
        filter: 'blur(8px)',
        y: 40
      },
      visible: {
        opacity: 1,
        scaleY: 1,
        scaleX: 1,
        filter: 'blur(0px)',
        y: 0,
        transition: {
          type: 'spring',
          stiffness: 100,
          damping: 15
        }
      }
    }
  },

  smokeReveal: {
    name: 'smokeReveal',
    displayName: 'Smoke Reveal',
    description: 'Element emerges from smoke/fog',
    icon: '🌫️',
    defaultDuration: 1500,
    variants: {
      hidden: {
        opacity: 0,
        filter: 'blur(30px) brightness(1.5)',
        scale: 1.1,
        y: 20
      },
      visible: {
        opacity: 1,
        filter: 'blur(0px) brightness(1)',
        scale: 1,
        y: 0,
        transition: {
          duration: 1.5,
          ease: [0.4, 0, 0.2, 1]
        }
      }
    }
  },

  depthOfField: {
    name: 'depthOfField',
    displayName: 'Tiefenschärfe',
    description: 'Element comes into focus like a camera lens',
    icon: '📷',
    defaultDuration: 1000,
    variants: {
      hidden: {
        opacity: 0.5,
        filter: 'blur(12px)',
        scale: 1.05
      },
      visible: {
        opacity: 1,
        filter: 'blur(0px)',
        scale: 1,
        transition: {
          duration: 1,
          ease: [0.4, 0, 0.2, 1]
        }
      }
    }
  },
};

// Category definitions for UI grouping
export interface PresetCategory {
  name: string;
  presets: AnimationPresetName[];
}

export const presetCategories: PresetCategory[] = [
  {
    name: 'Fade',
    presets: ['none', 'fadeIn', 'fadeOut', 'softFadeOut'],
  },
  {
    name: 'Slide',
    presets: ['slideInLeft', 'slideInRight', 'slideInTop', 'slideInBottom', 'slideOutLeft', 'slideOutRight'],
  },
  {
    name: 'Scale & Zoom',
    presets: ['scaleIn', 'scaleOut', 'scalePop', 'zoomIn', 'zoomOut', 'cameraPush'],
  },
  {
    name: 'Rotation',
    presets: ['rotate', 'rotationReveal', 'flipIn', 'flipInY'],
  },
  {
    name: 'Bounce & Elastic',
    presets: ['bounce', 'elasticIn', 'elasticScale', 'pulse', 'shake'],
  },
  {
    name: 'Reveal & Mask',
    presets: ['wipeRight', 'wipeDown', 'wipeLeft', 'barReveal', 'maskCircle'],
  },
  {
    name: 'Stroke & Shape',
    presets: ['strokeDraw', 'shapeAssembly'],
  },
  {
    name: 'Glitch & Digital',
    presets: ['glitch', 'rgbSplit', 'scanlines'],
  },
  {
    name: 'Licht & Shine',
    presets: ['lightSweep', 'lightShadow'],
  },
  {
    name: 'Motion',
    presets: ['motionBlur', 'slowDrift', 'parallaxDepth', 'subtle3D'],
  },
  {
    name: 'Partikel & Dissolve',
    presets: ['particleBuild', 'particleDissolve'],
  },
  {
    name: 'Dramatisch',
    presets: ['explode', 'liquidReveal', 'smokeReveal', 'depthOfField'],
  },
];

// Helper function to get preset by name
export function getAnimationPreset(name: AnimationPresetName): AnimationPreset {
  return animationPresets[name];
}

// Get all preset names as array
export const animationPresetNames = Object.keys(animationPresets) as AnimationPresetName[];
