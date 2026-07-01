import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetDashboardSummary, useGetTopProducts, useGetSalesByHour } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, DollarSign, Receipt, TrendingUp, Package, Users, ShoppingCart, Percent } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

function fetchWithAuth<T>(url: string): Promise<T> {
  const token = localStorage.getItem("pos_token") ?? "";
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
}

function fmt(n?: number) { return Number(n ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const now = new Date();
const today = now.toISOString().slice(0, 10);
const monthStart = today.slice(0, 7) + "-01";
const dateParams = `?startDate=${monthStart}&endDate=${today}`;

const PAYMENT_COLORS: Record<string, string> = { cash: "#1e3a5f", card: "#3b82f6", mixed: "#f59e0b" };
const PAYMENT_LABELS: Record<string, string> = { cash: "نقداً", card: "شبكة", mixed: "مختلط" };

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: topProducts, isLoading: isLoadingTopProducts } = useGetTopProducts();
  const { data: salesByHour, isLoading: isLoadingSalesByHour } = useGetSalesByHour();
  const { data: paymentRows = [] } = useQuery<any[]>({
    queryKey: ["dash-payment"],
    queryFn: () => fetchWithAuth(`/api/reports/by-payment${dateParams}`),
  });
  const { data: categoryRows = [] } = useQuery<any[]>({
    queryKey: ["dash-category"],
    queryFn: () => fetchWithAuth(`/api/reports/by-category${dateParams}`),
  });

  if (isLoadingSummary || isLoadingTopProducts || isLoadingSalesByHour) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const avgOrderValue = summary && summary.todayOrders > 0 ? summary.todaySales / summary.todayOrders : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">لوحة القيادة</h1>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>

        {/* Today stats — row 1 */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">اليوم</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-r-4 border-r-primary">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0"><DollarSign className="w-5 h-5" /></div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">المبيعات</p>
                  <p className="text-xl font-bold truncate">{fmt(summary?.todaySales)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-r-4 border-r-blue-500">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg shrink-0"><Receipt className="w-5 h-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">الفواتير</p>
                  <p className="text-xl font-bold">{summary?.todayOrders}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-r-4 border-r-green-500">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-green-500/10 text-green-600 rounded-lg shrink-0"><TrendingUp className="w-5 h-5" /></div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">الأرباح</p>
                  <p className="text-xl font-bold truncate">{fmt(summary?.todayProfit)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-r-4 border-r-amber-500">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg shrink-0"><ShoppingCart className="w-5 h-5" /></div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">متوسط الفاتورة</p>
                  <p className="text-xl font-bold truncate">{fmt(avgOrderValue)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Month stats — row 2 */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">الشهر الحالي</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0"><DollarSign className="w-5 h-5" /></div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">المبيعات</p>
                  <p className="text-xl font-bold truncate">{fmt(summary?.monthSales)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg shrink-0"><Receipt className="w-5 h-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">الفواتير</p>
                  <p className="text-xl font-bold">{summary?.monthOrders}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg shrink-0"><Package className="w-5 h-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">المنتجات النشطة</p>
                  <p className="text-xl font-bold">{summary?.totalProducts}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 text-orange-600 rounded-lg shrink-0"><Users className="w-5 h-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">العملاء</p>
                  <p className="text-xl font-bold">{summary?.totalCustomers}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">مبيعات اليوم بالساعة</CardTitle></CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesByHour || []} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hour" tickFormatter={(v) => `${v}:00`} tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip labelFormatter={(v) => `الساعة ${v}:00`} formatter={(v: number) => [fmt(v), "المبيعات"]} />
                  <Line type="monotone" dataKey="total" name="المبيعات" stroke="#1e3a5f" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">أكثر المنتجات مبيعاً (الشهر)</CardTitle></CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(topProducts || []).slice(0, 8)} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9 }} />
                  <YAxis type="category" dataKey="productName" width={95} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [v, "الكمية"]} />
                  <Bar dataKey="totalQty" name="الكمية" fill="#1e3a5f" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">طرق الدفع (الشهر)</CardTitle></CardHeader>
            <CardContent className="h-56">
              {paymentRows.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">لا توجد بيانات</div>
              ) : (
                <div className="flex items-center gap-4 h-full">
                  <ResponsiveContainer width="60%" height="100%">
                    <PieChart>
                      <Pie data={paymentRows} dataKey="total" nameKey="paymentMethod" cx="50%" cy="50%" outerRadius={70} innerRadius={30}>
                        {paymentRows.map((r: any, i: number) => <Cell key={i} fill={PAYMENT_COLORS[r.paymentMethod] ?? "#94a3b8"} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [fmt(v), "الإجمالي"]} labelFormatter={(v) => PAYMENT_LABELS[v] ?? v} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2 text-sm">
                    {paymentRows.map((r: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: PAYMENT_COLORS[r.paymentMethod] ?? "#94a3b8" }} />
                        <div>
                          <p className="font-medium leading-tight">{PAYMENT_LABELS[r.paymentMethod] ?? r.paymentMethod}</p>
                          <p className="text-xs text-muted-foreground">{r.orders} فاتورة — {fmt(r.total)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">المبيعات بالفئة (الشهر)</CardTitle></CardHeader>
            <CardContent className="h-56">
              {categoryRows.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">لا توجد بيانات</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryRows} margin={{ top: 5, right: 10, bottom: 30, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="categoryName" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip formatter={(v: number) => [fmt(v), "الإيراد"]} />
                    <Bar dataKey="totalRevenue" name="الإيراد" fill="#f59e0b" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
