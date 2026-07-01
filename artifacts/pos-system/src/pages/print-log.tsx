import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useGetPrintLogs } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle2, XCircle, RefreshCw, Search } from "lucide-react";

export default function PrintLog() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading, refetch } = useGetPrintLogs(
    startDate || endDate
      ? { startDate: startDate || undefined, endDate: endDate || undefined }
      : {}
  );

  const filtered = logs.filter(log => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      log.invoiceNumber.toLowerCase().includes(s) ||
      (log.departmentName ?? "").toLowerCase().includes(s) ||
      (log.printerName ?? "").toLowerCase().includes(s) ||
      (log.userName ?? "").toLowerCase().includes(s) ||
      log.receiptType.toLowerCase().includes(s)
    );
  });

  const receiptTypeLabel = (type: string) => {
    if (type === "master") return "فاتورة رئيسية";
    if (type === "department") return "فاتورة قسم";
    if (type === "reprint") return "إعادة طباعة";
    return type;
  };

  const stats = {
    total: logs.length,
    success: logs.filter(l => l.status === "success").length,
    failed: logs.filter(l => l.status === "failed").length,
    reprints: logs.filter(l => l.reprintCount > 0).length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            سجل الطباعة
          </h1>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            تحديث
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">إجمالي العمليات</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">ناجحة</p>
              <p className="text-2xl font-bold mt-1 text-green-600">{stats.success}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">فاشلة</p>
              <p className="text-2xl font-bold mt-1 text-red-500">{stats.failed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">إعادة طباعة</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{stats.reprints}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">من تاريخ</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">إلى تاريخ</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
              </div>
              <div className="flex-1 min-w-48 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">بحث</label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="رقم الفاتورة، القسم، الموظف..."
                    className="pr-9"
                  />
                </div>
              </div>
              {(startDate || endDate || search) && (
                <Button variant="ghost" size="sm" onClick={() => { setStartDate(""); setEndDate(""); setSearch(""); }}>
                  مسح الفلاتر
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Log Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              سجل العمليات <span className="text-muted-foreground font-normal text-sm">({filtered.length} سجل)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">لا توجد سجلات</div>
            ) : (
              <ScrollArea className="h-[500px]">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">#</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">رقم الفاتورة</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">نوع الفاتورة</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">القسم</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">الطابعة</th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">النسخ</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">الموظف</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">الوقت</th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((log, idx) => (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 text-muted-foreground">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-medium">{log.invoiceNumber}</td>
                        <td className="py-2 px-3">
                          <Badge variant="outline" className="text-xs">{receiptTypeLabel(log.receiptType)}</Badge>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{log.departmentName ?? "—"}</td>
                        <td className="py-2 px-3 text-muted-foreground text-xs">{log.printerName ?? "—"}</td>
                        <td className="py-2 px-3 text-center">{log.copies}</td>
                        <td className="py-2 px-3">{log.userName ?? "—"}</td>
                        <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.printedAt).toLocaleString("ar-SA")}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {log.status === "success" ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
