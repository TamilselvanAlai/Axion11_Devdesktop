import type { AssetStatus } from "@/types";

export interface StatusMeta {
  label: string;
  dotClass: string;
  textClass: string;
}

const APPROVED_META: StatusMeta = { label: "Approved", dotClass: "bg-emerald-500", textClass: "text-emerald-500" };
const REJECTED_META: StatusMeta = { label: "Rejected", dotClass: "bg-red-500", textClass: "text-red-500" };
const LIVE_META: StatusMeta = { label: "Live", dotClass: "bg-blue-500", textClass: "text-blue-500" };
const PENDING_META: StatusMeta = { label: "Pending", dotClass: "bg-amber-500", textClass: "text-amber-500" };
const IN_PRODUCTION_META: StatusMeta = { label: "In Production", dotClass: "bg-violet-500", textClass: "text-violet-500" };

/** Anything not yet approved/rejected/live reads as "Pending" for an untouched v1, or
 *  "In Production" for the established (VE) version — an editor is actively working on it,
 *  distinct from a fresh upload nobody has looked at yet. */
export function getStatusMeta(status: AssetStatus, established: boolean): StatusMeta {
  switch (status) {
    case "approved": return APPROVED_META;
    case "rejected": return REJECTED_META;
    case "live":     return LIVE_META;
    default:         return established ? IN_PRODUCTION_META : PENDING_META;
  }
}
