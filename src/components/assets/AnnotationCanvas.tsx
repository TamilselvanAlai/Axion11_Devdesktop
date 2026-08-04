import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Undo2, Trash2, ImageOff, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { detectShape, type Point } from "@/utils/shapeDetection";

type StrokeTool = "pen" | "circle" | "rectangle" | "triangle";

interface Stroke {
  id: string;
  tool: StrokeTool;
  points: Point[];
  color: string;
  width: number;
}

const STROKE_COLOR = "#FF4444";

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.points.length === 0) return;
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (stroke.tool === "pen") {
    if (stroke.points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (const p of stroke.points.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  } else if (stroke.tool === "circle") {
    const [center, edge] = stroke.points;
    if (!edge) return;
    const radius = Math.hypot(edge.x - center.x, edge.y - center.y);
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  } else if (stroke.tool === "rectangle") {
    const [a, b] = stroke.points;
    if (!b) return;
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
  } else if (stroke.tool === "triangle") {
    const [p1, p2, p3] = stroke.points;
    if (!p2 || !p3) return;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.stroke();
  }
}

export interface AnnotationCanvasHandle {
  hasStrokes: () => boolean;
  /** Centroid of every point across every stroke, in natural-image pixel space. */
  getMarkCenter: () => { x: number; y: number } | null;
  /** Bakes just the strokes onto a transparent-background PNG at natural image resolution,
   *  for attaching to a comment — null when there's nothing drawn. */
  exportAnnotationImage: () => string | null;
  /** Clears strokes — call after a comment carrying them has been saved. */
  clear: () => void;
}

interface AnnotationCanvasProps {
  imageUrl: string | null;
  alt: string;
  /** Whether the pen tool is currently armed — when false the canvas is purely visual (no pointer capture). */
  active: boolean;
  lineWidth: number;
  /** A saved annotation's image (e.g. from a clicked comment) shown on top of the base image,
   *  aligned pixel-for-pixel with it. */
  overlayImageUrl?: string | null;
  /** Scroll-to-zoom level and pan offset (container-relative px) — controlled from the parent so
   *  two side-by-side panes can share the same values and zoom/pan together. Omit both (and
   *  onZoomPanChange) to disable zooming for this instance entirely. */
  zoom?: number;
  pan?: { x: number; y: number };
  onZoomPanChange?: (zoom: number, pan: { x: number; y: number }) => void;
  /** Two side-by-side panes share one zoom/pan state (see above) — showing the on-screen zoom
   *  controls on both would just duplicate the same buttons twice for one shared value. Defaults
   *  to true; the compare modal sets this false on one of its two panes. */
  showZoomControls?: boolean;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

export const AnnotationCanvas = forwardRef<AnnotationCanvasHandle, AnnotationCanvasProps>(function AnnotationCanvas(
  { imageUrl, alt, active, lineWidth, overlayImageUrl, zoom = 1, pan = { x: 0, y: 0 }, onZoomPanChange, showZoomControls = true },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [history, setHistory] = useState<Stroke[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const updateBox = useCallback(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    const imgRect = img.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    if (imgRect.width === 0 || imgRect.height === 0) return;
    setBox({
      left: imgRect.left - containerRect.left,
      top: imgRect.top - containerRect.top,
      width: imgRect.width,
      height: imgRect.height,
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(updateBox);
    observer.observe(container);
    return () => observer.disconnect();
  }, [updateBox]);

  // Zoom/pan only transforms the image, not the container — a ResizeObserver on the container
  // won't fire for that, so re-measure the image's on-screen box explicitly whenever they change.
  // The image's transform is CSS-transitioned (see the wrapper div below), but this measurement
  // isn't — getBoundingClientRect() here reads the pre-transition position, since the effect
  // fires right after the DOM update commits, before the transition has actually finished
  // animating. Without the trailing re-measurement below, the canvas/annotation overlay (which
  // is positioned from this same `box` state) would snap to the stale position immediately while
  // the image glides smoothly past it — a visible desync between the two during every zoom step.
  useEffect(() => {
    updateBox();
    const timer = setTimeout(updateBox, 110);
    return () => clearTimeout(timer);
  }, [zoom, pan.x, pan.y, updateBox]);

  // Shared by wheel-zoom and the +/- buttons: changes zoom while keeping the given point
  // (container-relative px) stationary on screen across the change.
  const zoomAround = useCallback(
    (cx: number, cy: number, nextZoomRaw: number) => {
      if (!onZoomPanChange) return;
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoomRaw));
      if (nextZoom <= MIN_ZOOM + 0.001) {
        onZoomPanChange(MIN_ZOOM, { x: 0, y: 0 });
        return;
      }
      if (nextZoom === zoom) return;
      onZoomPanChange(nextZoom, {
        x: cx - ((cx - pan.x) * nextZoom) / zoom,
        y: cy - ((cy - pan.y) * nextZoom) / zoom,
      });
    },
    [zoom, pan, onZoomPanChange]
  );

  // Native (non-passive) wheel listener: React's synthetic onWheel is passive by default, which
  // silently ignores preventDefault() and lets the page/container scroll instead of zooming.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onZoomPanChange) return;
    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = container!.getBoundingClientRect();
      zoomAround(e.clientX - rect.left, e.clientY - rect.top, zoom * Math.exp(-e.deltaY * 0.0015));
    }
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [zoom, zoomAround, onZoomPanChange]);

  const ZOOM_BUTTON_STEP = 1.25;

  // Zoom in/out buttons zoom around the container's center rather than a cursor position.
  function handleZoomInButton() {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    zoomAround(rect.width / 2, rect.height / 2, zoom * ZOOM_BUTTON_STEP);
  }

  function handleZoomOutButton() {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    zoomAround(rect.width / 2, rect.height / 2, zoom / ZOOM_BUTTON_STEP);
  }

  function handlePanMouseDown(e: React.MouseEvent) {
    if (active || zoom <= MIN_ZOOM || !onZoomPanChange) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startPan = pan;
    function handleMove(moveEvent: MouseEvent) {
      onZoomPanChange!(zoom, { x: startPan.x + (moveEvent.clientX - startX), y: startPan.y + (moveEvent.clientY - startY) });
    }
    function handleUp() {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    }
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  }

  useEffect(() => {
    setStrokes([]);
    setCurrentStroke(null);
    setHistory([[]]);
    setHistoryIndex(0);
    setNaturalSize(null);
  }, [imageUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokes) drawStroke(ctx, stroke);
    if (currentStroke) drawStroke(ctx, currentStroke);
  }, [strokes, currentStroke, box]);

  useImperativeHandle(
    ref,
    () => ({
      hasStrokes: () => strokes.length > 0,
      getMarkCenter: () => {
        const allPoints = strokes.flatMap((s) => s.points);
        if (allPoints.length === 0) return null;
        return {
          x: allPoints.reduce((sum, p) => sum + p.x, 0) / allPoints.length,
          y: allPoints.reduce((sum, p) => sum + p.y, 0) / allPoints.length,
        };
      },
      exportAnnotationImage: () => {
        if (strokes.length === 0) return null;
        const w = naturalSize?.w || canvasRef.current?.width || 1920;
        const h = naturalSize?.h || canvasRef.current?.height || 1080;
        const out = document.createElement("canvas");
        out.width = w;
        out.height = h;
        const ctx = out.getContext("2d");
        if (!ctx) return null;
        for (const stroke of strokes) drawStroke(ctx, stroke);
        return out.toDataURL("image/png");
      },
      clear: () => {
        setStrokes([]);
        setCurrentStroke(null);
        setHistory([[]]);
        setHistoryIndex(0);
      },
    }),
    [strokes, naturalSize]
  );

  function toCanvasPoint(e: React.MouseEvent): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const widthScale = canvas.width / rect.width;
    setCurrentStroke({
      id: `${Date.now()}`,
      tool: "pen",
      points: [toCanvasPoint(e)],
      color: STROKE_COLOR,
      width: lineWidth * widthScale,
    });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!currentStroke) return;
    setCurrentStroke({ ...currentStroke, points: [...currentStroke.points, toCanvasPoint(e)] });
  }

  function commitStroke() {
    if (!currentStroke) return;
    let finalStroke = currentStroke;
    if (currentStroke.points.length >= 8) {
      const detected = detectShape(currentStroke.points);
      if (detected.type) finalStroke = { ...currentStroke, tool: detected.type, points: detected.points };
    }
    const nextStrokes = [...strokes, finalStroke];
    setStrokes(nextStrokes);
    setCurrentStroke(null);
    const nextHistory = [...history.slice(0, historyIndex + 1), nextStrokes];
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  }

  function handleUndo() {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    setStrokes(history[nextIndex]);
  }

  function handleClear() {
    if (strokes.length === 0) return;
    setStrokes([]);
    const nextHistory = [...history.slice(0, historyIndex + 1), []];
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  }

  const canPan = Boolean(onZoomPanChange) && zoom > MIN_ZOOM && !active;

  return (
    <div
      ref={containerRef}
      onMouseDown={handlePanMouseDown}
      className="relative flex flex-1 items-center justify-center overflow-hidden bg-black/40 p-4"
      style={{ cursor: canPan ? "grab" : undefined }}
    >
      {imageUrl ? (
        <>
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              // Smooths the +/- zoom buttons' 25%-per-click jumps into a motion instead of an
              // instant snap (which read as a flicker) — short enough to still feel responsive
              // during continuous scroll-wheel zooming rather than visibly lagging behind it.
              transition: "transform 100ms ease-out",
            }}
          >
            <img
              ref={imgRef}
              src={imageUrl}
              alt={alt}
              draggable={false}
              className="max-h-full max-w-full rounded-md object-contain shadow-2xl"
              onLoad={(e) => {
                const img = e.currentTarget;
                setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                updateBox();
              }}
            />
          </div>
          {overlayImageUrl && (
            <img
              src={overlayImageUrl}
              alt="Marked area"
              className="absolute pointer-events-none"
              style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
            />
          )}
          <canvas
            ref={canvasRef}
            width={naturalSize?.w || 1920}
            height={naturalSize?.h || 1080}
            className="absolute"
            style={{
              left: box.left,
              top: box.top,
              width: box.width,
              height: box.height,
              cursor: active ? "crosshair" : "default",
              pointerEvents: active ? "auto" : "none",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={commitStroke}
            onMouseLeave={commitStroke}
          />
          {strokes.length > 0 && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                aria-label="Undo annotation"
                className="flex size-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Undo2 className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear annotations"
                className="flex size-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          )}
          {onZoomPanChange && showZoomControls && (
            <div className="absolute bottom-3 left-3 flex items-center gap-0.5 rounded-full bg-black/60 p-1 text-xs font-medium text-white">
              <button
                type="button"
                onClick={handleZoomOutButton}
                disabled={zoom <= MIN_ZOOM}
                aria-label="Zoom out"
                title="Zoom out"
                className="flex size-6 items-center justify-center rounded-full transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ZoomOut className="size-3" />
              </button>
              <span className="min-w-[3.5ch] text-center tabular-nums">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={handleZoomInButton}
                disabled={zoom >= MAX_ZOOM}
                aria-label="Zoom in"
                title="Zoom in"
                className="flex size-6 items-center justify-center rounded-full transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ZoomIn className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => onZoomPanChange(MIN_ZOOM, { x: 0, y: 0 })}
                disabled={zoom <= MIN_ZOOM}
                aria-label="Reset zoom"
                title="Reset zoom"
                className="flex size-6 items-center justify-center rounded-full transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Maximize2 className="size-3" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 text-white/40">
          <ImageOff className="size-8" />
          <p className="text-xs">No preview available</p>
        </div>
      )}
    </div>
  );
});
