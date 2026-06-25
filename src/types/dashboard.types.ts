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
  accentColor: string;
}

export interface StorageBreakdownItem {
  id: string;
  label: string;
  valueGb: number;
  color: string;
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

export interface DashboardSnapshot {
  stats: DashboardStat[];
  workItems: WorkItem[];
  storage: StorageSummary;
  activity: ActivityItem[];
}
