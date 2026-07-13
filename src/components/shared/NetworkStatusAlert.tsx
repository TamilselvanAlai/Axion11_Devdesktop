import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const OFFLINE_TOAST_ID = "network-offline";

/** Surfaces a persistent alert whenever Wi-Fi/internet drops — nothing in the app (login,
 *  asset sync, dashboard data) works without a connection, so the user needs to know
 *  immediately rather than discover it through failed requests. Mounted once, app-wide. */
export function NetworkStatusAlert() {
  const isOnline = useNetworkStatus();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      toast.error("No internet connection", {
        id: OFFLINE_TOAST_ID,
        description: "Check your Wi-Fi or network — syncing and saving are paused until you're back online.",
        duration: Infinity,
      });
      return;
    }

    toast.dismiss(OFFLINE_TOAST_ID);
    if (wasOffline.current) {
      wasOffline.current = false;
      toast.success("Back online", { description: "Connection restored." });
    }
  }, [isOnline]);

  return null;
}
