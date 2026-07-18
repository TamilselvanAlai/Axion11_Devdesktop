import type { AssetFileType } from "@/types";
import { cn } from "@/lib/utils";

const TYPE_CLASS: Record<AssetFileType, string> = {
  TIFF: "bg-blue-500/10 text-blue-500",
  PSD: "bg-amber-500/10 text-amber-500",
  CR3: "bg-emerald-500/10 text-emerald-500",
  JPG: "bg-violet-500/10 text-violet-500",
  PNG: "bg-violet-500/10 text-violet-500",
  WEBP: "bg-violet-500/10 text-violet-500",
  MP4: "bg-pink-500/10 text-pink-500",
  ZIP: "bg-warning/10 text-warning",
  OTHER: "bg-white/5 text-muted-foreground",
};

export function FileTypeBadge({ fileType }: { fileType: AssetFileType }) {
  return (
    <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-semibold tracking-wide", TYPE_CLASS[fileType])}>
      {fileType}
    </span>
  );
}
