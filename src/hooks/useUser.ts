import { useAuthStore } from "@/store";

export function useUser() {
  return useAuthStore((state) => state.user);
}
