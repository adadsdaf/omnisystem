import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useGetCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, getGetCategoriesQueryKey } from "@workspace/api-client-react";
import type { Category, CategoryInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function Categories() {
  const { data: categories = [], isLoading } = useGetCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryInput>({ name: "", color: "#f59e0b" });

  const openAdd = () => { setEditing(null); setForm({ name: "", color: "#f59e0b" }); setShowDialog(true); };
  const openEdit = (cat: Category) => { setEditing(cat); setForm({ name: cat.name, color: cat.color ?? "#f59e0b" }); setShowDialog(true); };

  const handleSave = () => {
    if (!form.name) return;
    const invalidate = () => qc.invalidateQueries({ queryKey: getGetCategoriesQueryKey() });
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form }, {
        onSuccess: () => { invalidate(); setShowDialog(false); },
        onError: () => toast({ variant: "destructive", title: "فشل في التحديث" })
      });
    } else {
      createMutation.mutate({ data: form }, {
        onSuccess: () => { invalidate(); setShowDialog(false); },
        onError: () => toast({ variant: "destructive", title: "فشل في الإضافة" })
      });
    }
  };

  const handleDelete = (cat: Category) => {
    if (!confirm(`حذف تصنيف "${cat.name}"؟`)) return;
    deleteMutation.mutate({ id: cat.id }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetCategoriesQueryKey() }),
      onError: () => toast({ variant: "destructive", title: "فشل في الحذف" })
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">التصنيفات</h1>
          <Button onClick={openAdd} className="gap-2"><Plus className="w-4 h-4" />إضافة تصنيف</Button>
        </div>
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">جاري التحميل...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {categories.map(cat => (
              <div key={cat.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full shrink-0" style={{ backgroundColor: cat.color ?? "#e5e7eb" }} />
                <span className="flex-1 font-medium">{cat.name}</span>
                <button onClick={() => openEdit(cat)} className="text-muted-foreground hover:text-primary"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(cat)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {categories.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">لا توجد تصنيفات</div>}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "تعديل التصنيف" : "إضافة تصنيف"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">الاسم</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">اللون</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color ?? "#f59e0b"} onChange={e => setForm({ ...form, color: e.target.value })} className="w-10 h-10 rounded cursor-pointer border border-border" />
                <span className="text-sm text-muted-foreground">{form.color}</span>
              </div>
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
