import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Undo2, Trash2, ImageOff } from "lucide-react";
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
}

export const AnnotationCanvas = forwardRef<AnnotationCanvasHandle, AnnotationCanvasProps>(function AnnotationCanvas(
  { imageUrl, alt, active, lineWidth, overlayImageUrl },
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

  return (
    <div ref={containerRef} className="relative flex flex-1 items-center justify-center overflow-hidden bg-black/40 p-4">
      {imageUrl ? (
        <>
          <img
            ref={imgRef}
            src={imageUrl}
            alt={alt}
            className="max-h-full max-w-full rounded-md object-contain shadow-2xl"
            onLoad={(e) => {
              const img = e.currentTarget;
              setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
              updateBox();
            }}
          />
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
