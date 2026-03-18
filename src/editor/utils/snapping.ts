import { CanvasElement } from '../../types/project';
import { SnapGuide } from '../../store/useViewportStore';

const SNAP_THRESHOLD = 5; // px in canvas coordinates

interface SnapResult {
  x: number;
  y: number;
  guides: SnapGuide[];
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Compute snap position and alignment guides for a dragged element.
 */
export function computeSnap(
  dragging: { id: string; x: number; y: number; w: number; h: number },
  allElements: CanvasElement[],
  canvasW: number,
  canvasH: number,
): SnapResult {
  const guides: SnapGuide[] = [];
  let snappedX = dragging.x;
  let snappedY = dragging.y;
  let bestDx = SNAP_THRESHOLD + 1;
  let bestDy = SNAP_THRESHOLD + 1;

  // Dragged element edges and center
  const dragLeft = dragging.x;
  const dragRight = dragging.x + dragging.w;
  const dragCenterX = dragging.x + dragging.w / 2;
  const dragTop = dragging.y;
  const dragBottom = dragging.y + dragging.h;
  const dragCenterY = dragging.y + dragging.h / 2;

  // Reference rects: other elements + canvas
  const refs: Rect[] = allElements
    .filter((el) => el.id !== dragging.id && el.visible)
    .map((el) => ({ x: el.position.x, y: el.position.y, w: el.size.width, h: el.size.height }));

  // Canvas as a reference rect
  refs.push({ x: 0, y: 0, w: canvasW, h: canvasH });

  // Horizontal snapping candidates (x-axis)
  const xCandidates: { dist: number; snapX: number; guide: SnapGuide }[] = [];
  // Vertical snapping candidates (y-axis)
  const yCandidates: { dist: number; snapY: number; guide: SnapGuide }[] = [];

  for (const ref of refs) {
    const refLeft = ref.x;
    const refRight = ref.x + ref.w;
    const refCenterX = ref.x + ref.w / 2;
    const refTop = ref.y;
    const refBottom = ref.y + ref.h;
    const refCenterY = ref.y + ref.h / 2;

    // Vertical range for guide lines
    const guideTop = Math.min(dragTop, refTop);
    const guideBottom = Math.max(dragBottom, refBottom);

    // Horizontal range for guide lines
    const guideLeft = Math.min(dragLeft, refLeft);
    const guideRight = Math.max(dragRight, refRight);

    // --- X-axis snap (vertical guide lines) ---
    // Left edge → left edge
    addXSnap(xCandidates, dragLeft, refLeft, 0, guideTop, guideBottom);
    // Right edge → right edge
    addXSnap(xCandidates, dragRight, refRight, -(dragging.w), guideTop, guideBottom);
    // Left edge → right edge
    addXSnap(xCandidates, dragLeft, refRight, 0, guideTop, guideBottom);
    // Right edge → left edge
    addXSnap(xCandidates, dragRight, refLeft, -(dragging.w), guideTop, guideBottom);
    // Center → center
    addXSnap(xCandidates, dragCenterX, refCenterX, -(dragging.w / 2), guideTop, guideBottom);

    // --- Y-axis snap (horizontal guide lines) ---
    // Top → top
    addYSnap(yCandidates, dragTop, refTop, 0, guideLeft, guideRight);
    // Bottom → bottom
    addYSnap(yCandidates, dragBottom, refBottom, -(dragging.h), guideLeft, guideRight);
    // Top → bottom
    addYSnap(yCandidates, dragTop, refBottom, 0, guideLeft, guideRight);
    // Bottom → top
    addYSnap(yCandidates, dragBottom, refTop, -(dragging.h), guideLeft, guideRight);
    // Center → center
    addYSnap(yCandidates, dragCenterY, refCenterY, -(dragging.h / 2), guideLeft, guideRight);
  }

  // Pick best X snap
  for (const c of xCandidates) {
    if (c.dist < bestDx) {
      bestDx = c.dist;
      snappedX = c.snapX;
    }
  }
  // Collect all guides at best X distance
  if (bestDx <= SNAP_THRESHOLD) {
    for (const c of xCandidates) {
      if (Math.abs(c.dist - bestDx) < 0.5) {
        guides.push(c.guide);
      }
    }
  } else {
    snappedX = dragging.x;
  }

  // Pick best Y snap
  for (const c of yCandidates) {
    if (c.dist < bestDy) {
      bestDy = c.dist;
      snappedY = c.snapY;
    }
  }
  if (bestDy <= SNAP_THRESHOLD) {
    for (const c of yCandidates) {
      if (Math.abs(c.dist - bestDy) < 0.5) {
        guides.push(c.guide);
      }
    }
  } else {
    snappedY = dragging.y;
  }

  return { x: snappedX, y: snappedY, guides };
}

function addXSnap(
  candidates: { dist: number; snapX: number; guide: SnapGuide }[],
  dragEdge: number,
  refEdge: number,
  offset: number,
  guideTop: number,
  guideBottom: number,
) {
  const dist = Math.abs(dragEdge - refEdge);
  if (dist <= SNAP_THRESHOLD) {
    candidates.push({
      dist,
      snapX: refEdge + offset,
      guide: { orientation: 'vertical', position: refEdge, start: guideTop, end: guideBottom },
    });
  }
}

function addYSnap(
  candidates: { dist: number; snapY: number; guide: SnapGuide }[],
  dragEdge: number,
  refEdge: number,
  offset: number,
  guideLeft: number,
  guideRight: number,
) {
  const dist = Math.abs(dragEdge - refEdge);
  if (dist <= SNAP_THRESHOLD) {
    candidates.push({
      dist,
      snapY: refEdge + offset,
      guide: { orientation: 'horizontal', position: refEdge, start: guideLeft, end: guideRight },
    });
  }
}
