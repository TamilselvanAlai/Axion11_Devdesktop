import { Star } from "lucide-react";

/** "VE" (Version Established) — the version an editor most recently saved through the
 *  edit-and-resync flow: the original-format (TIFF/PSD, layered) source to rework from.
 *  Independent of approval status, so it needs its own distinct marker rather than reusing the
 *  status badge colors. */
export function EstablishedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="Established version — the source file to rework from"
      className={`flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-500 ${className}`}
    >
      <Star className="size-2.5 fill-amber-500" /> VE
    </span>
  );
}
