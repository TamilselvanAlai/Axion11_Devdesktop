import { Router } from "express";
import { z } from "zod";
import { ProjectNode } from "../models/ProjectNode.js";
import { Asset } from "../models/Asset.js";
import { Comment } from "../models/Comment.js";
import { User } from "../models/User.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const assetsRouter = Router();
assetsRouter.use(requireAuth);

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
}

function buildTree(nodes: { _id: string; name: string; parentId: string | null }[]): TreeNode[] {
  const byParent = new Map<string | null, { _id: string; name: string; parentId: string | null }[]>();
  for (const node of nodes) {
    const siblings = byParent.get(node.parentId) ?? [];
    siblings.push(node);
    byParent.set(node.parentId, siblings);
  }

  function attach(parentId: string | null): TreeNode[] {
    return (byParent.get(parentId) ?? []).map((node) => {
      const children = attach(node._id);
      return children.length ? { id: node._id, name: node.name, children } : { id: node._id, name: node.name };
    });
  }

  return attach(null);
}

function toPublicAsset(asset: {
  _id: string;
  projectId: string;
  name: string;
  status: string;
  fileType: string;
  sizeMb: number;
  version: string;
  assigneeName: string;
  assigneeInitials: string;
  updatedAt: Date;
  thumbnailColor: string;
}) {
  return {
    id: asset._id,
    projectId: asset.projectId,
    name: asset.name,
    status: asset.status,
    fileType: asset.fileType,
    sizeMb: asset.sizeMb,
    version: asset.version,
    assignee: { name: asset.assigneeName, initials: asset.assigneeInitials },
    updatedAt: asset.updatedAt.toISOString(),
    thumbnailColor: asset.thumbnailColor,
  };
}

async function leafProjectIds(projectId: string): Promise<string[]> {
  const children = await ProjectNode.find({ parentId: projectId }).lean();
  if (children.length === 0) return [projectId];
  const nested = await Promise.all(children.map((child) => leafProjectIds(child._id)));
  return nested.flat();
}

assetsRouter.get("/projects/tree", async (_req, res) => {
  const nodes = await ProjectNode.find().select({ name: 1, parentId: 1 }).lean();
  res.json(buildTree(nodes as { _id: string; name: string; parentId: string | null }[]));
});

assetsRouter.get("/projects/:id/summary", async (req, res) => {
  const children = await ProjectNode.find({ parentId: req.params.id }).lean();
  const summary = await Promise.all(
    children.map(async (child) => ({
      id: child._id,
      name: child.name,
      assetCount: await Asset.countDocuments({ projectId: child._id }),
      dueDate: (child.dueDate ?? new Date()).toISOString(),
    }))
  );
  res.json(summary);
});

assetsRouter.get("/assets", async (req, res) => {
  const projectId = typeof req.query.projectId === "string" ? req.query.projectId : null;

  if (!projectId) {
    const assets = await Asset.find().sort({ updatedAt: -1 }).lean();
    res.json(assets.map((a) => toPublicAsset(a as never)));
    return;
  }

  const ids = await leafProjectIds(projectId);
  const assets = await Asset.find({ projectId: { $in: ids } })
    .sort({ updatedAt: -1 })
    .lean();
  res.json(assets.map((a) => toPublicAsset(a as never)));
});

assetsRouter.get("/assets/:id", async (req, res) => {
  const asset = await Asset.findById(req.params.id).lean();
  if (!asset) {
    res.status(404).json({ message: "Asset not found." });
    return;
  }
  const project = await ProjectNode.findById(asset.projectId).lean();

  res.json({
    ...toPublicAsset(asset as never),
    filename: `${asset.name}.${asset.fileType.toLowerCase()}`,
    sku: asset.sku,
    batch: asset.batch ?? project?.name ?? asset.projectId,
    etaAt: (project?.dueDate ?? asset.updatedAt).toISOString(),
    modifiedAt: asset.updatedAt.toISOString(),
    checksumOk: asset.checksumOk,
    locked: asset.locked,
  });
});

assetsRouter.get("/assets/:id/comments", async (req, res) => {
  const comments = await Comment.find({ assetId: req.params.id }).sort({ createdAt: 1 }).lean();
  res.json(
    comments.map((c) => ({
      id: String(c._id),
      assetId: c.assetId,
      author: { name: c.authorName, initials: c.authorInitials },
      message: c.message,
      createdAt: (c as { createdAt: Date }).createdAt.toISOString(),
    }))
  );
});

const addCommentSchema = z.object({ message: z.string().min(1) });

assetsRouter.post("/assets/:id/comments", async (req, res) => {
  const parsed = addCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Comment message is required." });
    return;
  }

  const author = await User.findById(req.auth!.sub);
  if (!author) {
    res.status(404).json({ message: "Author not found." });
    return;
  }

  const comment = await Comment.create({
    assetId: req.params.id,
    authorId: author._id,
    authorName: author.name,
    authorInitials: author.initials,
    message: parsed.data.message,
  });

  res.status(201).json({
    id: String(comment._id),
    assetId: comment.assetId,
    author: { name: comment.authorName, initials: comment.authorInitials },
    message: comment.message,
    createdAt: comment.get("createdAt").toISOString(),
  });
});

const cloudAssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  fileType: z.string(),
  sizeMb: z.number(),
});

const ingestCloudAssetsSchema = z.object({
  assigneeName: z.string(),
  assigneeInitials: z.string(),
  files: z.array(cloudAssetSchema),
});

assetsRouter.post("/projects/cloud-drive/assets", async (req, res) => {
  const parsed = ingestCloudAssetsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid cloud asset payload." });
    return;
  }

  await ProjectNode.updateOne(
    { _id: "cloud-drive" },
    { $setOnInsert: { _id: "cloud-drive", name: "Cloud Drive", parentId: null } },
    { upsert: true }
  );

  const created = await Promise.all(
    parsed.data.files.map(async (file) => {
      const id = `cloud_${file.id}`;
      await Asset.findByIdAndUpdate(
        id,
        {
          $set: { updatedAt: new Date() },
          $setOnInsert: {
            projectId: "cloud-drive",
            name: file.name,
            status: "pending",
            fileType: file.fileType,
            sizeMb: file.sizeMb,
            version: "v1",
            assigneeName: parsed.data.assigneeName,
            assigneeInitials: parsed.data.assigneeInitials,
            thumbnailColor: "blue",
          },
        },
        { upsert: true }
      );
      return Asset.findById(id).lean();
    })
  );

  res.status(201).json(created.filter(Boolean).map((a) => toPublicAsset(a as never)));
});
