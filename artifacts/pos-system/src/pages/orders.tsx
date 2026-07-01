import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useGetOrders, useDeleteOrder, getGetOrdersQueryKey } from "@workspace/api-client-react";
import type { Order } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Eye, Search } from "lucide-react";

export default function Orders() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { data: orders = [], isLoading } = useGetOrders({ startDate: startDate || undefined, endDate: endDate || undefined });
  const deleteMutation = useDeleteOrder();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  const handleDelete = (order: Order) => {
    if (!confirm(`حذف الفاتورة ${order.invoiceNumber}؟`)) return;
    deleteMutation.mutate({ id: order.id }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetOrdersQueryKey() }),
      onError: () => toast({ variant: "destructive", title: "فشل في الحذف" })
    });
  };

  const pmLabel = (m: string) => m === "cash" ? "نقداً" : m === "card" ? "شبكة" : "مختلط";

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h1 className="text-2xl font-bold">الطلبات والفواتير</h1>
          <div className="flex gap-2 items-center">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36" placeholder="من" />
            <span className="text-muted-foreground">-</span>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-36" placeholder="إلى" />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">جاري التحميل...</div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-right p-3 font-semibold">رقم الفاتورة</th>
                  <th className="text-right p-3 font-semibold">التاريخ</th>
                  <th className="text-right p-3 font-semibold">الكاشير</th>
                  <th className="text-right p-3 font-semibold">الدفع</th>
                  <th className="text-left p-3 font-semibold">الإجمالي</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-muted/30">
                    <td className="p-3 font-mono font-bold text-primary">{order.invoiceNumber}</td>
                    <td className="p-3 text-xs">{new Date(order.createdAt).toLocaleString("ar-SA")}</td>
                    <td className="p-3">{order.userName}</td>
                    <td className="p-3"><Badge variant="outline">{pmLabel(order.paymentMethod)}</Badge></td>
                    <td className="p-3 text-left font-bold text-amber-600">{order.total.toFixed(2)}</td>
                    <td className="p-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setViewOrder(order)} className="text-muted-foreground hover:text-primary"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(order)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">لا توجد فواتير</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>تفاصيل الفاتورة {viewOrder?.invoiceNumber}</DialogTitle></DialogHeader>
          {viewOrder && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div><span className="font-medium text-foreground">التاريخ: </span>{new Date(viewOrder.createdAt).toLocaleString("ar-SA")}</div>
                <div><span className="font-medium text-foreground">الكاشير: </span>{viewOrder.userName}</div>
                <div><span className="font-medium text-foreground">طريقة الدفع: </span>{pmLabel(viewOrder.paymentMethod)}</div>
                {viewOrder.customerName && <div><span className="font-medium text-foreground">العميل: </span>{viewOrder.customerName}</div>}
              </div>
              <table className="w-full">
                <thead><tr className="border-b"><th className="text-right py-1">الصنف</th><th className="text-center py-1">ك</th><th className="text-left py-1">الإجمالي</th></tr></thead>
                <tbody>
                  {viewOrder.items?.map((item, i) => (
                    <tr key={i} className="border-b border-dashed">
                      <td className="py-1">{item.productName}</td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-left">{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="space-y-1 border-t pt-2">
                <div className="flex justify-between"><span>المجموع الفرعي</span><span>{(viewOrder.subtotal ?? 0).toFixed(2)}</span></div>
                {(viewOrder.discount ?? 0) > 0 && <div className="flex justify-between text-red-500"><span>خصم</span><span>-{(viewOrder.discount ?? 0).toFixed(2)}</span></div>}
                {(viewOrder.tax ?? 0) > 0 && <div className="flex justify-between"><span>ضريبة</span><span>{(viewOrder.tax ?? 0).toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-base border-t pt-1"><span>الإجمالي</span><span className="text-amber-600">{viewOrder.total.toFixed(2)}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
