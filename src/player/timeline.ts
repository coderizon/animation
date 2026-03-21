import { Project, Scene, getAnimations } from '../types/project';

export interface TimelineSlot {
  scene: Scene;
  globalStart: number;   // ms offset from timeline start
  duration: number;       // scene duration in ms
  transitionDuration: number; // overlap with previous scene
}

export interface Timeline {
  slots: TimelineSlot[];
  totalDuration: number;
}

/** Compute the effective duration of a single scene (manual or auto-calculated from content). */
function getSceneDuration(scene: Scene): number {
  // If the scene has an explicit duration, use it
  if (scene.duration && scene.duration > 0) return scene.duration;

  // Auto-calculate from elements: max(animation delay + duration, last keyframe time)
  let maxTime = 3000; // minimum default 3s
  for (const el of scene.elements) {
    const anims = getAnimations(el);
    for (const anim of anims) {
      const end = (anim.delay || 0) + (anim.duration || 1000);
      if (end > maxTime) maxTime = end;
    }
    if (el.keyframes) {
      for (const kf of el.keyframes) {
        if (kf.time > maxTime) maxTime = kf.time;
      }
    }
  }
  return maxTime;
}

/** Build a flat timeline of slots from a project's scenes. */
export function buildTimeline(project: Project): Timeline {
  const scenes = project.scenes && project.scenes.length > 0
    ? project.scenes
    : [{ id: 'default', name: 'Scene 1', elements: project.elements, cameraKeyframes: project.cameraKeyframes }] as Scene[];

  const slots: TimelineSlot[] = [];
  let cursor = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const duration = getSceneDuration(scene);
    const transitionDuration = (i > 0 && scene.transition?.duration) ? scene.transition.duration : 0;

    // Transition overlaps with previous scene
    const globalStart = Math.max(0, cursor - transitionDuration);

    slots.push({ scene, globalStart, duration, transitionDuration });
    cursor = globalStart + duration;
  }

  return { slots, totalDuration: cursor };
}
