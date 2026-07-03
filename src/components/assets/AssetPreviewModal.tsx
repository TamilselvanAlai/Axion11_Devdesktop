import { useEffect } from "react";
import { X } from "lucide-react";

interface AssetPreviewModalProps {
  imageUrl: string;
  filename: string;
  onClose: () => void;
}

export function AssetPreviewModal({ imageUrl, filename, onClose }: AssetPreviewModalProps) {
  useEffect(() => {
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 p-8"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <X className="size-5" />
      </button>

      <p className="absolute left-4 top-4 max-w-[70%] truncate text-sm text-white/70">{filename}</p>

      <img
        src={imageUrl}
        alt={filename}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
      />
    </div>
  );
}
