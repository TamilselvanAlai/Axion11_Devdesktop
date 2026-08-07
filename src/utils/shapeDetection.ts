export interface Point {
  x: number;
  y: number;
}

export type DetectedShapeType = "circle" | "rectangle" | "triangle" | null;

function polygonArea(points: Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    area += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(area) / 2;
}

function closedPerimeter(points: Point[]): number {
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    perimeter += Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }
  return perimeter;
}

/** Andrew's monotone chain — reduces a freehand path down to its convex outline. */
function convexHull(points: Point[]): Point[] {
  const pts = [...points].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  if (pts.length < 3) return pts;
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: Point[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Point[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

function rdp(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points;
  const first = points[0];
  const last = points[points.length - 1];
  let maxDist = -1;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist > tolerance) {
    const left = rdp(points.slice(0, index + 1), tolerance);
    const right = rdp(points.slice(index), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

/** Collapses a closed hull down to its dominant corners (e.g. 3 for a triangle, 4 for a rectangle)
 *  by duplicating the start point to close the ring, then running Douglas-Peucker over it. */
function simplifyClosed(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points;
  const simplified = rdp([...points, points[0]], tolerance);
  simplified.pop();
  return simplified;
}

/** Classifies a freehand closed-ish path as a circle, rectangle, or triangle, and returns the
 *  canonical point representation the renderer draws it from. Returns type: null (leave as
 *  freehand pen) when the path isn't confidently one of those shapes. Pure geometry, no ML:
 *  1. Require enough points and a large-enough bounding box to filter out jitter/clicks.
 *  2. Require the path to be roughly closed (end near start).
 *  3. High circularity (isoperimetric quotient, rotation-invariant) → circle.
 *  4. Otherwise, simplify the convex hull to its dominant corners: 3 → triangle, 4 (or
 *     moderate circularity as a fallback) → rectangle.
 */
export function detectShape(points: Point[]): { type: DetectedShapeType; points: Point[] } {
  if (points.length < 8) return { type: null, points };

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = maxX - minX;
  const h = maxY - minY;
  if (w < 15 || h < 15) return { type: null, points };

  const diag = Math.hypot(w, h);
  const closingDist = Math.hypot(points[points.length - 1].x - points[0].x, points[points.length - 1].y - points[0].y);
  if (closingDist > diag * 0.4) return { type: null, points };

  const hull = convexHull(points);

  // Check for straight edges (corners) first, before circularity — a cleanly-drawn square's
  // circularity (~0.785, the isoperimetric quotient of a square) is mathematically *higher*
  // than the 0.70 circle bar below, so checking circularity first swallows every square-ish
  // rectangle into "circle" before this code ever runs. A shape with straight sides collapses
  // to a handful of dominant corners under Douglas-Peucker simplification; a genuine curve
  // doesn't (it keeps many corners at any reasonable tolerance), so leading with the corner
  // count is what actually distinguishes them — circularity alone can't.
  const corners = simplifyClosed(hull, diag * 0.08);
  if (corners.length === 3) {
    return { type: "triangle", points: corners };
  }
  if (corners.length === 4) {
    return { type: "rectangle", points: [{ x: minX, y: minY }, { x: maxX, y: maxY }] };
  }

  // No clean 3/4-corner polygon — likely a curve (or a messy blob). Isoperimetric quotient:
  // 4π·area / perimeter², computed from the hull rather than the raw mouse-tracked points — a
  // mouse (unlike a stylus) is jittery enough that the raw path can wobble back on itself
  // slightly, and the shoelace area formula is very sensitive to that self-crossing. The hull is
  // immune to it (already just the outer boundary). A perfect circle scores 1; more elongated
  // or irregular blobs score progressively lower.
  const area = polygonArea(hull);
  const perimeter = closedPerimeter(hull);
  if (perimeter === 0) return { type: null, points };
  const circularity = (4 * Math.PI * area) / (perimeter * perimeter);

  if (circularity >= 0.7) {
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
    const radius = points.reduce((s, p) => s + Math.hypot(p.x - cx, p.y - cy), 0) / points.length;
    return { type: "circle", points: [{ x: cx, y: cy }, { x: cx + radius, y: cy }] };
  }
  if (circularity >= 0.35) {
    return { type: "rectangle", points: [{ x: minX, y: minY }, { x: maxX, y: maxY }] };
  }

  return { type: null, points }; // path too irregular to confidently snap — leave it as freehand pen
}
