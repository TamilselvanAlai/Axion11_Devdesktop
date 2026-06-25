import type { DashboardSnapshot } from "@/types";
import { delay } from "@/utils/helpers";

export const dashboardService = {
  async getSnapshot(): Promise<DashboardSnapshot> {
    await delay(400);

    return {
      stats: [
        { id: "edited", label: "Assets Edited Today", value: "47", delta: "+12 vs. yesterday", icon: "document" },
        { id: "time", label: "Active Editing Time", value: "6h 24m", delta: "+45 min", icon: "clock" },
        { id: "tasks", label: "Tasks Completed", value: "23", delta: "+8 today", icon: "check" },
      ],
      workItems: [
        { id: "wi_1", name: "SS25 Runway", status: "completed", progress: { done: 0, total: 1 }, dueDate: "2025-06-25", accentColor: "amber" },
        { id: "wi_2", name: "SS25 Beauty", status: "qc", progress: { done: 0, total: 1 }, dueDate: "2025-06-27", accentColor: "emerald" },
        { id: "wi_3", name: "SS25 Heroes", status: "in-production", progress: { done: 1, total: 3 }, dueDate: "2025-06-28", accentColor: "emerald" },
        { id: "wi_4", name: "SS25 Accessories", status: "completed", progress: { done: 1, total: 2 }, dueDate: "2025-06-30", accentColor: "emerald" },
        { id: "wi_5", name: "AW25 Lookbook", status: "in-production", progress: { done: 1, total: 1 }, dueDate: "2025-07-10", accentColor: "slate" },
        { id: "wi_6", name: "AW25 Footwear", status: "in-review", progress: { done: 0, total: 2 }, dueDate: "2025-07-15", accentColor: "blue" },
        { id: "wi_7", name: "AW25 Campaign", status: "pending", progress: { done: 1, total: 2 }, dueDate: "2025-07-20", accentColor: "blue" },
      ],
      storage: {
        quotaTb: 10,
        usedPercent: 54,
        breakdown: [
          { id: "assets", label: "Assets", valueGb: 4200, color: "blue" },
          { id: "cache", label: "Cache", valueGb: 500, color: "blue" },
          { id: "temp", label: "Temp / Trash", valueGb: 700, color: "amber" },
          { id: "free", label: "Free", valueGb: 4600, color: "muted" },
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
    };
  },
};
