export interface DashboardStat {
  id: string;
  label: string;
  value: string;
  delta: string;
  icon: "document" | "clock" | "check";
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
  | "created";

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
  stats: DashboardStat[];
  workItems: WorkItem[];
  storage: StorageSummary;
  activity: ActivityItem[];
  backgroundServices: BackgroundServicesSummary;
}
