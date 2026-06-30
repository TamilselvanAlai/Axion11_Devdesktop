import { Schema, model } from "mongoose";

const commentSchema = new Schema(
  {
    assetId: { type: String, required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    authorName: { type: String, required: true },
    authorInitials: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Comment = model("Comment", commentSchema);
