import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Users, DollarSign, Building2, CalendarCheck } from "lucide-react";

function fetchAuth(url: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("pos_token") ?? "";
  return fetch(url, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) } });
}

async function apiGet(url: string) {
  const r = await fetchAuth(url);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function apiPost(url: string, body: any) {
  const r = await fetchAuth(url, { method: "POST", body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function apiPut(url: string, body: any) {
  const r = await fetchAuth(url, { method: "PUT", body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function apiDel(url: string) {
  const r = await fetchAuth(url, { method: "DELETE" });
  if (!r.ok && r.status !== 204) throw new Error(await r.text());
}

function fmt(n?: number) { return Number(n ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

/* ─── Departments Tab ─── */
function DepartmentsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: depts = [], isLoading } = useQuery({ queryKey: ["hr-depts"], queryFn: () => apiGet("/api/hr/departments") });
  const [showDlg, setShowDlg] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", budget: "" });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["hr-depts"] });

  const saveMut = useMutation({
    mutationFn: (f: typeof form) => editing
      ? apiPut(`/api/hr/departments/${editing.id}`, { name: f.name, budget: Number(f.budget) })
      : apiPost("/api/hr/departments", { name: f.name, budget: Number(f.budget) }),
    onSuccess: () => { invalidate(); setShowDlg(false); toast({ title: editing ? "تم التعديل" : "تمت الإضافة" }); },
    onError: () => toast({ variant: "destructive", title: "فشل في الحفظ" }),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => apiDel(`/api/hr/departments/${id}`),
    onSuccess: invalidate,
    onError: () => toast({ variant: "destructive", title: "فشل في الحذف" }),
  });

  const openAdd = () => { setEditing(null); setForm({ name: "", budget: "" }); setShowDlg(true); };
  const openEdit = (d: any) => { setEditing(d); setForm({ name: d.name, budget: String(d.budget) }); setShowDlg(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">أقسام الشركة</h2>
        <Button onClick={openAdd} size="sm" className="gap-2"><Plus className="w-4 h-4" />إضافة قسم</Button>
      </div>
      {isLoading ? <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div> : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-right p-3 font-semibold">اسم القسم</th>
                <th className="text-right p-3 font-semibold">الميزانية</th>
                <th className="p-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(depts as any[]).map((d: any) => (
                <tr key={d.id} className="hover:bg-muted/30">
                  <td className="p-3 font-medium">{d.name}</td>
                  <td className="p-3 text-primary font-mono">{fmt(d.budget)}</td>
                  <td className="p-3">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => confirm("حذف القسم؟") && delMut.mutate(d.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(depts as any[]).length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">لا توجد أقسام</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={showDlg} onOpenChange={setShowDlg}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>{editing ? "تعديل قسم" : "إضافة قسم"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">اسم القسم *</label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: المبيعات" className="mt-1" /></div>
            <div><label className="text-sm font-medium">الميزانية</label><Input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="0" className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDlg(false)}>إلغاء</Button>
            <Button onClick={() => saveMut.mutate(form)} disabled={!form.name || saveMut.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Employees Tab ─── */
function EmployeesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: employees = [], isLoading } = useQuery({ queryKey: ["hr-employees"], queryFn: () => apiGet("/api/hr/employees") });
  const { data: depts = [] } = useQuery({ queryKey: ["hr-depts"], queryFn: () => apiGet("/api/hr/departments") });
  const [showDlg, setShowDlg] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const emptyForm = { employee_number: "", name: "", phone: "", position: "", department_id: "", basic_salary: "", hire_date: "", active: true };
  const [form, setForm] = useState(emptyForm);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["hr-employees"] });

  const saveMut = useMutation({
    mutationFn: (f: typeof form) => {
      const data = { ...f, department_id: f.department_id ? Number(f.department_id) : null, basic_salary: Number(f.basic_salary) };
      return editing ? apiPut(`/api/hr/employees/${editing.id}`, data) : apiPost("/api/hr/employees", data);
    },
    onSuccess: () => { invalidate(); setShowDlg(false); toast({ title: editing ? "تم التعديل" : "تمت الإضافة" }); },
    onError: () => toast({ variant: "destructive", title: "فشل في الحفظ" }),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => apiDel(`/api/hr/employees/${id}`),
    onSuccess: invalidate,
    onError: () => toast({ variant: "destructive", title: "فشل في الحذف" }),
  });

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowDlg(true); };
  const openEdit = (e: any) => { setEditing(e); setForm({ employee_number: e.employee_number, name: e.name, phone: e.phone ?? "", position: e.position ?? "", department_id: e.department_id ? String(e.department_id) : "", basic_salary: String(e.basic_salary), hire_date: e.hire_date ?? "", active: Boolean(e.active) }); setShowDlg(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">الموظفون</h2>
        <Button onClick={openAdd} size="sm" className="gap-2"><Plus className="w-4 h-4" />إضافة موظف</Button>
      </div>
      {isLoading ? <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div> : (
        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-right p-3 font-semibold">رقم الموظف</th>
                <th className="text-right p-3 font-semibold">الاسم</th>
                <th className="text-right p-3 font-semibold">المنصب</th>
                <th className="text-right p-3 font-semibold">القسم</th>
                <th className="text-right p-3 font-semibold">الراتب الأساسي</th>
                <th className="text-right p-3 font-semibold">الحالة</th>
                <th className="p-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(employees as any[]).map((e: any) => (
                <tr key={e.id} className="hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{e.employee_number}</td>
                  <td className="p-3 font-medium">{e.name}</td>
                  <td className="p-3 text-muted-foreground">{e.position ?? "—"}</td>
                  <td className="p-3">{e.department_name ?? "—"}</td>
                  <td className="p-3 text-primary font-mono">{fmt(e.basic_salary)}</td>
                  <td className="p-3"><Badge variant={e.active ? "default" : "secondary"}>{e.active ? "نشط" : "غير نشط"}</Badge></td>
                  <td className="p-3">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => confirm(`حذف الموظف "${e.name}"؟`) && delMut.mutate(e.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(employees as any[]).length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">لا يوجد موظفون</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={showDlg} onOpenChange={setShowDlg}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader><DialogTitle>{editing ? "تعديل موظف" : "إضافة موظف"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium">رقم الموظف *</label><Input value={form.employee_number} onChange={e => setForm(f => ({ ...f, employee_number: e.target.value }))} placeholder="EMP-001" className="mt-1" /></div>
            <div><label className="text-sm font-medium">الاسم *</label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="اسم الموظف" className="mt-1" /></div>
            <div><label className="text-sm font-medium">رقم الهاتف</label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="05xxxxxxxx" className="mt-1" /></div>
            <div><label className="text-sm font-medium">المنصب الوظيفي</label><Input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} placeholder="مثال: محاسب" className="mt-1" /></div>
            <div>
              <label className="text-sm font-medium">القسم</label>
              <Select value={form.department_id} onValueChange={v => setForm(f => ({ ...f, department_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="اختر القسم" /></SelectTrigger>
                <SelectContent>{(depts as any[]).map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium">الراتب الأساسي</label><Input type="number" value={form.basic_salary} onChange={e => setForm(f => ({ ...f, basic_salary: e.target.value }))} placeholder="0" className="mt-1" /></div>
            <div><label className="text-sm font-medium">تاريخ التعيين</label><Input type="date" value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} className="mt-1" /></div>
            <div className="flex items-center gap-3 mt-6">
              <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} id="emp-active" className="w-4 h-4" />
              <label htmlFor="emp-active" className="text-sm font-medium">موظف نشط</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDlg(false)}>إلغاء</Button>
            <Button onClick={() => saveMut.mutate(form)} disabled={!form.employee_number || !form.name || saveMut.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Salaries Tab ─── */
function SalariesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const { data: salaries = [], isLoading } = useQuery({ queryKey: ["hr-salaries", filterMonth], queryFn: () => apiGet(`/api/hr/salaries?month=${filterMonth}`) });
  const { data: employees = [] } = useQuery({ queryKey: ["hr-employees"], queryFn: () => apiGet("/api/hr/employees") });
  const [showDlg, setShowDlg] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const emptyForm = { employee_id: "", month: currentMonth, basic_salary: "", bonuses: "0", deductions: "0", notes: "" };
  const [form, setForm] = useState(emptyForm);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["hr-salaries"] });

  const saveMut = useMutation({
    mutationFn: (f: typeof form) => {
      const data = { ...f, employee_id: Number(f.employee_id), basic_salary: Number(f.basic_salary), bonuses: Number(f.bonuses), deductions: Number(f.deductions) };
      return editing ? apiPut(`/api/hr/salaries/${editing.id}`, { ...data, status: editing.status }) : apiPost("/api/hr/salaries", data);
    },
    onSuccess: () => { invalidate(); setShowDlg(false); toast({ title: "تم الحفظ" }); },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل في الحفظ", description: e.message }),
  });

  const payMut = useMutation({
    mutationFn: (s: any) => apiPut(`/api/hr/salaries/${s.id}`, { ...s, status: "paid", payment_date: new Date().toISOString().slice(0, 10) }),
    onSuccess: () => { invalidate(); toast({ title: "تم صرف الراتب" }); },
    onError: () => toast({ variant: "destructive", title: "فشل في الصرف" }),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => apiDel(`/api/hr/salaries/${id}`),
    onSuccess: invalidate,
    onError: () => toast({ variant: "destructive", title: "فشل في الحذف" }),
  });

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowDlg(true); };
  const openEdit = (s: any) => { setEditing(s); setForm({ employee_id: String(s.employee_id), month: s.month, basic_salary: String(s.basic_salary), bonuses: String(s.bonuses), deductions: String(s.deductions), notes: s.notes ?? "" }); setShowDlg(true); };

  const totalNet = (salaries as any[]).reduce((sum: number, s: any) => sum + s.net_salary, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold">الرواتب</h2>
          <p className="text-sm text-muted-foreground">إجمالي الشهر: <span className="font-bold text-primary">{fmt(totalNet)}</span></p>
        </div>
        <div className="flex gap-2">
          <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-40" />
          <Button onClick={openAdd} size="sm" className="gap-2"><Plus className="w-4 h-4" />إضافة راتب</Button>
        </div>
      </div>
      {isLoading ? <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div> : (
        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-right p-3 font-semibold">الموظف</th>
                <th className="text-right p-3 font-semibold">الشهر</th>
                <th className="text-right p-3 font-semibold">الأساسي</th>
                <th className="text-right p-3 font-semibold">البدلات</th>
                <th className="text-right p-3 font-semibold">الخصومات</th>
                <th className="text-right p-3 font-semibold">الصافي</th>
                <th className="text-right p-3 font-semibold">الحالة</th>
                <th className="p-3 w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(salaries as any[]).map((s: any) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="p-3 font-medium">{s.employee_name}</td>
                  <td className="p-3 text-muted-foreground">{s.month}</td>
                  <td className="p-3 font-mono">{fmt(s.basic_salary)}</td>
                  <td className="p-3 font-mono text-green-600">+{fmt(s.bonuses)}</td>
                  <td className="p-3 font-mono text-red-600">-{fmt(s.deductions)}</td>
                  <td className="p-3 font-mono font-bold text-primary">{fmt(s.net_salary)}</td>
                  <td className="p-3"><Badge variant={s.status === "paid" ? "default" : "secondary"}>{s.status === "paid" ? "مصروف" : "معلق"}</Badge></td>
                  <td className="p-3">
                    <div className="flex gap-1 justify-end flex-wrap">
                      {s.status !== "paid" && <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => payMut.mutate(s)}>صرف</Button>}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => confirm("حذف السجل؟") && delMut.mutate(s.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(salaries as any[]).length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">لا توجد رواتب لهذا الشهر</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={showDlg} onOpenChange={setShowDlg}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>{editing ? "تعديل راتب" : "إضافة راتب"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">الموظف *</label>
              <Select value={form.employee_id} onValueChange={v => { const emp = (employees as any[]).find((e: any) => e.id === Number(v)); setForm(f => ({ ...f, employee_id: v, basic_salary: emp ? String(emp.basic_salary) : f.basic_salary })); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                <SelectContent>{(employees as any[]).filter((e: any) => e.active).map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium">الشهر *</label><Input type="month" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} className="mt-1" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-sm font-medium">الراتب الأساسي</label><Input type="number" value={form.basic_salary} onChange={e => setForm(f => ({ ...f, basic_salary: e.target.value }))} className="mt-1" /></div>
              <div><label className="text-sm font-medium">البدلات</label><Input type="number" value={form.bonuses} onChange={e => setForm(f => ({ ...f, bonuses: e.target.value }))} className="mt-1" /></div>
              <div><label className="text-sm font-medium">الخصومات</label><Input type="number" value={form.deductions} onChange={e => setForm(f => ({ ...f, deductions: e.target.value }))} className="mt-1" /></div>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <span className="text-sm text-muted-foreground">صافي الراتب: </span>
              <span className="font-bold text-lg text-primary">{fmt(Number(form.basic_salary || 0) + Number(form.bonuses || 0) - Number(form.deductions || 0))}</span>
            </div>
            <div><label className="text-sm font-medium">ملاحظات</label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="ملاحظات اختيارية" className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDlg(false)}>إلغاء</Button>
            <Button onClick={() => saveMut.mutate(form)} disabled={!form.employee_id || !form.month || saveMut.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Attendance Tab ─── */
function AttendanceTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [filterDate, setFilterDate] = useState(today);
  const { data: attendance = [], isLoading } = useQuery({ queryKey: ["hr-attendance", filterDate], queryFn: () => apiGet(`/api/hr/attendance?date=${filterDate}`) });
  const { data: employees = [] } = useQuery({ queryKey: ["hr-employees"], queryFn: () => apiGet("/api/hr/employees") });
  const [showDlg, setShowDlg] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const emptyForm = { employee_id: "", date: today, check_in: "", check_out: "", status: "present", notes: "" };
  const [form, setForm] = useState(emptyForm);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["hr-attendance"] });

  const saveMut = useMutation({
    mutationFn: (f: typeof form) => {
      const data = { ...f, employee_id: Number(f.employee_id) };
      return editing ? apiPut(`/api/hr/attendance/${editing.id}`, data) : apiPost("/api/hr/attendance", data);
    },
    onSuccess: () => { invalidate(); setShowDlg(false); toast({ title: "تم التسجيل" }); },
    onError: () => toast({ variant: "destructive", title: "فشل في التسجيل" }),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => apiDel(`/api/hr/attendance/${id}`),
    onSuccess: invalidate,
    onError: () => toast({ variant: "destructive", title: "فشل في الحذف" }),
  });

  const openAdd = () => { setEditing(null); setForm({ ...emptyForm, date: filterDate }); setShowDlg(true); };
  const openEdit = (a: any) => { setEditing(a); setForm({ employee_id: String(a.employee_id), date: a.date, check_in: a.check_in ?? "", check_out: a.check_out ?? "", status: a.status, notes: a.notes ?? "" }); setShowDlg(true); };

  const statusLabel: Record<string, string> = { present: "حاضر", absent: "غائب", late: "متأخر", leave: "إجازة" };
  const statusVariant: Record<string, any> = { present: "default", absent: "destructive", late: "secondary", leave: "outline" };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-lg font-semibold">سجل الحضور والانصراف</h2>
        <div className="flex gap-2">
          <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-40" />
          <Button onClick={openAdd} size="sm" className="gap-2"><Plus className="w-4 h-4" />تسجيل</Button>
        </div>
      </div>
      {isLoading ? <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div> : (
        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-right p-3 font-semibold">الموظف</th>
                <th className="text-right p-3 font-semibold">التاريخ</th>
                <th className="text-right p-3 font-semibold">وقت الحضور</th>
                <th className="text-right p-3 font-semibold">وقت الانصراف</th>
                <th className="text-right p-3 font-semibold">الحالة</th>
                <th className="text-right p-3 font-semibold">ملاحظات</th>
                <th className="p-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(attendance as any[]).map((a: any) => (
                <tr key={a.id} className="hover:bg-muted/30">
                  <td className="p-3 font-medium">{a.employee_name}</td>
                  <td className="p-3 text-muted-foreground">{a.date}</td>
                  <td className="p-3 font-mono">{a.check_in ?? "—"}</td>
                  <td className="p-3 font-mono">{a.check_out ?? "—"}</td>
                  <td className="p-3"><Badge variant={statusVariant[a.status]}>{statusLabel[a.status] ?? a.status}</Badge></td>
                  <td className="p-3 text-muted-foreground text-xs">{a.notes ?? "—"}</td>
                  <td className="p-3">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => confirm("حذف السجل؟") && delMut.mutate(a.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(attendance as any[]).length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">لا توجد سجلات لهذا اليوم</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={showDlg} onOpenChange={setShowDlg}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>{editing ? "تعديل سجل الحضور" : "تسجيل حضور"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">الموظف *</label>
              <Select value={form.employee_id} onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                <SelectContent>{(employees as any[]).filter((e: any) => e.active).map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium">التاريخ *</label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">وقت الحضور</label><Input type="time" value={form.check_in} onChange={e => setForm(f => ({ ...f, check_in: e.target.value }))} className="mt-1" /></div>
              <div><label className="text-sm font-medium">وقت الانصراف</label><Input type="time" value={form.check_out} onChange={e => setForm(f => ({ ...f, check_out: e.target.value }))} className="mt-1" /></div>
            </div>
            <div>
              <label className="text-sm font-medium">الحالة</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">حاضر</SelectItem>
                  <SelectItem value="absent">غائب</SelectItem>
                  <SelectItem value="late">متأخر</SelectItem>
                  <SelectItem value="leave">إجازة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium">ملاحظات</label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="اختيارية" className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDlg(false)}>إلغاء</Button>
            <Button onClick={() => saveMut.mutate(form)} disabled={!form.employee_id || !form.date || saveMut.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Main HR Page ─── */
export default function HR() {
  const { data: summary } = useQuery({ queryKey: ["hr-summary"], queryFn: () => apiGet("/api/hr/summary") });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">نظام الموارد البشرية</h1>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Users className="w-4 h-4" />الموظفون النشطون</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{(summary as any)?.totalEmployees ?? 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Building2 className="w-4 h-4" />الأقسام</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{(summary as any)?.totalDepts ?? 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><DollarSign className="w-4 h-4" />رواتب الشهر</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-primary">{(summary as any)?.currentMonthSalaries?.toLocaleString("ar-SA", { maximumFractionDigits: 0 }) ?? 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><CalendarCheck className="w-4 h-4" />الحضور اليوم</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-600">{(summary as any)?.todayPresent ?? 0}</div></CardContent>
          </Card>
        </div>

        <Tabs defaultValue="employees" dir="rtl">
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="employees">الموظفون</TabsTrigger>
            <TabsTrigger value="departments">الأقسام</TabsTrigger>
            <TabsTrigger value="salaries">الرواتب</TabsTrigger>
            <TabsTrigger value="attendance">الحضور</TabsTrigger>
          </TabsList>
          <TabsContent value="employees" className="mt-4"><EmployeesTab /></TabsContent>
          <TabsContent value="departments" className="mt-4"><DepartmentsTab /></TabsContent>
          <TabsContent value="salaries" className="mt-4"><SalariesTab /></TabsContent>
          <TabsContent value="attendance" className="mt-4"><AttendanceTab /></TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
