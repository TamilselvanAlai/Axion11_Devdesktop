import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  X,
  Download,
  ImageOff,
  Check,
  Loader2,
  Rocket,
  PenTool,
  CircleDot,
  Image as ImageIcon,
  Columns2,
  SplitSquareHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AssetCommentsPanel } from "@/components/assets/AssetCommentsPanel";
import { AnnotationCanvas, type AnnotationCanvasHandle } from "@/components/assets/AnnotationCanvas";
import { EstablishedBadge } from "@/components/assets/EstablishedBadge";
import { getStatusMeta } from "@/utils/assetStatus";
import { formatRelativeTime } from "@/utils/formatters";
import { isUrl } from "@/utils/helpers";
import { assetService } from "@/services/asset.service";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";
import type { Asset } from "@/types";

type CompareLayout = "individual" | "side-by-side" | "slider";

interface AssetVersionCompareModalProps {
  /** Any version's id in the chain — the full chain is resolved from this. */
  assetId: string;
  onClose: () => void;
  /** Called after approve/reject/publish so the caller can refresh whatever list it owns. */
  onStatusChange?: () => void;
}

const WIDTH_PRESETS = [2, 4, 8, 12, 16];

function LineWidthPicker({ width, onChange }: { width: number; onChange: (w: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Line size"
        className="flex items-center gap-1.5 rounded-lg border border-border bg-white/5 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/10"
      >
        <CircleDot className="size-3" style={{ transform: `scale(${0.6 + Math.min(width, 16) / 20})` }} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg border border-border bg-popover p-3 shadow-xl">
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={width}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full"
          />
          <div className="mt-2 flex items-center justify-between">
            {WIDTH_PRESETS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => onChange(w)}
                aria-label={`Line size ${w}`}
                className={cn(
                  "flex size-6 items-center justify-center rounded-md transition-colors hover:bg-white/10",
                  width === w && "bg-primary/20"
                )}
              >
                <span className="rounded-full bg-current" style={{ width: Math.min(w, 14), height: Math.min(w, 14) }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VersionSelect({
  versions,
  value,
  exclude,
  onChange,
}: {
  versions: Asset[];
  value: string;
  exclude: string;
  onChange: (id: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full cursor-pointer appearance-none border-b border-white/10 bg-black/60 px-3 py-2 text-center text-xs font-medium text-white/80 outline-none"
    >
      {versions
        .filter((v) => v.id === value || v.id !== exclude)
        .map((v) => (
          <option key={v.id} value={v.id}>
            {v.version} · {v.name}
            {v.established ? " · VE" : ""}
          </option>
        ))}
    </select>
  );
}

export function AssetVersionCompareModal({ assetId, onClose, onStatusChange }: AssetVersionCompareModalProps) {
  const [versions, setVersions] = useState<Asset[] | null>(null);
  const [leftId, setLeftId] = useState<string>(assetId);
  const [rightId, setRightId] = useState<string>(assetId);
  const [deciding, setDeciding] = useState<"approve" | "reject" | "publish" | null>(null);
  const [drawingActive, setDrawingActive] = useState(false);
  const [drawingWidth, setDrawingWidth] = useState(4);
  const [compareLayout, setCompareLayout] = useState<CompareLayout>("side-by-side");
  const [sliderPosition, setSliderPosition] = useState(50);
  const [activeAnnotationUrl, setActiveAnnotationUrl] = useState<string | null>(null);
  const [sliderImgBox, setSliderImgBox] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const rightCanvasRef = useRef<AnnotationCanvasHandle>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const sliderImgRef = useRef<HTMLImageElement>(null);
  const user = useUser();
  const isQc = user?.role === "qc" || user?.role === "admin";

  // Drawing only applies to the side-by-side panes — slider mode composites a single clipped
  // image, so there's no per-image canvas to draw on there.
  useEffect(() => {
    if (compareLayout === "slider") setDrawingActive(false);
  }, [compareLayout]);

  // A markup overlay is tied to whichever version it was drawn on — don't leave it showing
  // once the user switches to a different version.
  useEffect(() => {
    setActiveAnnotationUrl(null);
  }, [rightId]);

  // The base image is object-contain'd inside a taller/wider container, so its actual rendered
  // rect (what the user can see) is usually smaller than the container — measure it so the
  // divider and the clipped overlay stay confined to the visible photo, not the whole pane.
  const updateSliderImgBox = useCallback(() => {
    const img = sliderImgRef.current;
    const container = sliderContainerRef.current;
    if (!img || !container) return;
    const imgRect = img.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    if (imgRect.width === 0 || imgRect.height === 0) return;
    setSliderImgBox({
      left: imgRect.left - containerRect.left,
      top: imgRect.top - containerRect.top,
      width: imgRect.width,
      height: imgRect.height,
    });
  }, []);

  useEffect(() => {
    if (compareLayout !== "slider") return;
    const container = sliderContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(updateSliderImgBox);
    observer.observe(container);
    return () => observer.disconnect();
  }, [compareLayout, updateSliderImgBox]);

  useEffect(() => {
    setSliderImgBox({ left: 0, top: 0, width: 0, height: 0 });
  }, [rightId]);

  const updateSliderFromClientX = useCallback(
    (clientX: number) => {
      const el = sliderContainerRef.current;
      if (!el || sliderImgBox.width === 0) return;
      const rect = el.getBoundingClientRect();
      // Percentage across the actual visible image, not the (often letterboxed) container.
      const pct = ((clientX - rect.left - sliderImgBox.left) / sliderImgBox.width) * 100;
      setSliderPosition(Math.min(100, Math.max(0, pct)));
    },
    [sliderImgBox.left, sliderImgBox.width]
  );

  function handleSliderDragStart(e: React.MouseEvent) {
    e.preventDefault();
    updateSliderFromClientX(e.clientX);
    function handleMove(moveEvent: MouseEvent) {
      updateSliderFromClientX(moveEvent.clientX);
    }
    function handleUp() {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    }
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  }

  useEffect(() => {
    let cancelled = false;
    assetService.getVersions(assetId).then((data) => {
      if (cancelled || data.length === 0) return;
      setVersions(data);
      // Default: compare v1 against whichever version was actually opened (not necessarily
      // the highest number — an editor reviewing an older version should land on that one).
      setLeftId(data[0].id);
      setRightId(data.find((v) => v.id === assetId)?.id ?? data[data.length - 1].id);
    });
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const left = versions?.find((v) => v.id === leftId);
  const right = versions?.find((v) => v.id === rightId);

  async function handleDecision(decision: "approve" | "reject" | "publish") {
    if (!right) return;
    setDeciding(decision);
    try {
      if (decision === "approve") await assetService.approveAsset(right.id);
      else if (decision === "reject") await assetService.rejectAsset(right.id);
      else await assetService.publishAsset(right.id);
      toast.success(
        decision === "approve" ? "Asset approved." : decision === "reject" ? "Asset rejected." : "Asset published live."
      );
      const refreshed = await assetService.getVersions(assetId);
      setVersions(refreshed);
      onStatusChange?.();
    } catch {
      toast.error(`Failed to ${decision} asset.`);
    } finally {
      setDeciding(null);
    }
  }

  function handleDownload() {
    if (!right || !isUrl(right.thumbnailColor)) {
      toast.error("No file available to download.");
      return;
    }
    window.open(right.thumbnailColor, "_blank");
  }

  const rightStatus = right ? getStatusMeta(right.status, right.version) : null;

  return (
    <div className="fixed inset-0 z-100 flex flex-col bg-background">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold">{right?.name ?? "Loading…"}</h2>
            {right && <span className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-xs text-foreground/70">{right.version}</span>}
            {right?.established && <EstablishedBadge />}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawingActive((a) => !a)}
            disabled={compareLayout === "slider"}
            aria-label="Draw (auto-shapes)"
            title={compareLayout === "slider" ? "Switch to side-by-side to draw" : "Draw (auto-shapes)"}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              drawingActive
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-white/5 hover:bg-white/10"
            )}
          >
            <PenTool className="size-3" /> Pen
          </button>
          {compareLayout !== "slider" && <LineWidthPicker width={drawingWidth} onChange={setDrawingWidth} />}
          <button
            type="button"
            onClick={handleDownload}
            disabled={!right}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-white/5 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="size-3" /> Download
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {versions && compareLayout !== "individual" && (
            <div className="flex shrink-0">
              <div className="flex-1">
                <VersionSelect versions={versions} value={leftId} exclude={rightId} onChange={setLeftId} />
              </div>
              <div className="flex-1">
                <VersionSelect versions={versions} value={rightId} exclude={leftId} onChange={setRightId} />
              </div>
            </div>
          )}
          {compareLayout === "individual" ? (
            <AnnotationCanvas
              ref={rightCanvasRef}
              imageUrl={right && isUrl(right.thumbnailColor) ? right.thumbnailColor : null}
              alt={right?.name ?? ""}
              active={drawingActive}
              lineWidth={drawingWidth}
              overlayImageUrl={activeAnnotationUrl}
            />
          ) : compareLayout === "side-by-side" ? (
            <div className="flex min-h-0 flex-1">
              <AnnotationCanvas
                imageUrl={left && isUrl(left.thumbnailColor) ? left.thumbnailColor : null}
                alt={left?.name ?? ""}
                active={drawingActive}
                lineWidth={drawingWidth}
              />
              <div className="w-px shrink-0 bg-white/10" />
              <AnnotationCanvas
                ref={rightCanvasRef}
                imageUrl={right && isUrl(right.thumbnailColor) ? right.thumbnailColor : null}
                alt={right?.name ?? ""}
                active={drawingActive}
                lineWidth={drawingWidth}
                overlayImageUrl={activeAnnotationUrl}
              />
            </div>
          ) : (
            <div
              ref={sliderContainerRef}
              onMouseDown={handleSliderDragStart}
              className="relative flex min-h-0 flex-1 cursor-ew-resize items-center justify-center overflow-hidden bg-black/40 p-4"
            >
              {right && isUrl(right.thumbnailColor) ? (
                <img
                  ref={sliderImgRef}
                  src={right.thumbnailColor}
                  alt={right.name}
                  className="pointer-events-none max-h-full max-w-full rounded-md object-contain shadow-2xl"
                  onLoad={updateSliderImgBox}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-white/40">
                  <ImageOff className="size-8" />
                  <p className="text-xs">No preview available</p>
                </div>
              )}
              {left && isUrl(left.thumbnailColor) && sliderImgBox.width > 0 && (
                <img
                  src={left.thumbnailColor}
                  alt={left.name}
                  className="pointer-events-none absolute rounded-md object-contain shadow-2xl"
                  style={{
                    left: sliderImgBox.left,
                    top: sliderImgBox.top,
                    width: sliderImgBox.width,
                    height: sliderImgBox.height,
                    clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                  }}
                />
              )}
              {sliderImgBox.width > 0 && (
              <div
                className="absolute w-0.5 bg-white"
                style={{
                  top: sliderImgBox.top,
                  height: sliderImgBox.height,
                  left: sliderImgBox.left + (sliderPosition / 100) * sliderImgBox.width,
                }}
              >
                <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 rounded-full bg-white px-1 py-1 shadow-lg">
                  <ChevronLeft className="size-3 text-black" />
                  <ChevronRight className="size-3 text-black" />
                </div>
              </div>
              )}
            </div>
          )}
        </div>

        <div className="flex w-80 shrink-0 flex-col border-l border-border bg-muted">
          <div className="shrink-0 border-b border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Versions
              </p>
              <div className="flex items-center gap-1 rounded-md border border-border bg-white/5 p-0.5">
                <button
                  type="button"
                  onClick={() => setCompareLayout("individual")}
                  aria-label="Individual view"
                  title="Individual view"
                  className={cn(
                    "flex size-6 items-center justify-center rounded transition-colors",
                    compareLayout === "individual" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ImageIcon className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCompareLayout("side-by-side")}
                  aria-label="Side-by-side view"
                  title="Side-by-side view"
                  className={cn(
                    "flex size-6 items-center justify-center rounded transition-colors",
                    compareLayout === "side-by-side" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Columns2 className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCompareLayout("slider")}
                  aria-label="Slider view"
                  title="Slider view"
                  className={cn(
                    "flex size-6 items-center justify-center rounded transition-colors",
                    compareLayout === "slider" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <SplitSquareHorizontal className="size-3.5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {versions?.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setRightId(v.id)}
                  className={`relative aspect-square overflow-hidden rounded-md bg-black/40 ring-2 transition-colors ${
                    v.id === rightId ? "ring-primary" : "ring-transparent hover:ring-white/20"
                  }`}
                >
                  {isUrl(v.thumbnailColor) ? (
                    <img src={v.thumbnailColor} alt={v.version} className="size-full object-contain" />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-white/5">
                      <ImageOff className="size-3 text-white/30" />
                    </div>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center text-[9px] font-semibold text-white">
                    {v.version}
                  </span>
                  {v.established && (
                    <span className="absolute right-0.5 top-0.5 flex size-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-black">
                      E
                    </span>
                  )}
                </button>
              ))}
            </div>
            {right && (
              <p className="mt-2 text-[10px] text-muted-foreground">
                {formatRelativeTime(right.updatedAt)} · {right.assignee.name}
              </p>
            )}
          </div>

          <div className="min-h-0 flex-1">
            {right && (
              <AssetCommentsPanel
                key={right.id}
                assetId={right.id}
                getAnnotation={() => {
                  const canvas = rightCanvasRef.current;
                  if (!canvas || !canvas.hasStrokes()) return null;
                  const image = canvas.exportAnnotationImage();
                  const center = canvas.getMarkCenter();
                  if (!image || !center) return null;
                  return { image, x: center.x, y: center.y };
                }}
                onAnnotationSubmitted={() => rightCanvasRef.current?.clear()}
                onActiveAnnotationChange={setActiveAnnotationUrl}
              />
            )}
          </div>

          {isQc && right && (
            <div className="shrink-0 border-t border-border p-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDecision("approve")}
                  disabled={deciding !== null || right.status === "approved" || right.status === "live"}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-success px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deciding === "approve" ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision("reject")}
                  disabled={deciding !== null || right.status === "rejected" || right.status === "live"}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-danger px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deciding === "reject" ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
                  Reject
                </button>
              </div>
              {right.status === "approved" && (
                <button
                  type="button"
                  onClick={() => handleDecision("publish")}
                  disabled={deciding !== null}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-info px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-info/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deciding === "publish" ? <Loader2 className="size-3 animate-spin" /> : <Rocket className="size-3" />}
                  Publish to Live
                </button>
              )}
              {rightStatus && (
                <p className={`mt-2 text-center text-[10px] ${rightStatus.textClass}`}>
                  Currently viewing: {rightStatus.label} — actions apply to {right.version}, not the latest version.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
