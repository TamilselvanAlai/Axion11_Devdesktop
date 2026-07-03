import { useState } from "react";
import { ImageIcon } from "lucide-react";

const COLOR_CLASS: Record<string, string> = {
  amber:   "from-amber-500/40 to-amber-700/40",
  rose:    "from-rose-500/40 to-rose-700/40",
  slate:   "from-slate-500/40 to-slate-700/40",
  pink:    "from-pink-500/40 to-pink-700/40",
  neutral: "from-neutral-500/40 to-neutral-700/40",
  emerald: "from-emerald-500/40 to-emerald-700/40",
  stone:   "from-stone-500/40 to-stone-700/40",
  blue:    "from-blue-500/40 to-blue-700/40",
  violet:  "from-violet-500/40 to-violet-700/40",
};

function isUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/");
}

export function AssetThumbnail({ color, className }: { color: string; className?: string }) {
  const sizeClass = className ?? "size-9";
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

  if (isUrl(color)) {
    return (
      <div className={`relative overflow-hidden rounded-lg bg-muted ${sizeClass}`}>
        {state !== "loaded" && (
          <div
            className={`absolute inset-0 ${
              state === "loading"
                ? "animate-pulse bg-gradient-to-br from-white/5 to-white/10"
                : "flex items-center justify-center bg-gradient-to-br from-neutral-500/40 to-neutral-700/40"
            }`}
          >
            {state === "error" && <ImageIcon className="size-4 text-white/70" />}
          </div>
        )}
        <img
          src={color}
          alt=""
          className={`h-full w-full object-cover transition-opacity duration-200 ${
            state === "loaded" ? "opacity-100" : "opacity-0"
          }`}
          loading="lazy"
          decoding="async"
          onLoad={() => setState("loaded")}
          onError={() => setState("error")}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-gradient-to-br ${COLOR_CLASS[color] ?? COLOR_CLASS.neutral} ${sizeClass}`}
    >
      <ImageIcon className="size-4 text-white/70" />
    </div>
  );
}
