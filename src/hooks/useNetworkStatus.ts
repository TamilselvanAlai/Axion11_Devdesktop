import { useEffect, useState } from "react";

/** Tracks browser-reported connectivity (Wi-Fi/internet). `navigator.onLine` reflects the OS's
 *  network-adapter state, so this flips to false immediately on Wi-Fi loss / airplane mode,
 *  not just when a request happens to fail. */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    function goOnline() {
      setIsOnline(true);
    }
    function goOffline() {
      setIsOnline(false);
    }
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return isOnline;
}
