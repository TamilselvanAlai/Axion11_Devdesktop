import type {
  DashboardSnapshot,
  DashboardStatCards,
  WorkItem,
  WorkItemStatus,
  StorageSummary,
  ActivityItem,
  ActivityType,
  BackgroundServicesSummary,
  ApiDashboardStats,
  ApiDashboardBatch,
  ApiAuditLog,
  ApiTaskGroup,
} from "@/types";
import { apiClient } from "@/services/api.service";

// ── Static fallbacks for sections with no backend equivalent ─────────────

const MOCK_STORAGE: StorageSummary = {
  quotaTb: 10,
  usedPercent: 54,
  breakdown: [
    { id: "assets", label: "Assets", valueGb: 4200, color: "primary" },
    { id: "cache", label: "Cache", valueGb: 500, color: "info" },
    { id: "temp", label: "Temp / Trash", valueGb: 700, color: "warning" },
    { id: "free", label: "Free", valueGb: 4600, color: "neutral" },
  ],
};

const MOCK_BG_SERVICES: BackgroundServicesSummary = {
  allHealthy: true,
  services: [
    {
      id: "sync",
      name: "Sync Service",
      statusColor: "success",
      metrics: [
        { label: "Status", value: "Running", color: "success" },
        { label: "Cloud", value: "Connected", color: "info" },
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
  mountDriveOptions: [
    { id: "macintosh-hd", label: "Macintosh HD (/)", capacityGb: 512 },
    { id: "external-ssd", label: "External SSD", capacityGb: 1024 },
  ],
};

// ── Mapping helpers ───────────────────────────────────────────────────────

function mapStats(s: ApiDashboardStats, taskGroups: ApiTaskGroup[]): DashboardStatCards {
  const allTasks = taskGroups.flatMap((g) => g.tasks);
  const completed = allTasks.filter((t) => t.status.toUpperCase() === "COMPLETED").length;
  const pending = allTasks.length - completed;

  return {
    // No "edited today" tracking exists in the backend yet — static placeholder.
    assetsEdited: { value: 47, delta: "+12 vs. yesterday", description: "Assets Edited Today" },
    // No active-editing-time tracking exists in the backend yet — static placeholder.
    timeManagement: { value: "6h 24m", delta: "+45 min", description: "Active Editing Time" },
    tasks:
      allTasks.length > 0
        ? { completed, pending, delta: "+8 today" }
        : { completed: s.approvedAssets, pending: s.pendingReview, delta: "+8 today" },
  };
}

function mapBatchStatus(status: string | null): WorkItemStatus {
  switch ((status ?? "").toUpperCase()) {
    case "ACTIVE": return "in-production";
    case "COMPLETED": return "completed";
    case "UPLOADING": return "in-review";
    default: return "pending";
  }
}

function mapWorkItems(batches: ApiDashboardBatch[]): WorkItem[] {
  return batches
    .map((b) => ({
      id: b.id,
      name: b.name,
      status: mapBatchStatus(b.status),
      progress: { done: b.completion ?? 0, total: 100 },
      dueDate: b.dueDate ?? "—",
    }))
    .sort((a, b) => {
      // "Soonest first" — items with no parseable due date sort last, order stays stable otherwise.
      const at = Date.parse(a.dueDate);
      const bt = Date.parse(b.dueDate);
      if (Number.isNaN(at) && Number.isNaN(bt)) return 0;
      if (Number.isNaN(at)) return 1;
      if (Number.isNaN(bt)) return -1;
      return at - bt;
    });
}

function mapAuditType(eventType: string): ActivityType {
  switch (eventType) {
    case "IMAGE_UPLOAD": return "uploaded";
    case "READY_FOR_PRODUCTION": return "approved";
    case "TAG_EDIT":
    case "TAG_DELETE": return "commented";
    case "ASSET_VIEW": return "viewed";
    case "ASSET_DOWNLOAD": return "downloaded";
    default: return "created";
  }
}

function mapActivity(logs: ApiAuditLog[]): ActivityItem[] {
  return logs.slice(0, 15).map((log) => ({
    id: String(log.id),
    actor: log.actorName || `User #${log.userId ?? "?"}`,
    type: mapAuditType(log.eventType),
    version: log.assetVersion ? `v${log.assetVersion}` : "—",
    timestamp: log.createdAt,
  }));
}

// ── Public service ────────────────────────────────────────────────────────

export const dashboardService = {
  async getSnapshot(): Promise<DashboardSnapshot> {
    const [statsRes, batchesRes, auditRes, taskGroupsRes] = await Promise.allSettled([
      apiClient.get<ApiDashboardStats>("/dashboard/summary"),
      apiClient.get<ApiDashboardBatch[]>("/dashboard/batches"),
      apiClient.get<ApiAuditLog[]>("/audit"),
      apiClient.get<ApiTaskGroup[]>("/tasks/groups"),
    ]);

    const dashboardStats =
      statsRes.status === "fulfilled"
        ? statsRes.value.data
        : { totalProjects: 0, totalAssets: 0, approvedAssets: 0, pendingReview: 0, rejectedAssets: 0 };

    const taskGroups = taskGroupsRes.status === "fulfilled" ? taskGroupsRes.value.data : [];

    const stats = mapStats(dashboardStats, taskGroups);

    if (batchesRes.status === "rejected") {
      console.error("Failed to load dashboard batches:", batchesRes.reason);
    }
    const workItems =
      batchesRes.status === "fulfilled" ? mapWorkItems(batchesRes.value.data) : [];

    const activity =
      auditRes.status === "fulfilled" ? mapActivity(auditRes.value.data) : [];

    return {
      stats,
      workItems,
      storage: MOCK_STORAGE,
      activity,
      backgroundServices: MOCK_BG_SERVICES,
      pendingReviewCount: dashboardStats.pendingReview,
    };
  },
};
