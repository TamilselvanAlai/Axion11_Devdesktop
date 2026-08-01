import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Cpu, Loader2, Settings, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalDrives } from "@/hooks/useLocalDrives";
import { localSyncService } from "@/services/localSync.service";
import { useMountSettingsStore } from "@/store";
import type { BackgroundServicesSummary, BackgroundService, MountDriveOption, ServiceHealthColor } from "@/types";

interface DriveOption {
  id: string;
  label: string;
  totalGb: number;
  availableGb: number;
}

function bytesToGb(bytes: number) {
  return Math.round(bytes / (1024 * 1024 * 1024));
}

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
  const { drives: localDrives, isTauri } = useLocalDrives();
  const { mountPoint: savedMountPoint, cacheLimitGb: savedCacheLimitGb, setMountPoint, setCacheLimitGb: saveCacheLimitGb } =
    useMountSettingsStore();

  const options: DriveOption[] = isTauri && localDrives
    ? localDrives.map((d) => ({
        id: d.id,
        label: d.name === d.mountPoint ? d.name : `${d.name} (${d.mountPoint})`,
        totalGb: bytesToGb(d.totalBytes),
        availableGb: bytesToGb(d.availableBytes),
      }))
    : driveOptions.map((d) => ({ id: d.id, label: d.label, totalGb: d.capacityGb, availableGb: d.capacityGb }));

  const [flipped, setFlipped] = useState(false);
  const effectiveSavedId = savedMountPoint ?? options[0]?.id ?? "";
  // Pending edits live here until Save is pressed — the front face keeps showing the
  // last-saved drive/limit the whole time, so it never claims a path is active before it is.
  const [driveId, setDriveId] = useState(effectiveSavedId);
  const drive = options.find((d) => d.id === driveId) ?? options[0];
  const savedDrive = options.find((d) => d.id === effectiveSavedId) ?? options[0];
  const [cacheLimitGb, setCacheLimitGb] = useState(savedCacheLimitGb);
  const [applying, setApplying] = useState(false);
  const isDirty = driveId !== effectiveSavedId || cacheLimitGb !== savedCacheLimitGb;

  useEffect(() => {
    if (options.length > 0 && !options.some((d) => d.id === driveId)) {
      setDriveId(options[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.map((d) => d.id).join(",")]);

  async function handleSave() {
    if (isTauri && drive) {
      setApplying(true);
      try {
        await localSyncService.verifyMountRoot(drive.id);
        setMountPoint(drive.id);
        saveCacheLimitGb(cacheLimitGb);
        setFlipped(false);
        toast.success(`Local sync path updated — new files now save under ${drive.label}\\AxionDam.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't use that drive. Pick another one.");
      } finally {
        setApplying(false);
      }
      return;
    }
    saveCacheLimitGb(cacheLimitGb);
    setFlipped(false);
  }

  function handleFlipBack() {
    // Discard any unsaved edits so the settings panel reopens showing what's actually active.
    setDriveId(effectiveSavedId);
    setCacheLimitGb(savedCacheLimitGb);
    setFlipped(false);
  }

  const displayedService: BackgroundService =
    isTauri && savedDrive
      ? {
          ...service,
          metrics: service.metrics.map((m) => (m.label === "Drive" ? { ...m, value: savedDrive.label } : m)),
        }
      : service;

  const cardHeight = flipped ? 200 : 172;

  return (
    <div className="rounded-xl" style={{ minHeight: cardHeight, perspective: "1000px" }}>
      <div
        className="relative size-full transition-transform duration-500"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)", minHeight: cardHeight }}
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
          <ServiceMetrics service={displayedService} />
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
              onClick={handleFlipBack}
              className="flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Local Drive</label>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isDirty || applying}
                  className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    isDirty && !applying
                      ? "bg-primary/15 text-primary hover:bg-primary/25"
                      : "cursor-not-allowed bg-white/5 text-muted-foreground"
                  }`}
                >
                  {applying && <Loader2 className="size-2.5 animate-spin" />}
                  {applying ? "Applying…" : isDirty ? "Apply" : "Applied"}
                </button>
              </div>
              <select
                value={driveId}
                onChange={(e) => {
                  const next = options.find((d) => d.id === e.target.value);
                  setDriveId(e.target.value);
                  if (next) setCacheLimitGb((prev) => Math.min(prev, next.availableGb));
                }}
                className="w-full cursor-pointer appearance-none rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] text-foreground outline-none transition-colors focus:border-primary/50"
              >
                {options.map((option) => (
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
                max={drive?.availableGb ?? 256}
                step={10}
                value={cacheLimitGb}
                onChange={(e) => setCacheLimitGb(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-primary"
              />
              <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
                <span>10 GB</span>
                <span className="text-success">{drive?.availableGb ?? 0} GB available</span>
              </div>
            </div>
          </div>
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
