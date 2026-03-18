import { AnimationPreset } from '../types/animation';
import { AnimationPresetName } from '../types/project';

// Animation Preset Definitions

export const animationPresets: Record<AnimationPresetName, AnimationPreset> = {
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

  flipIn: {
    name: 'flipIn',
    displayName: 'Flip In',
    description: 'Element flips in from perspective',
    icon: '⟳',
    defaultDuration: 700,
    variants: {
      hidden: { opacity: 0, rotateY: 90 },
      visible: { opacity: 1, rotateY: 0 }
    }
  },
};

// Helper function to get preset by name
export function getAnimationPreset(name: AnimationPresetName): AnimationPreset {
  return animationPresets[name];
}

// Get all preset names as array
export const animationPresetNames = Object.keys(animationPresets) as AnimationPresetName[];
