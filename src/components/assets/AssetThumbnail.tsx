import { ImageIcon } from "lucide-react";

const COLOR_CLASS: Record<string, string> = {
  amber: "from-amber-500/40 to-amber-700/40",
  rose: "from-rose-500/40 to-rose-700/40",
  slate: "from-slate-500/40 to-slate-700/40",
  pink: "from-pink-500/40 to-pink-700/40",
  neutral: "from-neutral-500/40 to-neutral-700/40",
  emerald: "from-emerald-500/40 to-emerald-700/40",
  stone: "from-stone-500/40 to-stone-700/40",
  blue: "from-blue-500/40 to-blue-700/40",
  violet: "from-violet-500/40 to-violet-700/40",
};

export function AssetThumbnail({ color, className }: { color: string; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-gradient-to-br ${COLOR_CLASS[color] ?? COLOR_CLASS.neutral} ${className ?? "size-9"}`}
    >
      <ImageIcon className="size-4 text-white/70" />
    </div>
  );
}
