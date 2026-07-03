import { apiClient } from "@/services/api.service";

export const searchAuditService = {
  async logSearch(query: string, searchType: string, matchCount: number): Promise<void> {
    await apiClient.post("/search-audit", { query, searchType, matchCount }).catch(() => undefined);
  },
};
