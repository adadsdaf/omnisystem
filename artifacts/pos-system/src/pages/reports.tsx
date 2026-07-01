import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useGetSalesReport, useGetPrintersList } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Printer, Download, TrendingUp, ShoppingBag, Users, Tag } from "lucide-react";

const COLORS = ["#1e3a5f", "#3b82f6", "#f59e0b", "#10b981", "#ec4899", "#8b5cf6", "#ef4444", "#06b6d4"];

type Tab = "sales" | "cashier" | "product" | "category" | "payment";

const TAB_LABELS: Record<Tab, string> = {
  sales: "المبيعات اليومية",
  cashier: "بالكاشير",
  product: "بالمنتج",
  category: "بالفئة",
  payment: "بطريقة الدفع",
};

function fetchWithAuth<T>(url: string): Promise<T> {
  const token = localStorage.getItem("pos_token") ?? "";
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
}

function fmt(n: number) { return Number(n ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function Reports() {
  const now = new Date();
  const [startDate, setStartDate] = useState(now.toISOString().slice(0, 7) + "-01");
  const [endDate, setEndDate] = useState(now.toISOString().slice(0, 10));
  const [groupBy, setGroupBy] = useState<"day" | "month" | "year">("day");
  const [tab, setTab] = useState<Tab>("sales");
  const [showPrintDlg, setShowPrintDlg] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState("__window__");
  const printRef = useRef<HTMLDivElement>(null);

  const dateParams = `?startDate=${startDate}&endDate=${endDate}`;
  const { data: salesRows = [], isLoading: isSalesLoading } = useGetSalesReport({ startDate, endDate, groupBy });
  const { data: cashierRows = [] } = useQuery<any[]>({ queryKey: ["reports-cashier", startDate, endDate], queryFn: () => fetchWithAuth(`/api/reports/by-cashier${dateParams}`) });
  const { data: productRows = [] } = useQuery<any[]>({ queryKey: ["reports-product", startDate, endDate], queryFn: () => fetchWithAuth(`/api/reports/by-product${dateParams}&limit=30`) });
  const { data: categoryRows = [] } = useQuery<any[]>({ queryKey: ["reports-category", startDate, endDate], queryFn: () => fetchWithAuth(`/api/reports/by-category${dateParams}`) });
  const { data: paymentRows = [] } = useQuery<any[]>({ queryKey: ["reports-payment", startDate, endDate], queryFn: () => fetchWithAuth(`/api/reports/by-payment${dateParams}`) });
  const { data: printers = [] } = useGetPrintersList();

  const totalSales = salesRows.reduce((s, r) => s + r.total, 0);
  const totalOrders = salesRows.reduce((s, r) => s + r.orders, 0);
  const totalDiscount = salesRows.reduce((s, r) => s + ((r as any).discount ?? 0), 0);
  const totalTax = salesRows.reduce((s, r) => s + ((r as any).tax ?? 0), 0);

  const handlePrint = () => {
    if (selectedPrinter === "__window__") {
      window.print();
      setShowPrintDlg(false);
    } else {
      window.print();
      setShowPrintDlg(false);
    }
  };

  const paymentLabel = (m: string) => m === "cash" ? "نقداً" : m === "card" ? "شبكة" : m === "mixed" ? "مختلط" : m;

  return (
    <AdminLayout>
      {/* Hidden print area */}
      <div className="hidden-print-container" ref={printRef}>
        <div id="report-print-area" style={{ fontFamily: "Arial, sans-serif", direction: "rtl", padding: "16px", maxWidth: "800px", margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: "18px", fontWeight: "bold", marginBottom: "4px" }}>تقرير مفصّل — {TAB_LABELS[tab]}</h2>
          <p style={{ textAlign: "center", fontSize: "12px", color: "#666", marginBottom: "16px" }}>من {startDate} إلى {endDate}</p>
          {tab === "sales" && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead><tr style={{ background: "#f1f5f9" }}>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right" }}>الفترة</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "center" }}>الفواتير</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>الإجمالي</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>الضريبة</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>الخصم</th>
              </tr></thead>
              <tbody>
                {salesRows.map((r, i) => <tr key={i}>
                  <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px" }}>{r.period}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "center" }}>{r.orders}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "left", fontWeight: "bold" }}>{fmt(r.total)}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "left" }}>{fmt((r as any).tax ?? 0)}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "left" }}>{fmt((r as any).discount ?? 0)}</td>
                </tr>)}
              </tbody>
              <tfoot><tr style={{ background: "#f8fafc", fontWeight: "bold" }}>
                <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px" }}>الإجمالي</td>
                <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "center" }}>{totalOrders}</td>
                <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>{fmt(totalSales)}</td>
                <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>{fmt(totalTax)}</td>
                <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>{fmt(totalDiscount)}</td>
              </tr></tfoot>
            </table>
          )}
          {tab === "cashier" && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead><tr style={{ background: "#f1f5f9" }}>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right" }}>الكاشير</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "center" }}>الفواتير</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>الإجمالي</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>الخصم</th>
              </tr></thead>
              <tbody>
                {cashierRows.map((r: any, i) => <tr key={i}>
                  <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px" }}>{r.userName}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "center" }}>{r.orders}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "left", fontWeight: "bold" }}>{fmt(r.total)}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "left" }}>{fmt(r.discount)}</td>
                </tr>)}
              </tbody>
            </table>
          )}
          {tab === "product" && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead><tr style={{ background: "#f1f5f9" }}>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right" }}>المنتج</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right" }}>الفئة</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "center" }}>الكمية</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>الإيراد</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>الربح</th>
              </tr></thead>
              <tbody>
                {productRows.map((r: any, i) => <tr key={i}>
                  <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px" }}>{r.productName}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px" }}>{r.categoryName ?? "-"}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "center" }}>{r.totalQty}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "left", fontWeight: "bold" }}>{fmt(r.totalRevenue)}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "left", color: "#16a34a" }}>{fmt(r.totalProfit)}</td>
                </tr>)}
              </tbody>
            </table>
          )}
          {tab === "category" && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead><tr style={{ background: "#f1f5f9" }}>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right" }}>الفئة</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "center" }}>الفواتير</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "center" }}>الكمية</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>الإيراد</th>
              </tr></thead>
              <tbody>
                {categoryRows.map((r: any, i) => <tr key={i}>
                  <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px" }}>{r.categoryName}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "center" }}>{r.orderCount}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "center" }}>{r.totalQty}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "left", fontWeight: "bold" }}>{fmt(r.totalRevenue)}</td>
                </tr>)}
              </tbody>
            </table>
          )}
          {tab === "payment" && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead><tr style={{ background: "#f1f5f9" }}>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "right" }}>طريقة الدفع</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "center" }}>الفواتير</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>الإجمالي</th>
              </tr></thead>
              <tbody>
                {paymentRows.map((r: any, i) => <tr key={i}>
                  <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px" }}>{paymentLabel(r.paymentMethod)}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "center" }}>{r.orders}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "left", fontWeight: "bold" }}>{fmt(r.total)}</td>
                </tr>)}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h1 className="text-2xl font-bold">تقارير تفصيلية</h1>
          <div className="flex gap-2 flex-wrap items-center">
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36 text-sm" />
            <span className="text-muted-foreground text-sm">إلى</span>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-36 text-sm" />
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowPrintDlg(true)}>
              <Printer className="w-4 h-4" />
              طباعة التقرير
            </Button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg"><TrendingUp className="w-5 h-5" /></div>
            <div><p className="text-xs text-muted-foreground">إجمالي المبيعات</p><p className="text-lg font-bold text-amber-600">{fmt(totalSales)}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg"><ShoppingBag className="w-5 h-5" /></div>
            <div><p className="text-xs text-muted-foreground">عدد الفواتير</p><p className="text-lg font-bold">{totalOrders}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-500/10 text-green-600 rounded-lg"><Tag className="w-5 h-5" /></div>
            <div><p className="text-xs text-muted-foreground">إجمالي الضريبة</p><p className="text-lg font-bold text-green-600">{fmt(totalTax)}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg"><Tag className="w-5 h-5" /></div>
            <div><p className="text-xs text-muted-foreground">إجمالي الخصم</p><p className="text-lg font-bold text-red-500">{fmt(totalDiscount)}</p></div>
          </CardContent></Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border flex-wrap">
          {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Tab: Sales */}
        {tab === "sales" && (
          <div className="space-y-4">
            <div className="flex gap-1 border rounded-lg overflow-hidden w-fit">
              {(["day","month","year"] as const).map(g => (
                <button key={g} onClick={() => setGroupBy(g)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${groupBy === g ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                  {g === "day" ? "يومي" : g === "month" ? "شهري" : "سنوي"}
                </button>
              ))}
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">مبيعات حسب الفترة</CardTitle></CardHeader>
              <CardContent className="h-64">
                {isSalesLoading ? <div className="flex items-center justify-center h-full text-muted-foreground text-sm">جاري التحميل...</div> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesRows} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => [fmt(v), "المبيعات"]} />
                      <Bar dataKey="total" name="المبيعات" fill="#1e3a5f" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">تفصيل البيانات</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-right p-3 font-semibold">الفترة</th>
                      <th className="text-center p-3 font-semibold">الفواتير</th>
                      <th className="text-left p-3 font-semibold">الإجمالي</th>
                      <th className="text-left p-3 font-semibold">الضريبة</th>
                      <th className="text-left p-3 font-semibold">الخصم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {salesRows.map((r, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="p-3 font-mono text-xs">{r.period}</td>
                        <td className="p-3 text-center">{r.orders}</td>
                        <td className="p-3 text-left font-bold text-amber-600">{fmt(r.total)}</td>
                        <td className="p-3 text-left text-green-600">{fmt((r as any).tax ?? 0)}</td>
                        <td className="p-3 text-left text-red-500">{fmt((r as any).discount ?? 0)}</td>
                      </tr>
                    ))}
                    {salesRows.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">لا توجد بيانات</td></tr>}
                  </tbody>
                  {salesRows.length > 0 && (
                    <tfoot className="bg-muted/50 border-t font-bold">
                      <tr>
                        <td className="p-3">الإجمالي</td>
                        <td className="p-3 text-center">{totalOrders}</td>
                        <td className="p-3 text-left text-amber-600">{fmt(totalSales)}</td>
                        <td className="p-3 text-left text-green-600">{fmt(totalTax)}</td>
                        <td className="p-3 text-left text-red-500">{fmt(totalDiscount)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab: By Cashier */}
        {tab === "cashier" && (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">مبيعات حسب الكاشير</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashierRows} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="userName" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => [fmt(v), "المبيعات"]} />
                    <Bar dataKey="total" name="المبيعات" fill="#1e3a5f" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-right p-3 font-semibold">الكاشير</th>
                      <th className="text-center p-3 font-semibold">الفواتير</th>
                      <th className="text-left p-3 font-semibold">الإجمالي</th>
                      <th className="text-left p-3 font-semibold">الخصم الممنوح</th>
                      <th className="text-left p-3 font-semibold">الضريبة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {cashierRows.map((r: any, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="p-3 font-semibold flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{r.userName?.charAt(0)}</div>
                          {r.userName}
                        </td>
                        <td className="p-3 text-center">{r.orders}</td>
                        <td className="p-3 text-left font-bold text-amber-600">{fmt(r.total)}</td>
                        <td className="p-3 text-left text-red-500">{fmt(r.discount)}</td>
                        <td className="p-3 text-left text-green-600">{fmt(r.tax)}</td>
                      </tr>
                    ))}
                    {cashierRows.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">لا توجد بيانات</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab: By Product */}
        {tab === "product" && (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">أكثر 10 منتجات مبيعاً (بالكمية)</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productRows.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 120 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="productName" width={115} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [v, "الكمية"]} />
                    <Bar dataKey="totalQty" name="الكمية" fill="#1e3a5f" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-center p-3 font-semibold w-10">#</th>
                      <th className="text-right p-3 font-semibold">المنتج</th>
                      <th className="text-right p-3 font-semibold">الفئة</th>
                      <th className="text-center p-3 font-semibold">الكمية</th>
                      <th className="text-center p-3 font-semibold">الفواتير</th>
                      <th className="text-left p-3 font-semibold">الإيراد</th>
                      <th className="text-left p-3 font-semibold">الربح</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {productRows.map((r: any, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="p-3 text-center text-muted-foreground font-mono text-xs">{i + 1}</td>
                        <td className="p-3 font-semibold">{r.productName}</td>
                        <td className="p-3 text-muted-foreground">{r.categoryName ?? "-"}</td>
                        <td className="p-3 text-center font-bold">{r.totalQty}</td>
                        <td className="p-3 text-center">{r.orderCount}</td>
                        <td className="p-3 text-left font-bold text-amber-600">{fmt(r.totalRevenue)}</td>
                        <td className="p-3 text-left font-bold text-green-600">{fmt(r.totalProfit)}</td>
                      </tr>
                    ))}
                    {productRows.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">لا توجد بيانات</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab: By Category */}
        {tab === "category" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">المبيعات بالفئة</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryRows} dataKey="totalRevenue" nameKey="categoryName" cx="50%" cy="50%" outerRadius={90} label={({ categoryName, percent }) => `${categoryName} (${(percent * 100).toFixed(0)}%)`}>
                        {categoryRows.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [fmt(v), "الإيراد"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">الكمية بالفئة</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryRows} margin={{ top: 5, right: 10, bottom: 30, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="categoryName" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="totalQty" name="الكمية" fill="#f59e0b" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-right p-3 font-semibold">الفئة</th>
                      <th className="text-center p-3 font-semibold">الفواتير</th>
                      <th className="text-center p-3 font-semibold">إجمالي الكمية</th>
                      <th className="text-left p-3 font-semibold">الإيراد</th>
                      <th className="text-left p-3 font-semibold">النسبة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {categoryRows.map((r: any, i) => {
                      const totalRev = categoryRows.reduce((s: number, x: any) => s + x.totalRevenue, 0);
                      const pct = totalRev > 0 ? ((r.totalRevenue / totalRev) * 100).toFixed(1) : "0";
                      return (
                        <tr key={i} className="hover:bg-muted/30">
                          <td className="p-3 font-semibold flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                            {r.categoryName}
                          </td>
                          <td className="p-3 text-center">{r.orderCount}</td>
                          <td className="p-3 text-center font-bold">{r.totalQty}</td>
                          <td className="p-3 text-left font-bold text-amber-600">{fmt(r.totalRevenue)}</td>
                          <td className="p-3 text-left">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-muted rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} /></div>
                              <span className="text-xs text-muted-foreground w-10 text-left">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {categoryRows.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">لا توجد بيانات</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab: By Payment */}
        {tab === "payment" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">توزيع طرق الدفع</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={paymentRows} dataKey="total" nameKey="paymentMethod" cx="50%" cy="50%" outerRadius={90}
                        label={({ paymentMethod, percent }) => `${paymentLabel(paymentMethod)} (${(percent * 100).toFixed(0)}%)`}>
                        {paymentRows.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [fmt(v), "الإجمالي"]} labelFormatter={paymentLabel} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 gap-3 content-start">
                {paymentRows.map((r: any, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-3 h-8 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">{paymentLabel(r.paymentMethod)}</p>
                        <p className="text-xl font-bold text-amber-600">{fmt(r.total)}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-muted-foreground">الفواتير</p>
                        <p className="text-lg font-bold">{r.orders}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {paymentRows.length === 0 && <p className="text-center text-muted-foreground py-10">لا توجد بيانات</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Print dialog */}
      <Dialog open={showPrintDlg} onOpenChange={setShowPrintDlg}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Printer className="w-5 h-5" /> طباعة التقرير</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">التقرير: <strong>{TAB_LABELS[tab]}</strong></p>
            <p className="text-sm text-muted-foreground">الفترة: {startDate} — {endDate}</p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">اختر الطابعة</label>
              <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر طابعة..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__window__">طابعة افتراضية (نافذة الطباعة)</SelectItem>
                  {printers.map((p: any) => (
                    <SelectItem key={p.name} value={p.name}>{p.name} {p.isDefault ? "(افتراضية)" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {printers.length === 0 && (
                <p className="text-xs text-muted-foreground">لم يتم الكشف عن طابعات متصلة — سيتم استخدام نافذة الطباعة</p>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1 gap-1.5" onClick={handlePrint}>
                <Printer className="w-4 h-4" /> طباعة
              </Button>
              <Button variant="outline" onClick={() => setShowPrintDlg(false)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
