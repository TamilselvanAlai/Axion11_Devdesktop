import { useEffect, useMemo, useState } from "react";
import { Download, Clock } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { timeReportService, type TimeReport } from "@/services/timeReport.service";
import { formatDuration, parseBackendTimestamp } from "@/utils/formatters";
import { rangeForPeriod, type ReportPeriod } from "@/utils/reportPeriods";

type ReportScope = Exclude<ReportPeriod, "today">;

function money(value: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
}

export default function ReportsPage() {
  const [scope, setScope] = useState<ReportScope>("week");
  const [report, setReport] = useState<TimeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const range = useMemo(() => rangeForPeriod(scope), [scope]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    timeReportService
      .getReport({ from: range.from, to: range.to })
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load report.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range.from, range.to]);

  async function handleExport(type: "payroll" | "detail") {
    setExporting(true);
    try {
      await timeReportService.downloadCsv({ from: range.from, to: range.to }, type);
    } finally {
      setExporting(false);
    }
  }

  return (
    <DashboardLayout hideSearch>
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="flex shrink-0 items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Time & Payroll Reports</h1>
            <p className="text-sm text-muted-foreground">
              Idle-corrected active editing time by asset, user, and project — {range.label}
            </p>
          </div>
          <Tabs value={scope} onValueChange={(v) => setScope(v as ReportScope)}>
            <TabsList>
              <TabsTrigger value="week">This Week</TabsTrigger>
              <TabsTrigger value="month">This Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {error && (
          <Card className="p-4 text-sm text-danger">{error}</Card>
        )}

        <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <Card className="flex flex-col gap-1 p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground">Total Active Time</p>
            {loading ? <Skeleton className="h-7 w-24" /> : (
              <p className="text-xl font-semibold tracking-tight">{formatDuration((report?.totalActiveSeconds ?? 0) * 1000)}</p>
            )}
          </Card>
          <Card className="flex flex-col gap-1 p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground">Estimated Payroll</p>
            {loading ? <Skeleton className="h-7 w-24" /> : (
              <p className="text-xl font-semibold tracking-tight">{money(report?.totalEstimatedPay ?? 0)}</p>
            )}
          </Card>
        </div>

        <Card className="flex min-h-0 flex-1 flex-col gap-2 p-3.5">
          <div className="flex shrink-0 items-center justify-between">
            <p className="text-sm font-semibold">Payroll — by user & project</p>
            <Button size="sm" variant="outline" disabled={exporting || !report?.payrollRows.length} onClick={() => handleExport("payroll")}>
              <Download className="size-3.5" /> Export CSV
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {loading && <Skeleton className="h-32 rounded-lg" />}
            {!loading && report && report.payrollRows.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                <Clock className="size-6" />
                <p className="text-sm">No logged editing time in this period.</p>
              </div>
            )}
            {!loading && report && report.payrollRows.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Active Hours</TableHead>
                    <TableHead>Rate / hr</TableHead>
                    <TableHead>Estimated Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.payrollRows.map((row) => (
                    <TableRow key={`${row.userId}-${row.projectId}`}>
                      <TableCell className="font-medium">{row.userName}</TableCell>
                      <TableCell>{row.projectName}</TableCell>
                      <TableCell className="font-mono">{(row.activeSeconds / 3600).toFixed(2)}h</TableCell>
                      <TableCell className="font-mono">{money(row.ratePerHour)}</TableCell>
                      <TableCell className="font-mono font-semibold">{money(row.estimatedPay)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>

        <Card className="flex min-h-0 flex-1 flex-col gap-2 p-3.5">
          <div className="flex shrink-0 items-center justify-between">
            <p className="text-sm font-semibold">Detail — by asset session</p>
            <Button size="sm" variant="outline" disabled={exporting || !report?.detailRows.length} onClick={() => handleExport("detail")}>
              <Download className="size-3.5" /> Export CSV
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {loading && <Skeleton className="h-32 rounded-lg" />}
            {!loading && report && report.detailRows.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                <Clock className="size-6" />
                <p className="text-sm">No asset edit sessions in this period.</p>
              </div>
            )}
            {!loading && report && report.detailRows.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Active Time</TableHead>
                    <TableHead>Idle Excluded</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.detailRows.map((row, i) => (
                    <TableRow key={`${row.assetId}-${row.startedAt}-${i}`}>
                      <TableCell>{parseBackendTimestamp(row.startedAt).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{row.userName}</TableCell>
                      <TableCell>{row.projectName ?? "—"}</TableCell>
                      <TableCell className="max-w-48 truncate">{row.fileName}</TableCell>
                      <TableCell className="font-mono">{formatDuration(row.activeSeconds * 1000)}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {row.idleSecondsExcluded >= 60 ? formatDuration(row.idleSecondsExcluded * 1000) : "—"}
                      </TableCell>
                      <TableCell>{row.endReason === "SAVED" ? "Saved" : row.endReason === "SWITCHED" ? "Switched away" : "App closed"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
