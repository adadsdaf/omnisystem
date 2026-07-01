import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useGetUsers, useCreateUser, useUpdateUser, useDeleteUser, getGetUsersQueryKey } from "@workspace/api-client-react";
import type { User, UserInput, UserUpdate } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

type FormData = { username: string; name: string; role: "admin" | "cashier"; password: string; active: boolean };

export default function Users() {
  const { data: users = [], isLoading } = useGetUsers();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<FormData>({ username: "", name: "", role: "cashier", password: "", active: true });

  const openAdd = () => { setEditing(null); setForm({ username: "", name: "", role: "cashier", password: "", active: true }); setShowDialog(true); };
  const openEdit = (u: User) => { setEditing(u); setForm({ username: u.username, name: u.name, role: u.role, password: "", active: u.active }); setShowDialog(true); };

  const invalidate = () => qc.invalidateQueries({ queryKey: getGetUsersQueryKey() });

  const handleSave = () => {
    if (!form.username || !form.name || (!editing && !form.password)) return;
    if (editing) {
      const data: UserUpdate = { username: form.username, name: form.name, role: form.role, active: form.active, password: form.password || null };
      updateMutation.mutate({ id: editing.id, data }, {
        onSuccess: () => { invalidate(); setShowDialog(false); },
        onError: () => toast({ variant: "destructive", title: "فشل في التحديث" })
      });
    } else {
      const data: UserInput = { username: form.username, name: form.name, role: form.role, password: form.password, active: form.active };
      createMutation.mutate({ data }, {
        onSuccess: () => { invalidate(); setShowDialog(false); },
        onError: () => toast({ variant: "destructive", title: "فشل في الإضافة" })
      });
    }
  };

  const handleDelete = (u: User) => {
    if (!confirm(`حذف المستخدم "${u.name}"؟`)) return;
    deleteMutation.mutate({ id: u.id }, {
      onSuccess: invalidate,
      onError: () => toast({ variant: "destructive", title: "فشل في الحذف" })
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
          <Button onClick={openAdd} className="gap-2"><Plus className="w-4 h-4" />إضافة مستخدم</Button>
        </div>
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">جاري التحميل...</div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-right p-3 font-semibold">الاسم</th>
                  <th className="text-right p-3 font-semibold">اسم المستخدم</th>
                  <th className="text-right p-3 font-semibold">الدور</th>
                  <th className="text-right p-3 font-semibold">الحالة</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="p-3 font-medium">{u.name}</td>
                    <td className="p-3 font-mono text-muted-foreground">{u.username}</td>
                    <td className="p-3">
                      <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                        {u.role === "admin" ? "مدير" : "كاشير"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant={u.active ? "outline" : "destructive"} className={u.active ? "text-green-600 border-green-600" : ""}>
                        {u.active ? "نشط" : "موقوف"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openEdit(u)} className="text-muted-foreground hover:text-primary"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(u)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">لا يوجد مستخدمون</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "تعديل مستخدم" : "إضافة مستخدم"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">الاسم الكامل *</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">اسم المستخدم *</label>
              <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} dir="ltr" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">كلمة المرور {editing ? "(اتركها فارغة للإبقاء)" : "*"}</label>
              <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} dir="ltr" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">الدور</label>
              <div className="flex gap-2">
                {(["admin","cashier"] as const).map(r => (
                  <button key={r} onClick={() => setForm({ ...form, role: r })}
                    className={`flex-1 py-2 rounded border text-sm ${form.role === r ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                    {r === "admin" ? "مدير" : "كاشير"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">نشط</label>
              <Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={!form.username || !form.name}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
