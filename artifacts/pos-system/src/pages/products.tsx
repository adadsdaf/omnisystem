import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useGetProducts, useCreateProduct, useUpdateProduct, useDeleteProduct,
  useGetCategories, getGetProductsQueryKey,
} from "@workspace/api-client-react";
import type { Product, ProductInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, Pencil, Trash2 } from "lucide-react";

const emptyForm = (): ProductInput => ({ name: "", number: 0, price: 0, cost: null, barcode: null, categoryId: null, active: true, stock: null });

export default function Products() {
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductInput>(emptyForm());

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: products, isLoading } = useGetProducts({ search: search || undefined });
  const { data: categories = [] } = useGetCategories();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setShowDialog(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, number: p.number, price: p.price, cost: p.cost ?? null, barcode: p.barcode ?? null, categoryId: p.categoryId ?? null, active: p.active, stock: p.stock ?? null });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!form.name || !form.number || !form.price) {
      toast({ variant: "destructive", title: "يرجى تعبئة جميع الحقول المطلوبة" });
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form }, {
        onSuccess: () => { invalidate(); setShowDialog(false); toast({ title: "تم تحديث المنتج" }); },
        onError: () => toast({ variant: "destructive", title: "فشل في التحديث" })
      });
    } else {
      createMutation.mutate({ data: form }, {
        onSuccess: () => { invalidate(); setShowDialog(false); toast({ title: "تم إضافة المنتج" }); },
        onError: () => toast({ variant: "destructive", title: "فشل في الإضافة" })
      });
    }
  };

  const handleDelete = (p: Product) => {
    if (!confirm(`حذف المنتج "${p.name}"؟`)) return;
    deleteMutation.mutate({ id: p.id }, {
      onSuccess: () => { invalidate(); toast({ title: "تم حذف المنتج" }); },
      onError: () => toast({ variant: "destructive", title: "فشل في الحذف" })
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">إدارة المنتجات</h1>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="w-4 h-4" />
            إضافة منتج
          </Button>
        </div>

        <div className="relative w-full max-w-sm">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ابحث باسم المنتج أو رقمه..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-right p-3 font-semibold">رقم</th>
                <th className="text-right p-3 font-semibold">الاسم</th>
                <th className="text-right p-3 font-semibold">التصنيف</th>
                <th className="text-left p-3 font-semibold">السعر</th>
                <th className="text-left p-3 font-semibold">التكلفة</th>
                <th className="text-right p-3 font-semibold">الحالة</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : products?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد منتجات</td>
                </tr>
              ) : (
                products?.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/30">
                    <td className="p-3 font-mono font-bold text-primary">{product.number}</td>
                    <td className="p-3 font-medium">{product.name}</td>
                    <td className="p-3 text-muted-foreground">{product.categoryName ?? "-"}</td>
                    <td className="p-3 text-left font-bold text-amber-600">{product.price.toFixed(2)}</td>
                    <td className="p-3 text-left text-muted-foreground">{product.cost?.toFixed(2) ?? "-"}</td>
                    <td className="p-3">
                      <Badge variant={product.active ? "outline" : "secondary"} className={product.active ? "text-green-600 border-green-600" : ""}>
                        {product.active ? "نشط" : "غير نشط"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openEdit(product)} className="text-muted-foreground hover:text-primary"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(product)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "تعديل منتج" : "إضافة منتج"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-sm font-medium">اسم المنتج *</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">رقم المنتج *</label>
              <Input type="number" value={form.number || ""} onChange={e => setForm({ ...form, number: parseInt(e.target.value) || 0 })} dir="ltr" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">السعر *</label>
              <Input type="number" step="0.01" value={form.price || ""} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} dir="ltr" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">التكلفة</label>
              <Input type="number" step="0.01" value={form.cost ?? ""} onChange={e => setForm({ ...form, cost: e.target.value ? parseFloat(e.target.value) : null })} dir="ltr" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">الباركود</label>
              <Input value={form.barcode ?? ""} onChange={e => setForm({ ...form, barcode: e.target.value || null })} dir="ltr" />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-sm font-medium">التصنيف</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.categoryId ?? ""}
                onChange={e => setForm({ ...form, categoryId: e.target.value ? parseInt(e.target.value) : null })}
              >
                <option value="">بدون تصنيف</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">المخزون</label>
              <Input type="number" value={form.stock ?? ""} onChange={e => setForm({ ...form, stock: e.target.value ? parseInt(e.target.value) : null })} dir="ltr" />
            </div>
            <div className="flex items-center gap-3 mt-4">
              <label className="text-sm font-medium">نشط</label>
              <Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
