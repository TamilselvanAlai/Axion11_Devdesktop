import { env } from "@/config/env";
import { useAuthStore } from "@/store";

/** How long we wait for the SSE connection to open (the "connected" event) before assuming
 *  push isn't going to work on this network and handing back to the caller's own polling. */
const CONNECT_GRACE_MS = 4000;

export type BatchStatusListener = (status: string) => void;

/** Subscribes to a batch's upload-status stream over SSE (GET /batches/{id}/stream) instead of
 *  polling GET /batches/{id} on a timer. EventSource can't set an Authorization header, so the
 *  token travels as a query param — the backend only accepts that fallback on this one path (see
 *  JwtAuthenticationFilter).
 *
 *  Returns an unsubscribe function. `onUnavailable` fires at most once, whenever push stops being
 *  a reliable source of truth for this batch — connection never opened (proxy/firewall buffering
 *  text/event-stream, offline, etc.), or it dropped before a terminal status arrived. The caller
 *  should treat that as "fall back to polling", since a terminal status may still be pending. */
export function subscribeToBatchStatus(
  batchId: string,
  onStatus: BatchStatusListener,
  onUnavailable: () => void
): () => void {
  const token = useAuthStore.getState().token;
  if (!token) {
    onUnavailable();
    return () => {};
  }

  const url = `${env.apiBaseUrl}/batches/${encodeURIComponent(batchId)}/stream?token=${encodeURIComponent(token)}`;
  const source = new EventSource(url);
  let resolved = false; // a terminal status (COMPLETED/FAILED) has been delivered
  let fellBack = false; // onUnavailable already fired — never fire it twice

  const fallBack = () => {
    if (fellBack || resolved) return;
    fellBack = true;
    clearTimeout(connectTimer);
    source.close();
    onUnavailable();
  };

  const connectTimer = setTimeout(fallBack, CONNECT_GRACE_MS);

  source.addEventListener("connected", () => {
    clearTimeout(connectTimer);
  });

  source.addEventListener("status", (event) => {
    clearTimeout(connectTimer);
    try {
      const data = JSON.parse((event as MessageEvent).data);
      if (data?.uploadStatus) {
        if (data.uploadStatus === "COMPLETED" || data.uploadStatus === "FAILED") resolved = true;
        onStatus(data.uploadStatus);
      }
    } catch {
      // malformed payload — ignore this tick, the fallback path below still covers it
    }
  });

  // Fires both for a connection that never opened and for one that drops mid-stream — either
  // way, if we haven't seen a terminal status yet, hand off to polling rather than going silent.
  source.onerror = fallBack;

  return () => {
    clearTimeout(connectTimer);
    source.close();
  };
}
