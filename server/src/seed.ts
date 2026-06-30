import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "./lib/db.js";
import { User } from "./models/User.js";
import { ProjectNode } from "./models/ProjectNode.js";
import { Asset } from "./models/Asset.js";
import { Comment } from "./models/Comment.js";
import { ActivityEvent } from "./models/ActivityEvent.js";

const PROJECT_TREE: { id: string; name: string; parentId: string | null; dueDate?: string }[] = [
  { id: "ss25-campaign", name: "SS25 Campaign", parentId: null },
  { id: "ss25-heroes", name: "SS25 Heroes", parentId: "ss25-campaign", dueDate: "2025-06-28T17:00:00" },
  { id: "ss25-runway", name: "SS25 Runway", parentId: "ss25-campaign", dueDate: "2025-06-25T12:00:00" },
  { id: "ss25-accessories", name: "SS25 Accessories", parentId: "ss25-campaign", dueDate: "2025-06-30T09:00:00" },
  { id: "ss25-beauty", name: "SS25 Beauty", parentId: "ss25-campaign", dueDate: "2025-06-27T14:00:00" },
  { id: "aw25-campaign", name: "AW25 Campaign", parentId: null },
  { id: "aw25-footwear", name: "AW25 Footwear", parentId: "aw25-campaign", dueDate: "2025-07-15T17:00:00" },
  { id: "aw25-lookbook", name: "AW25 Lookbook", parentId: "aw25-campaign", dueDate: "2025-07-10T12:00:00" },
  { id: "aw25-campaign-assets", name: "AW25 Campaign", parentId: "aw25-campaign", dueDate: "2025-07-20T09:00:00" },
];

const ASSETS = [
  { id: "ast_1", projectId: "ss25-accessories", name: "AccessoriesHero_Final", status: "approved", fileType: "CR3", sizeMb: 88, version: "v3", assigneeName: "Riley J.", assigneeInitials: "RJ", updatedAt: "2025-06-23T08:40:00", thumbnailColor: "amber" },
  { id: "ast_2", projectId: "ss25-runway", name: "RunwayLook_Red", status: "pending", fileType: "TIFF", sizeMb: 189, version: "v2", assigneeName: "Sam R.", assigneeInitials: "SR", updatedAt: "2025-06-22T09:18:00", thumbnailColor: "rose" },
  { id: "ast_3", projectId: "ss25-heroes", name: "HeroesNecklace_Studio", status: "in-review", fileType: "TIFF", sizeMb: 234, version: "v2", assigneeName: "Morgan L.", assigneeInitials: "ML", updatedAt: "2025-06-23T10:22:00", thumbnailColor: "slate" },
  { id: "ast_4", projectId: "ss25-beauty", name: "BeautyPalette_Closeup", status: "rejected", fileType: "TIFF", sizeMb: 301, version: "v2", assigneeName: "Alex M.", assigneeInitials: "AM", updatedAt: "2025-06-21T11:30:00", thumbnailColor: "pink", locked: true },
  { id: "ast_5", projectId: "ss25-heroes", name: "HeroesGown_White", status: "in-review", fileType: "CR3", sizeMb: 67, version: "v1", assigneeName: "Alex M.", assigneeInitials: "AM", updatedAt: "2025-06-23T12:05:00", thumbnailColor: "neutral" },
  { id: "ast_6", projectId: "aw25-footwear", name: "FootwearVR_Mockup", status: "processing", fileType: "TIFF", sizeMb: 156, version: "v1", assigneeName: "Casey P.", assigneeInitials: "CP", updatedAt: "2025-06-23T15:49:00", thumbnailColor: "neutral" },
  { id: "ast_7", projectId: "ss25-runway", name: "RunwayKnit_Detail", status: "pending", fileType: "TIFF", sizeMb: 278, version: "v1", assigneeName: "Sam R.", assigneeInitials: "SR", updatedAt: "2025-06-23T11:14:00", thumbnailColor: "amber" },
  { id: "ast_8", projectId: "aw25-lookbook", name: "LookbookSweater_Front", status: "in-review", fileType: "TIFF", sizeMb: 318, version: "v1", assigneeName: "Casey P.", assigneeInitials: "CP", updatedAt: "2025-06-23T04:27:00", thumbnailColor: "amber" },
  { id: "ast_9", projectId: "aw25-campaign-assets", name: "CampaignKnit_Texture", status: "processing", fileType: "TIFF", sizeMb: 203, version: "v1", assigneeName: "Morgan L.", assigneeInitials: "ML", updatedAt: "2025-06-23T16:04:00", thumbnailColor: "emerald" },
  { id: "ast_10", projectId: "ss25-accessories", name: "AccessoriesBag_Detail", status: "in-review", fileType: "PSD", sizeMb: 412, version: "v5", assigneeName: "Riley J.", assigneeInitials: "RJ", updatedAt: "2025-06-23T13:47:00", thumbnailColor: "stone", locked: true },
  { id: "ast_11", projectId: "ss25-heroes", name: "HeroesShoe_Side", status: "approved", fileType: "JPG", sizeMb: 42, version: "v1", assigneeName: "Riley J.", assigneeInitials: "RJ", updatedAt: "2025-06-22T14:10:00", thumbnailColor: "blue" },
  { id: "ast_12", projectId: "aw25-footwear", name: "FootwearBoot_Hero", status: "pending", fileType: "MP4", sizeMb: 540, version: "v1", assigneeName: "Casey P.", assigneeInitials: "CP", updatedAt: "2025-06-22T17:30:00", thumbnailColor: "violet" },
];

const ACTIVITY = [
  { actor: "Jordan K.", type: "approved", version: "v3", hoursAgo: 2 },
  { actor: "Jordan K.", type: "uploaded", version: "v3", hoursAgo: 3 },
  { actor: "Alex M.", type: "commented", version: "v2", hoursAgo: 4 },
  { actor: "Sam R.", type: "uploaded", version: "v2", hoursAgo: 24 },
  { actor: "Riley J.", type: "locked", version: "v1", hoursAgo: 48 },
  { actor: "Sam R.", type: "created", version: "v1", hoursAgo: 72 },
];

async function main() {
  await connectDB();

  const passwordHash = await bcrypt.hash("axion123", 10);
  const jordan = await User.findOneAndUpdate(
    { email: "jordan.k@axion.io" },
    { $setOnInsert: { email: "jordan.k@axion.io", name: "Jordan K.", initials: "JK", role: "admin", passwordHash } },
    { upsert: true, new: true }
  );

  for (const node of PROJECT_TREE) {
    await ProjectNode.findByIdAndUpdate(
      node.id,
      { $setOnInsert: { name: node.name, parentId: node.parentId, dueDate: node.dueDate ? new Date(node.dueDate) : null } },
      { upsert: true }
    );
  }

  for (const asset of ASSETS) {
    const { id, ...rest } = asset;
    await Asset.findByIdAndUpdate(
      id,
      { $setOnInsert: { ...rest, updatedAt: new Date(rest.updatedAt), locked: rest.locked ?? false } },
      { upsert: true, timestamps: false }
    );
  }

  if ((await Comment.countDocuments({ assetId: "ast_3" })) === 0) {
    await Comment.insertMany([
      { assetId: "ast_3", authorName: "Alex M.", authorInitials: "AM", message: "Crop looks slightly off on the right edge — can we adjust before sign-off?", createdAt: new Date(Date.now() - 2 * 3600_000) },
      { assetId: "ast_3", authorId: jordan!._id, authorName: "Jordan K.", authorInitials: "JK", message: "Fixed in v3, please review the updated version when you get a chance.", createdAt: new Date(Date.now() - 1 * 3600_000) },
      { assetId: "ast_3", authorName: "Riley J.", authorInitials: "RJ", message: "Looks great. Approved for delivery.", createdAt: new Date(Date.now() - 45 * 60_000) },
    ]);
  }

  if ((await ActivityEvent.countDocuments()) === 0) {
    await ActivityEvent.insertMany(
      ACTIVITY.map((a) => ({
        actor: a.actor,
        type: a.type,
        version: a.version,
        timestamp: new Date(Date.now() - a.hoursAgo * 3600_000),
      }))
    );
  }

  console.log("Seed complete. Demo login: jordan.k@axion.io / axion123");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
