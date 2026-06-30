import { Router } from "express";
import { ProjectNode } from "../models/ProjectNode.js";
import { Asset } from "../models/Asset.js";
import { ActivityEvent } from "../models/ActivityEvent.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

const BATCH_STATUS: Record<string, string> = {
  "ss25-runway": "completed",
  "ss25-beauty": "qc",
  "ss25-heroes": "in-production",
  "ss25-accessories": "completed",
  "aw25-lookbook": "in-production",
  "aw25-footwear": "in-review",
  "aw25-campaign-assets": "pending",
};

dashboardRouter.get("/snapshot", async (_req, res) => {
  const leafProjects = await ProjectNode.find({ parentId: { $ne: null } }).lean();
  const allAssets = await Asset.find().lean();

  const workItems = leafProjects
    .map((leaf) => {
      const assets = allAssets.filter((a) => a.projectId === leaf._id);
      const done = assets.filter((a) => a.status === "approved").length;
      return {
        id: leaf._id,
        name: leaf.name,
        status: BATCH_STATUS[leaf._id] ?? "pending",
        progress: { done, total: assets.length || 1 },
        dueDate: (leaf.dueDate ?? new Date()).toISOString(),
      };
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const activity = await ActivityEvent.find().sort({ timestamp: -1 }).limit(6).lean();

  res.json({
    stats: [
      { id: "edited", label: "Assets Edited Today", value: String(allAssets.length), delta: "+12 vs. yesterday", icon: "document" },
      { id: "time", label: "Active Editing Time", value: "6h 24m", delta: "+45 min", icon: "clock" },
      { id: "tasks", label: "Tasks Completed", value: String(allAssets.filter((a) => a.status === "approved").length), delta: "+8 today", icon: "check" },
    ],
    workItems,
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
    activity: activity.map((event) => ({
      id: String(event._id),
      actor: event.actor,
      type: event.type,
      version: event.version,
      timestamp: event.timestamp.toISOString(),
    })),
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
  });
});
