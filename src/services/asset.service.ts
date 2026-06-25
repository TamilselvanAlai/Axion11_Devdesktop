import type { Asset } from "@/types";
import { delay } from "@/utils/helpers";

export const assetService = {
  async listRecent(): Promise<Asset[]> {
    await delay(300);
    return [];
  },
};
