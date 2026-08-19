export type NotificationType = "commented" | "assigned";

/** A single row in the topbar notification bell — always scoped to events that explicitly name
 *  the current user as recipient (see AuditController#getNotifications on the backend), never
 *  other people's unrelated activity. */
export interface NotificationItem {
  id: string;
  type: NotificationType;
  actor: string;
  fileName: string | null;
  assetId: string | null;
  projectId: string | null;
  batchId: string | null;
  version: string;
  timestamp: string;
}

// ── Raw shape from the Spring Boot backend (GET /api/audit/notifications) ──────────────────────

export interface ApiNotificationLog {
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
  assetFileName: string | null;
}
