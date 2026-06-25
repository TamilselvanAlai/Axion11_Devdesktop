import type { User } from "@/types";
import { delay } from "@/utils/helpers";

export const userService = {
  async getCurrentUser(userId: string): Promise<Pick<User, "id">> {
    await delay(30);
    return { id: userId };
  },
};
