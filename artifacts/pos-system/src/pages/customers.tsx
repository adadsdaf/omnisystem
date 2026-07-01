import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useGetCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, getGetCustomersQueryKey } from "@workspace/api-client-react";
import type { Customer, CustomerInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function Customers() {
  const { data: customers = [], isLoading } = useGetCustomers();
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerInput>({ name: "", phone: null, email: null, address: null });

  const openAdd = () => { setEditing(null); setForm({ name: "", phone: null, email: null, address: null }); setShowDialog(true); };
  const openEdit = (c: Customer) => { setEditing(c); setForm({ name: c.name, phone: c.phone ?? null, email: c.email ?? null, address: c.address ?? null }); setShowDialog(true); };

  const invalidate = () => qc.invalidateQueries({ queryKey: getGetCustomersQueryKey() });

  const handleSave = () => {
    if (!form.name) return;
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

  const handleDelete = (c: Customer) => {
    if (!confirm(`حذف العميل "${c.name}"؟`)) return;
    deleteMutation.mutate({ id: c.id }, {
      onSuccess: invalidate,
      onError: () => toast({ variant: "destructive", title: "فشل في الحذف" })
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">إدارة العملاء</h1>
          <Button onClick={openAdd} className="gap-2"><Plus className="w-4 h-4" />إضافة عميل</Button>
        </div>
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">جاري التحميل...</div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-right p-3 font-semibold">الاسم</th>
                  <th className="text-right p-3 font-semibold">الهاتف</th>
                  <th className="text-right p-3 font-semibold">البريد</th>
                  <th className="text-left p-3 font-semibold">إجمالي المشتريات</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map(c => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3 text-muted-foreground">{c.phone ?? "-"}</td>
                    <td className="p-3 text-muted-foreground">{c.email ?? "-"}</td>
                    <td className="p-3 text-left font-bold text-amber-600">{(c.totalPurchases ?? 0).toFixed(2)}</td>
                    <td className="p-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openEdit(c)} className="text-muted-foreground hover:text-primary"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(c)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">لا يوجد عملاء</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "تعديل عميل" : "إضافة عميل"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {([["name","الاسم",true],["phone","الهاتف",false],["email","البريد الإلكتروني",false],["address","العنوان",false]] as const).map(([field, label, required]) => (
              <div key={field} className="space-y-1">
                <label className="text-sm font-medium">{label}{required && " *"}</label>
                <Input value={(form as any)[field] ?? ""} onChange={e => setForm({ ...form, [field]: e.target.value || null })} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={!form.name}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
