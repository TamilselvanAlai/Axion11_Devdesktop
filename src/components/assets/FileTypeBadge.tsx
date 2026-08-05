import type { AssetFileType } from "@/types";
import { cn } from "@/lib/utils";

// Every RAW camera format (Canon, Sony, Adobe DNG, Fujifilm, Hasselblad, Nikon, Olympus,
// Panasonic, and generic .raw) shares one color family — there are too many distinct camera
// vendors' RAW extensions to give each its own color meaningfully.
const RAW_CLASS = "bg-orange-500/10 text-orange-500";

const TYPE_CLASS: Record<AssetFileType, string> = {
  TIFF: "bg-blue-500/10 text-blue-500",
  PSD: "bg-amber-500/10 text-amber-500",
  CR2: RAW_CLASS,
  CR3: RAW_CLASS,
  CRW: RAW_CLASS,
  ARW: RAW_CLASS,
  SRF: RAW_CLASS,
  SR2: RAW_CLASS,
  DNG: RAW_CLASS,
  RAF: RAW_CLASS,
  "3FR": RAW_CLASS,
  FFF: RAW_CLASS,
  NEF: RAW_CLASS,
  NRW: RAW_CLASS,
  ORF: RAW_CLASS,
  RW2: RAW_CLASS,
  RWL: RAW_CLASS,
  PEF: RAW_CLASS,
  PTX: RAW_CLASS,
  SRW: RAW_CLASS,
  X3F: RAW_CLASS,
  IIQ: RAW_CLASS,
  MEF: RAW_CLASS,
  MOS: RAW_CLASS,
  ERF: RAW_CLASS,
  KDC: RAW_CLASS,
  DCR: RAW_CLASS,
  MRW: RAW_CLASS,
  GPR: RAW_CLASS,
  RAW: RAW_CLASS,
  HEIC: "bg-emerald-500/10 text-emerald-500",
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
