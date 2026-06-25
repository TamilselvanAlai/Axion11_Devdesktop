import type { Asset, AssetComment, AssetDetail, ProjectNode, ProjectSummary, AssetScope } from "@/types";
import { delay } from "@/utils/helpers";

export const PROJECT_TREE: ProjectNode[] = [
  {
    id: "ss25-campaign",
    name: "SS25 Campaign",
    children: [
      { id: "ss25-heroes", name: "SS25 Heroes" },
      { id: "ss25-runway", name: "SS25 Runway" },
      { id: "ss25-accessories", name: "SS25 Accessories" },
      { id: "ss25-beauty", name: "SS25 Beauty" },
    ],
  },
  {
    id: "aw25-campaign",
    name: "AW25 Campaign",
    children: [
      { id: "aw25-footwear", name: "AW25 Footwear" },
      { id: "aw25-lookbook", name: "AW25 Lookbook" },
      { id: "aw25-campaign-assets", name: "AW25 Campaign" },
    ],
  },
];

export const PROJECT_DUE_DATES: Record<string, string> = {
  "ss25-accessories": "2025-06-30T09:00:00",
  "ss25-beauty": "2025-06-27T14:00:00",
  "ss25-heroes": "2025-06-28T17:00:00",
  "ss25-runway": "2025-06-25T12:00:00",
  "aw25-footwear": "2025-07-15T17:00:00",
  "aw25-lookbook": "2025-07-10T12:00:00",
  "aw25-campaign-assets": "2025-07-20T09:00:00",
};

export const ASSETS: Asset[] = [
  { id: "ast_1", projectId: "ss25-accessories", name: "AccessoriesHero_Final", status: "approved", fileType: "CR3", sizeMb: 88, version: "v3", assignee: { name: "Riley J.", initials: "RJ" }, updatedAt: "2025-06-23T08:40:00", thumbnailColor: "amber" },
  { id: "ast_2", projectId: "ss25-runway", name: "RunwayLook_Red", status: "pending", fileType: "TIFF", sizeMb: 189, version: "v2", assignee: { name: "Sam R.", initials: "SR" }, updatedAt: "2025-06-22T09:18:00", thumbnailColor: "rose" },
  { id: "ast_3", projectId: "ss25-heroes", name: "HeroesNecklace_Studio", status: "in-review", fileType: "TIFF", sizeMb: 234, version: "v2", assignee: { name: "Morgan L.", initials: "ML" }, updatedAt: "2025-06-23T10:22:00", thumbnailColor: "slate" },
  { id: "ast_4", projectId: "ss25-beauty", name: "BeautyPalette_Closeup", status: "rejected", fileType: "TIFF", sizeMb: 301, version: "v2", assignee: { name: "Alex M.", initials: "AM" }, updatedAt: "2025-06-21T11:30:00", thumbnailColor: "pink" },
  { id: "ast_5", projectId: "ss25-heroes", name: "HeroesGown_White", status: "in-review", fileType: "CR3", sizeMb: 67, version: "v1", assignee: { name: "Alex M.", initials: "AM" }, updatedAt: "2025-06-23T12:05:00", thumbnailColor: "neutral" },
  { id: "ast_6", projectId: "aw25-footwear", name: "FootwearVR_Mockup", status: "processing", fileType: "TIFF", sizeMb: 156, version: "v1", assignee: { name: "Casey P.", initials: "CP" }, updatedAt: "2025-06-23T15:49:00", thumbnailColor: "neutral" },
  { id: "ast_7", projectId: "ss25-runway", name: "RunwayKnit_Detail", status: "pending", fileType: "TIFF", sizeMb: 278, version: "v1", assignee: { name: "Sam R.", initials: "SR" }, updatedAt: "2025-06-23T11:14:00", thumbnailColor: "amber" },
  { id: "ast_8", projectId: "aw25-lookbook", name: "LookbookSweater_Front", status: "in-review", fileType: "TIFF", sizeMb: 318, version: "v1", assignee: { name: "Casey P.", initials: "CP" }, updatedAt: "2025-06-23T04:27:00", thumbnailColor: "amber" },
  { id: "ast_9", projectId: "aw25-campaign-assets", name: "CampaignKnit_Texture", status: "processing", fileType: "TIFF", sizeMb: 203, version: "v1", assignee: { name: "Morgan L.", initials: "ML" }, updatedAt: "2025-06-23T16:04:00", thumbnailColor: "emerald" },
  { id: "ast_10", projectId: "ss25-accessories", name: "AccessoriesBag_Detail", status: "in-review", fileType: "PSD", sizeMb: 412, version: "v5", assignee: { name: "Riley J.", initials: "RJ" }, updatedAt: "2025-06-23T13:47:00", thumbnailColor: "stone" },
  { id: "ast_11", projectId: "ss25-heroes", name: "HeroesShoe_Side", status: "approved", fileType: "JPG", sizeMb: 42, version: "v1", assignee: { name: "Riley J.", initials: "RJ" }, updatedAt: "2025-06-22T14:10:00", thumbnailColor: "blue" },
  { id: "ast_12", projectId: "aw25-footwear", name: "FootwearBoot_Hero", status: "pending", fileType: "MP4", sizeMb: 540, version: "v1", assignee: { name: "Casey P.", initials: "CP" }, updatedAt: "2025-06-22T17:30:00", thumbnailColor: "violet" },
];

function batchLabel(projectId: string): string {
  return findNode(PROJECT_TREE, projectId)?.name ?? projectId;
}

function seasonCode(projectId: string): string {
  return projectId.toUpperCase().startsWith("AW") ? "AW25" : "SS25";
}

const LOCKED_ASSET_IDS = new Set(["ast_4", "ast_10"]);

const COMMENTS: AssetComment[] = [
  {
    id: "cmt_1",
    assetId: "ast_3",
    author: { name: "Alex M.", initials: "AM" },
    message: "Crop looks slightly off on the right edge — can we adjust before sign-off?",
    createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
  {
    id: "cmt_2",
    assetId: "ast_3",
    author: { name: "Jordan K.", initials: "JK" },
    message: "Fixed in v3, please review the updated version when you get a chance.",
    createdAt: new Date(Date.now() - 1 * 3600_000).toISOString(),
  },
  {
    id: "cmt_3",
    assetId: "ast_3",
    author: { name: "Riley J.", initials: "RJ" },
    message: "Looks great. Approved for delivery.",
    createdAt: new Date(Date.now() - 45 * 60_000).toISOString(),
  },
];

function findLeafIds(nodes: ProjectNode[]): string[] {
  return nodes.flatMap((node) => (node.children ? findLeafIds(node.children) : [node.id]));
}

function findNode(nodes: ProjectNode[], id: string): ProjectNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export const assetService = {
  async getProjectTree(): Promise<ProjectNode[]> {
    await delay(60);
    return PROJECT_TREE;
  },

  async listAssets(scope: AssetScope): Promise<Asset[]> {
    await delay(80);

    if (scope === "all" || scope === "recent" || scope === "transfers") {
      return [...ASSETS];
    }

    const node = findNode(PROJECT_TREE, scope.projectId);
    const leafIds = node?.children ? findLeafIds(node.children) : [scope.projectId];
    return ASSETS.filter((asset) => leafIds.includes(asset.projectId));
  },

  async getFolderSummary(projectId: string): Promise<ProjectSummary[]> {
    await delay(60);
    const node = findNode(PROJECT_TREE, projectId);
    if (!node?.children) return [];

    return node.children.map((child) => ({
      id: child.id,
      name: child.name,
      assetCount: ASSETS.filter((asset) => asset.projectId === child.id).length,
      dueDate: PROJECT_DUE_DATES[child.id] ?? new Date().toISOString(),
    }));
  },

  async getAssetDetail(assetId: string): Promise<AssetDetail | null> {
    await delay(40);
    const asset = ASSETS.find((a) => a.id === assetId);
    if (!asset) return null;

    const index = ASSETS.indexOf(asset) + 1;
    const dueDate = PROJECT_DUE_DATES[asset.projectId] ?? asset.updatedAt;

    return {
      ...asset,
      filename: `${asset.name}.${asset.fileType.toLowerCase()}`,
      sku: `ML-${seasonCode(asset.projectId)}-${String(2500 + index)}`,
      batch: batchLabel(asset.projectId),
      etaAt: new Date(dueDate).toISOString(),
      modifiedAt: asset.updatedAt,
      checksumOk: !LOCKED_ASSET_IDS.has(asset.id),
      locked: LOCKED_ASSET_IDS.has(asset.id),
    };
  },

  async getComments(assetId: string): Promise<AssetComment[]> {
    await delay(40);
    return COMMENTS.filter((comment) => comment.assetId === assetId);
  },

  async addComment(assetId: string, message: string): Promise<AssetComment> {
    await delay(30);
    const comment: AssetComment = {
      id: `cmt_${COMMENTS.length + 1}`,
      assetId,
      author: { name: "Jordan K.", initials: "JK" },
      message,
      createdAt: new Date().toISOString(),
    };
    COMMENTS.push(comment);
    return comment;
  },
};
