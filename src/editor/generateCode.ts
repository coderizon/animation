/**
 * Generates a runnable api script from the current project state.
 * The generated code, when executed in the Script Panel, reproduces
 * all elements, animations, keyframes, effects and camera keyframes.
 */
import type { Project, CanvasElement, AnimationConfig, Keyframe, Effect, CameraKeyframe } from '../types/project';

function str(s: string): string {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/**
 * Try to recover a clean /assets/filename.svg path from a Vite-resolved URL.
 * Vite may return "/assets/filename-HASH.svg" or a data: URI in dev mode.
 */
function cleanAssetSrc(src: string): string {
  // Already a clean path
  if (src.startsWith('/assets/') && !src.includes('?')) return src;

  // Vite dev server URL like "/assets/claude.svg" or with hash
  const assetMatch = src.match(/\/assets\/([^?#]+)/);
  if (assetMatch) return `/assets/${assetMatch[1]}`;

  // Data URI — try to extract filename from an embedded <title> tag
  if (src.startsWith('data:')) {
    const titleMatch = src.match(/%3ctitle%3e([^%]+)%3c/i) ||
                       src.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      const name = titleMatch[1].toLowerCase().replace(/\s+/g, '-');
      return `/assets/${name}.svg`;
    }
    // Truncate for readability — mark as inline
    return '/* inline SVG data */';
  }

  return src;
}

function num(n: number): string {
  return String(Math.round(n * 100) / 100);
}

function genContentProps(el: CanvasElement): string {
  const c = el.content;
  const props: string[] = [];

  props.push(`  type: ${str(el.type)}`);
  props.push(`  x: ${num(el.position.x)}`);
  props.push(`  y: ${num(el.position.y)}`);
  props.push(`  width: ${num(el.size.width)}`);
  props.push(`  height: ${num(el.size.height)}`);

  if (el.rotation) props.push(`  rotation: ${num(el.rotation)}`);
  if (el.name) props.push(`  name: ${str(el.name)}`);

  switch (c.type) {
    case 'shape':
      props.push(`  shape: ${str(c.shape)}`);
      props.push(`  fill: ${str(c.fill)}`);
      if (c.stroke) props.push(`  stroke: ${str(c.stroke)}`);
      if (c.strokeWidth) props.push(`  strokeWidth: ${num(c.strokeWidth)}`);
      if (c.borderRadius) props.push(`  borderRadius: ${num(c.borderRadius)}`);
      break;
    case 'text':
      props.push(`  text: ${str(c.text)}`);
      props.push(`  fontSize: ${num(c.fontSize)}`);
      props.push(`  fontFamily: ${str(c.fontFamily)}`);
      props.push(`  color: ${str(c.color)}`);
      if (c.fontWeight) props.push(`  fontWeight: ${num(c.fontWeight)}`);
      break;
    case 'logo':
      props.push(`  src: ${str(cleanAssetSrc(c.src))}`);
      break;
    case 'image':
      props.push(`  src: ${str(cleanAssetSrc(c.src))}`);
      break;
    case 'widget':
      props.push(`  widgetName: ${str(c.widgetName)}`);
      props.push(`  fps: ${num(c.fps)}`);
      props.push(`  durationInFrames: ${num(c.durationInFrames)}`);
      if (c.props && Object.keys(c.props).length > 0) {
        props.push(`  props: ${JSON.stringify(c.props)}`);
      }
      break;
  }

  return props.join(',\n');
}

function genAnimation(varName: string, anim: AnimationConfig): string {
  const parts = [
    `  preset: ${str(anim.preset)}`,
    `  delay: ${num(anim.delay)}`,
    `  duration: ${num(anim.duration)}`,
    `  easing: ${str(anim.easing)}`,
  ];
  return `api.addAnimation(${varName}, {\n${parts.join(',\n')},\n});`;
}

function genKeyframe(varName: string, kf: Keyframe): string {
  const parts: string[] = [
    `  time: ${num(kf.time)}`,
    `  x: ${num(kf.x)}`,
    `  y: ${num(kf.y)}`,
  ];
  if (kf.width != null) parts.push(`  width: ${num(kf.width)}`);
  if (kf.height != null) parts.push(`  height: ${num(kf.height)}`);
  if (kf.rotation != null) parts.push(`  rotation: ${num(kf.rotation)}`);
  if (kf.fill) parts.push(`  fill: ${str(kf.fill)}`);
  if (kf.stroke) parts.push(`  stroke: ${str(kf.stroke)}`);
  if (kf.strokeWidth != null) parts.push(`  strokeWidth: ${num(kf.strokeWidth)}`);
  if (kf.borderRadius != null) parts.push(`  borderRadius: ${num(kf.borderRadius)}`);
  if (kf.color) parts.push(`  color: ${str(kf.color)}`);
  if (kf.fontSize != null) parts.push(`  fontSize: ${num(kf.fontSize)}`);
  return `api.addKeyframe(${varName}, {\n${parts.join(',\n')},\n});`;
}

function genEffect(varName: string, eff: Effect): string {
  const args = [varName, str(eff.type)];
  if (eff.intensity !== 1.0) args.push(num(eff.intensity));
  if (eff.speed !== 1.0) {
    if (eff.intensity === 1.0) args.push('1.0');
    args.push(num(eff.speed));
  }
  return `api.addEffect(${args.join(', ')});`;
}

function genCameraKeyframe(kf: CameraKeyframe): string {
  return `api.addCameraKeyframe({ time: ${num(kf.time)}, x: ${num(kf.x)}, y: ${num(kf.y)}, zoomX: ${num(kf.zoomX)}, zoomY: ${num(kf.zoomY)} });`;
}

function sanitizeVarName(name: string): string {
  // Convert element name to a valid JS variable name
  let v = name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^(\d)/, '_$1')
    .replace(/_+/g, '_')
    .replace(/_$/, '');
  if (!v) v = 'el';
  return v.charAt(0).toLowerCase() + v.slice(1);
}

export function generateCodeFromProject(project: Project): string {
  const lines: string[] = [];
  lines.push('// Auto-generierter Code aus aktuellem Projekt');
  lines.push(`// Projekt: ${project.name}`);
  lines.push(`// ${project.elements.length} Elemente\n`);

  // Track variable names to avoid duplicates
  const usedNames = new Map<string, number>();

  for (const el of project.elements) {
    const baseName = sanitizeVarName(el.name || el.type);
    const count = usedNames.get(baseName) || 0;
    usedNames.set(baseName, count + 1);
    const varName = count === 0 ? baseName : `${baseName}${count + 1}`;

    // Element comment
    lines.push(`// --- ${el.name || el.type} ---`);

    // addElement
    lines.push(`const ${varName} = api.addElement({`);
    lines.push(genContentProps(el));
    lines.push(`});\n`);

    // Animations
    const anims = el.animations && el.animations.length > 0
      ? el.animations
      : el.animation ? [el.animation] : [];
    for (const anim of anims) {
      if (anim.preset === 'none') continue;
      lines.push(genAnimation(varName, anim));
    }

    // Keyframes (skip the auto-generated t=0 keyframe if it just matches the position)
    if (el.keyframes && el.keyframes.length > 0) {
      const kfs = el.keyframes.filter((kf) => {
        // Skip the auto t=0 keyframe if it only has x,y matching position
        if (kf.time === 0) {
          const hasExtraProps = kf.width != null || kf.height != null || kf.rotation != null ||
            kf.fill || kf.stroke || kf.color || kf.fontSize != null ||
            kf.strokeWidth != null || kf.borderRadius != null;
          if (!hasExtraProps &&
            Math.abs(kf.x - el.position.x) < 1 &&
            Math.abs(kf.y - el.position.y) < 1) {
            return false;
          }
        }
        return true;
      });
      for (const kf of kfs) {
        lines.push(genKeyframe(varName, kf));
      }
    }

    // Effects
    if (el.effects && el.effects.length > 0) {
      for (const eff of el.effects) {
        if (eff.enabled) {
          lines.push(genEffect(varName, eff));
        }
      }
    }

    lines.push(''); // blank line between elements
  }

  // Camera keyframes
  const camKfs = project.cameraKeyframes;
  if (camKfs && camKfs.length > 0) {
    lines.push('// --- Kamera-Keyframes ---');
    for (const kf of camKfs) {
      lines.push(genCameraKeyframe(kf));
    }
    lines.push('');
  }

  lines.push(`api.log('${project.elements.length} Elemente erstellt');`);

  return lines.join('\n');
}
