import { apiClient } from "@/services/api.service";
import type { ApiNotificationLog, NotificationItem, NotificationType } from "@/types";

function mapNotificationType(eventType: string): NotificationType | null {
  switch (eventType) {
    case "COMMENT_ADDED": return "commented";
    case "ASSET_ASSIGNED": return "assigned";
    default: return null;
  }
}

function mapNotification(log: ApiNotificationLog): NotificationItem | null {
  const type = mapNotificationType(log.eventType);
  if (!type) return null;
  return {
    id: String(log.id),
    type,
    actor: log.actorName || "Someone",
    fileName: log.assetFileName,
    assetId: log.assetId != null ? String(log.assetId) : null,
    // projectId intentionally left unprefixed (matches Asset.projectId's convention in
    // asset.service.ts#toAsset — batchId is the one actually used for tree-node navigation,
    // since a real asset always belongs to a batch).
    projectId: log.projectId != null ? String(log.projectId) : null,
    batchId: log.batchId != null ? `b-${log.batchId}` : null,
    version: log.assetVersion ? `v${log.assetVersion}` : "—",
    timestamp: log.createdAt,
  };
}

export const notificationsService = {
  async getNotifications(): Promise<NotificationItem[]> {
    const { data } = await apiClient.get<ApiNotificationLog[]>("/audit/notifications");
    return data.map(mapNotification).filter((n): n is NotificationItem => n !== null);
  },
};
