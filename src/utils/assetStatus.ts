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
const DRAFT_META: StatusMeta = { label: "Draft", dotClass: "bg-orange-500", textClass: "text-orange-500" };

/** The backend's "draft" status covers two different situations: a v1 upload that's never been
 *  touched (shown as "Pending", matching the web app) and a v2+ asset that was locally edited
 *  and re-synced, which needs re-review (shown as "Draft"). */
export function getStatusMeta(status: AssetStatus, version: string): StatusMeta {
  switch (status) {
    case "approved": return APPROVED_META;
    case "rejected": return REJECTED_META;
    case "live":     return LIVE_META;
    default:         return version === "v1" ? PENDING_META : DRAFT_META;
  }
}
