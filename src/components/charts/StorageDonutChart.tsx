import type { StorageBreakdownItem, StorageColor } from "@/types";

const SEGMENT_HEX: Record<StorageColor, string | null> = {
  primary: "#1D7CFF",
  info: "#4F8BFF",
  warning: "#F8B400",
  neutral: null,
};

export function StorageDonutChart({
  breakdown,
  totalGb,
  usedPercent,
}: {
  breakdown: StorageBreakdownItem[];
  totalGb: number;
  usedPercent: number;
}) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="relative size-24">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
        {breakdown.map((item) => {
          const hex = SEGMENT_HEX[item.color];
          const fraction = item.valueGb / totalGb;
          const offset = -(cumulative * circumference);
          cumulative += fraction;
          if (!hex) return null;
          return (
            <circle
              key={item.id}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={hex}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${fraction * circumference} ${circumference}`}
              strokeDashoffset={offset}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold leading-none">{usedPercent}%</span>
        <span className="mt-0.5 text-[10px] text-muted-foreground">used</span>
      </div>
    </div>
  );
}
