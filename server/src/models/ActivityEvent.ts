import { Schema, model } from "mongoose";

const activityEventSchema = new Schema({
  actor: { type: String, required: true },
  type: { type: String, required: true },
  version: { type: String, required: true },
  timestamp: { type: Date, default: () => new Date() },
});

export const ActivityEvent = model("ActivityEvent", activityEventSchema);
