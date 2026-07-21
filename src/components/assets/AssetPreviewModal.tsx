import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight, ImageOff, Layers } from "lucide-react";

interface AssetPreviewModalProps {
  imageUrl: string | null;
  filename: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  /** When provided, shows a "Review" button that opens the version-compare screen for this asset. */
  onReview?: () => void;
}

export function AssetPreviewModal({
  imageUrl,
  filename,
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  onReview,
}: AssetPreviewModalProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onPrev?.();
      if (e.key === "ArrowRight" && hasNext) onNext?.();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 p-8"
      onClick={onClose}
    >
      <div className="absolute right-4 top-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {onReview && (
          <button
            type="button"
            onClick={onReview}
            className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:bg-accent"
          >
            <Layers className="size-3.5" /> Review
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <X className="size-5" />
        </button>
      </div>

      <p className="absolute left-4 top-4 max-w-[70%] truncate text-sm text-white/70">{filename}</p>

      <div className="flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={filename}
            className="max-h-[75vh] max-w-full rounded-lg object-contain shadow-2xl"
          />
        ) : (
          <div className="flex h-64 w-64 flex-col items-center justify-center gap-2 rounded-lg bg-white/5 text-white/50">
            <ImageOff className="size-8" />
            <p className="text-xs">No preview available</p>
          </div>
        )}

        {(onPrev || onNext) && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onPrev}
              disabled={!hasPrev}
              aria-label="Previous image"
              className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              aria-label="Next image"
              className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
