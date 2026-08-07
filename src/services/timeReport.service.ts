import { apiClient } from "@/services/api.service";

export interface AssetEditReportRow {
  userId: number;
  userName: string;
  assetId: number;
  fileName: string;
  projectId: number | null;
  projectName: string | null;
  startedAt: string;
  endedAt: string;
  activeSeconds: number;
  idleSecondsExcluded: number;
  endReason: "SAVED" | "SWITCHED" | "SESSION_END";
}

export interface PayrollRow {
  userId: number;
  userName: string;
  projectId: number;
  projectName: string;
  activeSeconds: number;
  ratePerHour: number;
  estimatedPay: number;
}

export interface TimeReport {
  from: string;
  to: string;
  detailRows: AssetEditReportRow[];
  payrollRows: PayrollRow[];
  totalActiveSeconds: number;
  totalEstimatedPay: number;
}

export interface TimeReportParams {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  userId?: number;
}

/** Weekly/monthly asset-editing time reports for payroll — restricted server-side to
 *  ADMIN/SUPER_ADMIN/BILLING_MANAGER (see TimeReportController). */
export const timeReportService = {
  async getReport(params: TimeReportParams): Promise<TimeReport> {
    const { data } = await apiClient.get<TimeReport>("/reports/time", { params });
    return data;
  },

  /** Downloads the report as a CSV file via a real browser/OS save — `type` picks between the
   *  per-user/per-project payroll rollup (default) and the per-asset-session detail rows. */
  async downloadCsv(params: TimeReportParams, type: "payroll" | "detail" = "payroll"): Promise<void> {
    const response = await apiClient.get<Blob>("/reports/time/export.csv", {
      params: { ...params, type },
      responseType: "blob",
    });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `axion-time-report-${type}-${params.from}_${params.to}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
