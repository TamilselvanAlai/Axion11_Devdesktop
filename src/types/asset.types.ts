export type AssetStatus = "draft" | "in-review" | "approved" | "locked";

export interface Asset {
  id: string;
  name: string;
  status: AssetStatus;
  thumbnailUrl?: string;
  updatedAt: string;
  sizeMb: number;
}
