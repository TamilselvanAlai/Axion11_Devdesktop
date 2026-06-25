import { useState } from "react";
import { Cpu, Settings, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { BackgroundServicesSummary, BackgroundService, MountDriveOption, ServiceHealthColor } from "@/types";

const DOT_CLASS: Record<ServiceHealthColor, string> = {
  success: "bg-success",
  info: "bg-info",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-muted-foreground",
};

const TEXT_CLASS: Record<ServiceHealthColor, string> = {
  success: "text-success",
  info: "text-info",
  warning: "text-warning",
  danger: "text-danger",
  neutral: "text-muted-foreground",
};

function ServiceMetrics({ service }: { service: BackgroundService }) {
  return (
    <div className="flex flex-col gap-2.5">
      {service.metrics.map((metric) => (
        <div key={metric.label} className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">{metric.label}</span>
          <span className={`flex items-center gap-1.5 text-[11px] font-medium ${metric.color ? TEXT_CLASS[metric.color] : "font-mono text-foreground"}`}>
            {metric.color && <span className={`size-1.5 rounded-full ${DOT_CLASS[metric.color]} ${metric.pulse ? "animate-pulse" : ""}`} />}
            {metric.value}
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-border pt-2.5">
        <span className="text-[10px] text-muted-foreground">Uptime</span>
        <span className="font-mono text-[10px] font-medium text-success">{service.uptime}</span>
      </div>
    </div>
  );
}

function MountServiceCard({ service, driveOptions }: { service: BackgroundService; driveOptions: MountDriveOption[] }) {
  const [flipped, setFlipped] = useState(false);
  const [driveId, setDriveId] = useState(driveOptions[0]?.id ?? "");
  const drive = driveOptions.find((d) => d.id === driveId) ?? driveOptions[0];
  const [cacheLimitGb, setCacheLimitGb] = useState(50);

  return (
    <div className="rounded-xl" style={{ minHeight: 172, perspective: "1000px" }}>
      <div
        className="relative size-full transition-transform duration-500"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)", minHeight: 172 }}
      >
        <Card
          className="absolute inset-0 gap-3 p-4"
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span className={`size-2 rounded-full ${DOT_CLASS[service.statusColor]}`} />
              {service.name}
            </span>
            <button
              type="button"
              aria-label="Configure Mount Service"
              onClick={() => setFlipped(true)}
              className="flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <Settings className="size-3" />
            </button>
          </div>
          <ServiceMetrics service={service} />
        </Card>

        <Card
          className="absolute inset-0 gap-3 p-4"
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Settings className="size-3 text-primary" /> Mount Settings
            </span>
            <button
              type="button"
              aria-label="Back"
              onClick={() => setFlipped(false)}
              className="flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted-foreground">Local Drive</label>
              <select
                value={driveId}
                onChange={(e) => {
                  const next = driveOptions.find((d) => d.id === e.target.value);
                  setDriveId(e.target.value);
                  if (next) setCacheLimitGb((prev) => Math.min(prev, next.capacityGb));
                }}
                className="w-full cursor-pointer appearance-none rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] text-foreground outline-none transition-colors focus:border-primary/50"
              >
                {driveOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Cache Limit</label>
                <span className="font-mono text-[11px] font-medium text-primary">{cacheLimitGb} GB</span>
              </div>
              <input
                type="range"
                min={10}
                max={drive?.capacityGb ?? 256}
                step={10}
                value={cacheLimitGb}
                onChange={(e) => setCacheLimitGb(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-primary"
              />
              <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
                <span>10 GB</span>
                <span className="text-success">{drive?.capacityGb ?? 0} GB available</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFlipped(false)}
            className="mt-1 w-full rounded-lg bg-primary/15 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/25"
          >
            Save
          </button>
        </Card>
      </div>
    </div>
  );
}

export function BackgroundServicesSection({ summary }: { summary: BackgroundServicesSummary | null }) {
  if (!summary) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Cpu className="size-3.5 text-primary" />
        <h2 className="text-sm font-semibold">Background Services</h2>
        {summary.allHealthy && (
          <span className="flex items-center gap-1.5 text-xs text-success">
            <span className="size-1.5 rounded-full bg-success" /> All Healthy
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.services.map((service) =>
          service.configurable ? (
            <MountServiceCard key={service.id} service={service} driveOptions={summary.mountDriveOptions} />
          ) : (
            <Card key={service.id} className="gap-3 p-4" style={{ minHeight: 172 }}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className={`size-2 rounded-full ${DOT_CLASS[service.statusColor]}`} />
                  {service.name}
                </span>
                {service.badgeCount !== undefined && (
                  <span className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary bg-primary/10">
                    {service.badgeCount}
                  </span>
                )}
              </div>
              <ServiceMetrics service={service} />
            </Card>
          )
        )}
      </div>
    </div>
  );
}
