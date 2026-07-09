export interface AssetsEditedStat {
  value: number;
  delta: string;
  description: string;
}

export interface TimeManagementStat {
  value: string;
  delta: string;
  description: string;
}

export interface TasksStat {
  completed: number;
  pending: number;
  delta: string;
}

export interface DashboardStatCards {
  assetsEdited: AssetsEditedStat;
  timeManagement: TimeManagementStat;
  tasks: TasksStat;
}

export type WorkItemStatus =
  | "pending"
  | "in-production"
  | "in-review"
  | "qc"
  | "completed";

export interface WorkItem {
  id: string;
  name: string;
  status: WorkItemStatus;
  progress: { done: number; total: number };
  dueDate: string;
}

export type StorageColor = "primary" | "info" | "warning" | "neutral";

export interface StorageBreakdownItem {
  id: string;
  label: string;
  valueGb: number;
  color: StorageColor;
}

export interface StorageSummary {
  quotaTb: number;
  usedPercent: number;
  breakdown: StorageBreakdownItem[];
}

export type ActivityType =
  | "approved"
  | "uploaded"
  | "commented"
  | "locked"
  | "created"
  | "viewed"
  | "downloaded";

export interface ActivityItem {
  id: string;
  actor: string;
  type: ActivityType;
  version: string;
  timestamp: string;
}

export type ServiceHealthColor = "success" | "info" | "warning" | "danger" | "neutral";

export interface ServiceMetric {
  label: string;
  value: string;
  color?: ServiceHealthColor;
  pulse?: boolean;
}

export interface MountDriveOption {
  id: string;
  label: string;
  capacityGb: number;
}

export interface BackgroundService {
  id: string;
  name: string;
  statusColor: ServiceHealthColor;
  badgeCount?: number;
  metrics: ServiceMetric[];
  uptime: string;
  configurable?: boolean;
}

export interface BackgroundServicesSummary {
  allHealthy: boolean;
  services: BackgroundService[];
  mountDriveOptions: MountDriveOption[];
}

export interface DashboardSnapshot {
  stats: DashboardStatCards;
  workItems: WorkItem[];
  storage: StorageSummary;
  activity: ActivityItem[];
  backgroundServices: BackgroundServicesSummary;
  pendingReviewCount: number;
}

// ── Raw shapes from Spring Boot backend ────────────────────────────────────

export interface ApiDashboardStats {
  totalProjects: number;
  totalAssets: number;
  approvedAssets: number;
  pendingReview: number;
  rejectedAssets: number;
}

export interface ApiDashboardBatch {
  id: string;
  name: string;
  assets: number;
  status: string;
  completion: number;
  assignedTo: string | null;
  dueDate: string | null;
  projectId: string;
  projectName: string;
}

export interface ApiAuditLog {
  id: number;
  eventType: string;
  projectId: number | null;
  batchId: number | null;
  assetId: number | null;
  userId: number | null;
  actorName: string | null;
  details: string | null;
  createdAt: string;
  assetVersion: number | null;
}

export interface ApiTask {
  id: number;
  name: string;
  status: string;
}

export interface ApiTaskGroup {
  id: number;
  name: string;
  tasks: ApiTask[];
}
