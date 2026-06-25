import type { DashboardSnapshot, WorkItemStatus } from "@/types";
import { delay } from "@/utils/helpers";
import { ASSETS, PROJECT_TREE, PROJECT_DUE_DATES } from "@/services/asset.service";

const BATCH_STATUS: Record<string, WorkItemStatus> = {
  "ss25-runway": "completed",
  "ss25-beauty": "qc",
  "ss25-heroes": "in-production",
  "ss25-accessories": "completed",
  "aw25-lookbook": "in-production",
  "aw25-footwear": "in-review",
  "aw25-campaign-assets": "pending",
};

function buildWorkItems() {
  const leaves = PROJECT_TREE.flatMap((node) => node.children ?? []);

  return leaves
    .map((leaf) => {
      const assets = ASSETS.filter((asset) => asset.projectId === leaf.id);
      const done = assets.filter((asset) => asset.status === "approved").length;
      return {
        id: leaf.id,
        name: leaf.name,
        status: BATCH_STATUS[leaf.id] ?? "pending",
        progress: { done, total: assets.length || 1 },
        dueDate: PROJECT_DUE_DATES[leaf.id] ?? new Date().toISOString(),
      };
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

export const dashboardService = {
  async getSnapshot(): Promise<DashboardSnapshot> {
    await delay(80);

    return {
      stats: [
        { id: "edited", label: "Assets Edited Today", value: "47", delta: "+12 vs. yesterday", icon: "document" },
        { id: "time", label: "Active Editing Time", value: "6h 24m", delta: "+45 min", icon: "clock" },
        { id: "tasks", label: "Tasks Completed", value: "23", delta: "+8 today", icon: "check" },
      ],
      workItems: buildWorkItems(),
      storage: {
        quotaTb: 10,
        usedPercent: 54,
        breakdown: [
          { id: "assets", label: "Assets", valueGb: 4200, color: "primary" },
          { id: "cache", label: "Cache", valueGb: 500, color: "info" },
          { id: "temp", label: "Temp / Trash", valueGb: 700, color: "warning" },
          { id: "free", label: "Free", valueGb: 4600, color: "neutral" },
        ],
      },
      activity: [
        { id: "a1", actor: "Jordan K.", type: "approved", version: "v3", timestamp: new Date(Date.now() - 2 * 3600_000).toISOString() },
        { id: "a2", actor: "Jordan K.", type: "uploaded", version: "v3", timestamp: new Date(Date.now() - 3 * 3600_000).toISOString() },
        { id: "a3", actor: "Alex M.", type: "commented", version: "v2", timestamp: new Date(Date.now() - 4 * 3600_000).toISOString() },
        { id: "a4", actor: "Sam R.", type: "uploaded", version: "v2", timestamp: new Date(Date.now() - 24 * 3600_000).toISOString() },
        { id: "a5", actor: "Riley J.", type: "locked", version: "v1", timestamp: new Date(Date.now() - 48 * 3600_000).toISOString() },
        { id: "a6", actor: "Sam R.", type: "created", version: "v1", timestamp: new Date(Date.now() - 72 * 3600_000).toISOString() },
      ],
      backgroundServices: {
        allHealthy: true,
        mountDriveOptions: [
          { id: "macintosh-hd", label: "Macintosh HD (/)", capacityGb: 256 },
          { id: "external-ssd", label: "External SSD (/Volumes/Axion)", capacityGb: 480 },
          { id: "c-drive", label: "C:\\", capacityGb: 512 },
          { id: "d-drive", label: "D:\\", capacityGb: 1024 },
          { id: "e-drive", label: "E:\\", capacityGb: 2000 },
        ],
        services: [
          {
            id: "sync",
            name: "Sync Service",
            statusColor: "success",
            metrics: [
              { label: "Status", value: "Running", color: "success" },
              { label: "Cloud", value: "Connected", color: "success" },
              { label: "Last Sync", value: "2m ago" },
            ],
            uptime: "99.98%",
          },
          {
            id: "mount",
            name: "Mount Service",
            statusColor: "success",
            configurable: true,
            metrics: [
              { label: "Status", value: "Mounted", color: "success" },
              { label: "Drive", value: "Macintosh HD (/)" },
              { label: "Drive Health", value: "Good", color: "success" },
            ],
            uptime: "99.99%",
          },
          {
            id: "intelligence",
            name: "Intelligence Service",
            statusColor: "success",
            badgeCount: 4,
            metrics: [
              { label: "Status", value: "Active", color: "success" },
              { label: "Learning", value: "In Progress", color: "info", pulse: true },
              { label: "Optimizing", value: "Running", color: "warning", pulse: true },
            ],
            uptime: "99.91%",
          },
          {
            id: "orchestrator",
            name: "Desktop Orchestrator",
            statusColor: "success",
            badgeCount: 12,
            metrics: [
              { label: "Healthy", value: "14 services", color: "success" },
              { label: "Warning", value: "2 services", color: "warning" },
              { label: "Critical", value: "0 services", color: "danger" },
            ],
            uptime: "100%",
          },
        ],
      },
    };
  },
};
