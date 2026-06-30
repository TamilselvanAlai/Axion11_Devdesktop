import { Schema, model } from "mongoose";

const projectNodeSchema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  parentId: { type: String, default: null },
  dueDate: { type: Date, default: null },
});

export const ProjectNode = model("ProjectNode", projectNodeSchema);
