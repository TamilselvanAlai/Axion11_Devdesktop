import { Schema, model } from "mongoose";

const assetSchema = new Schema(
  {
    _id: { type: String, required: true },
    projectId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    status: { type: String, required: true },
    fileType: { type: String, required: true },
    sizeMb: { type: Number, required: true },
    version: { type: String, default: "v1" },
    assigneeName: { type: String, required: true },
    assigneeInitials: { type: String, required: true },
    thumbnailColor: { type: String, default: "blue" },
    sku: { type: String, default: null },
    batch: { type: String, default: null },
    checksumOk: { type: Boolean, default: true },
    locked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Asset = model("Asset", assetSchema);
