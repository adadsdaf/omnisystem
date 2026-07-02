import { useEffect, useState, useRef } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useGetSettings, useUpdateSettings, getGetSettingsQueryKey,
  useGetReceiptCopyConfigs, useUpdateReceiptCopyConfig, useCreateReceiptCopyConfig, useDeleteReceiptCopyConfig, getGetReceiptCopyConfigsQueryKey,
  useGetDepartmentPrintConfigs, useUpdateDepartmentPrintConfig, useCreateDepartmentPrintConfig, useDeleteDepartmentPrintConfig, getGetDepartmentPrintConfigsQueryKey,
  useGetCategories, useGetPrintersList,
  useGetPrinterSettings, useUpdatePrinterSettings, getGetPrinterSettingsQueryKey,
} from "@workspace/api-client-react";
import type { SettingsInput, ReceiptCopyConfig, DepartmentPrintConfig, PrinterSettingsInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Trash2, Pencil, Printer, Copy, Building2, Settings2, Upload, X } from "lucide-react";

// ─────────────────────────────────────────────
// Main Settings Component
// ─────────────────────────────────────────────
export default function Settings() {
  const { data: settings, isLoading } = useGetSettings();
  const updateMutation = useUpdateSettings();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState<SettingsInput>({
    businessName: "",
    address: null,
    phone: null,
    taxNumber: null,
    taxRate: 15,
    currency: "ريال",
    receiptMessage: null,
    printLogo: true,
    printQr: false,
    showCashier: true,
    showCustomer: true,
    receiptPaperSize: "80mm",
    showOrderNumber: true,
    showTableNumber: true,
    showDateTime: true,
    showBarcode: false,
    showOrderType: true,
    showTax: true,
    showDiscount: true,
    showNotes: true,
    autoPrintTrigger: "print_button",
    maxReprintCount: 3,
    masterCopiesCount: 2,
    logoUrl: null,
  });
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) setForm({ ...form, ...settings });
  }, [settings]);

  const handleSave = () => {
    updateMutation.mutate({ data: form }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "تم حفظ الإعدادات بنجاح" });
      },
      onError: () => toast({ variant: "destructive", title: "فشل في الحفظ" })
    });
  };

  const setField = (field: keyof SettingsInput, value: any) =>
    setForm(f => ({ ...f, [field]: value }));

  if (isLoading) return (
    <AdminLayout>
      <div className="text-center py-16 text-muted-foreground">جاري التحميل...</div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="space-y-4 max-w-4xl">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">إعدادات النظام</h1>
          <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
            <Save className="w-4 h-4" />
            حفظ الإعدادات
          </Button>
        </div>

        <Tabs defaultValue="business">
          <TabsList className="w-full grid grid-cols-5 h-auto">
            <TabsTrigger value="business" className="gap-1 py-2 text-xs sm:text-sm">
              <Settings2 className="w-4 h-4" />
              النشاط التجاري
            </TabsTrigger>
            <TabsTrigger value="receipt-format" className="gap-1 py-2 text-xs sm:text-sm">
              <Printer className="w-4 h-4" />
              شكل الفاتورة
            </TabsTrigger>
            <TabsTrigger value="master-copies" className="gap-1 py-2 text-xs sm:text-sm">
              <Copy className="w-4 h-4" />
              نسخ الفاتورة
            </TabsTrigger>
            <TabsTrigger value="departments" className="gap-1 py-2 text-xs sm:text-sm">
              <Building2 className="w-4 h-4" />
              الأقسام
            </TabsTrigger>
            <TabsTrigger value="printer-layout" className="gap-1 py-2 text-xs sm:text-sm">
              <Printer className="w-4 h-4" />
              ضبط الطابعة
            </TabsTrigger>
          </TabsList>

          {/* ─── Business Tab ─── */}
          <TabsContent value="business" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>معلومات النشاط التجاري</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {([
                  ["businessName", "اسم النشاط *"],
                  ["address", "العنوان"],
                  ["phone", "رقم الهاتف"],
                  ["taxNumber", "الرقم الضريبي"],
                  ["currency", "العملة"],
                ] as [keyof SettingsInput, string][]).map(([field, label]) => (
                  <div key={field} className="space-y-1">
                    <label className="text-sm font-medium">{label}</label>
                    <Input
                      value={(form[field] as string) ?? ""}
                      onChange={e => setField(field, e.target.value || null)}
                    />
                  </div>
                ))}
                <div className="space-y-1">
                  <label className="text-sm font-medium">نسبة الضريبة (%)</label>
                  <Input
                    type="number"
                    value={form.taxRate ?? 15}
                    onChange={e => setField("taxRate", Number(e.target.value))}
                    className="w-32"
                    min={0}
                    max={100}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>شعار المطعم</CardTitle>
                <CardDescription>يظهر في الفاتورة الرئيسية عند تفعيل "إظهار شعار المطعم"</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      toast({ variant: "destructive", title: "حجم الصورة كبير جداً", description: "الحد الأقصى 5MB" });
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = ev => {
                      const img = new Image();
                      img.onload = () => {
                        const canvas = document.createElement("canvas");
                        const MAX = 400;
                        let w = img.width, h = img.height;
                        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
                        if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
                        canvas.width = w; canvas.height = h;
                        const ctx = canvas.getContext("2d")!;
                        ctx.fillStyle = "#fff";
                        ctx.fillRect(0, 0, w, h);
                        ctx.drawImage(img, 0, 0, w, h);
                        const compressed = canvas.toDataURL("image/jpeg", 0.75);
                        setField("logoUrl", compressed);
                        toast({ title: "تم رفع الشعار", description: `${Math.round(compressed.length / 1024)}KB` });
                      };
                      img.src = ev.target?.result as string;
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                {form.logoUrl ? (
                  <div className="flex items-center gap-4">
                    <div className="border rounded-lg p-2 bg-white flex items-center justify-center w-32 h-20">
                      <img src={form.logoUrl as string} alt="الشعار" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} className="gap-2">
                        <Upload className="w-3.5 h-3.5" />
                        تغيير الشعار
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setField("logoUrl", null)} className="gap-2 text-red-600 hover:text-red-700">
                        <X className="w-3.5 h-3.5" />
                        حذف الشعار
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">انقر لرفع شعار المطعم</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG، JPG — الحد الأقصى 500KB</p>
                  </button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>معلومات الدخول الافتراضية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 font-mono">
                  <p>مدير النظام: <span className="font-bold text-foreground">admin</span> / كلمة المرور: <span className="font-bold text-foreground">admin123</span></p>
                  <p>الكاشير: <span className="font-bold text-foreground">cashier</span> / كلمة المرور: <span className="font-bold text-foreground">cashier123</span></p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Receipt Format Tab ─── */}
          <TabsContent value="receipt-format" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>شكل الفاتورة الرئيسية</CardTitle>
                <CardDescription>تحكم في البيانات التي تظهر على الفاتورة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">رسالة الشكر في نهاية الفاتورة</label>
                  <Input
                    value={form.receiptMessage ?? ""}
                    onChange={e => setField("receiptMessage", e.target.value || null)}
                    placeholder="شكراً لزيارتكم..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">حجم الورق</label>
                  <Select
                    value={form.receiptPaperSize as string ?? "80mm"}
                    onValueChange={v => setField("receiptPaperSize", v)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="58mm">58mm</SelectItem>
                      <SelectItem value="80mm">80mm</SelectItem>
                      <SelectItem value="A4">A4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-2 pt-2">
                  {([
                    ["printLogo", "إظهار شعار المطعم"],
                    ["printQr", "إظهار QR Code"],
                    ["showCashier", "إظهار اسم الكاشير"],
                    ["showCustomer", "إظهار اسم العميل"],
                    ["showOrderNumber", "إظهار رقم الطلب"],
                    ["showTableNumber", "إظهار رقم الطاولة"],
                    ["showDateTime", "إظهار التاريخ والوقت"],
                    ["showBarcode", "إظهار الباركود"],
                    ["showOrderType", "إظهار نوع الطلب (محلي/سفري/توصيل)"],
                    ["showTax", "إظهار الضريبة"],
                    ["showDiscount", "إظهار الخصم"],
                    ["showNotes", "إظهار الملاحظات"],
                  ] as [keyof SettingsInput, string][]).map(([field, label]) => (
                    <div key={field} className="flex items-center justify-between py-1.5 border-b border-border/50">
                      <label className="text-sm">{label}</label>
                      <Switch
                        checked={Boolean(form[field])}
                        onCheckedChange={v => setField(field, v)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>إعدادات الطباعة التلقائية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">وقت تنفيذ الطباعة التلقائية</label>
                  <Select
                    value={form.autoPrintTrigger as string ?? "print_button"}
                    onValueChange={v => setField("autoPrintTrigger", v)}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="print_button">عند الضغط على زر الطباعة</SelectItem>
                      <SelectItem value="save">عند حفظ الطلب</SelectItem>
                      <SelectItem value="after_payment">بعد الدفع مباشرة</SelectItem>
                      <SelectItem value="manual">يدوي فقط</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">الحد الأقصى لإعادة الطباعة</label>
                  <Input
                    type="number"
                    value={form.maxReprintCount ?? 3}
                    onChange={e => setField("maxReprintCount", Number(e.target.value))}
                    className="w-32"
                    min={0}
                    max={20}
                  />
                  <p className="text-xs text-muted-foreground">0 = بدون حد</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Master Copies Tab ─── */}
          <TabsContent value="master-copies" className="mt-4">
            <MasterCopiesTab
              masterCopiesCount={form.masterCopiesCount as number ?? 2}
              onCopiesCountChange={v => setField("masterCopiesCount", v)}
              onSave={handleSave}
              isSaving={updateMutation.isPending}
            />
          </TabsContent>

          {/* ─── Departments Tab ─── */}
          <TabsContent value="departments" className="mt-4">
            <DepartmentsTab />
          </TabsContent>

          {/* ─── Printer Layout Tab ─── */}
          <TabsContent value="printer-layout" className="mt-4">
            <PrinterLayoutTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

// ─────────────────────────────────────────────
// Master Copies Tab
// ─────────────────────────────────────────────
function MasterCopiesTab({
  masterCopiesCount,
  onCopiesCountChange,
  onSave,
  isSaving,
}: {
  masterCopiesCount: number;
  onCopiesCountChange: (v: number) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const { data: copies = [], isLoading } = useGetReceiptCopyConfigs();
  const updateCopy = useUpdateReceiptCopyConfig();
  const createCopy = useCreateReceiptCopyConfig();
  const deleteCopy = useDeleteReceiptCopyConfig();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [editItem, setEditItem] = useState<ReceiptCopyConfig | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newEnabled, setNewEnabled] = useState(true);

  const handleToggle = (item: ReceiptCopyConfig) => {
    updateCopy.mutate({ id: item.id, data: { copyNumber: item.copyNumber, label: item.label, enabled: !item.enabled } }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetReceiptCopyConfigsQueryKey() }),
    });
  };

  const handleEditSave = () => {
    if (!editItem) return;
    updateCopy.mutate({ id: editItem.id, data: { copyNumber: editItem.copyNumber, label: editLabel, enabled: editItem.enabled } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetReceiptCopyConfigsQueryKey() });
        setEditItem(null);
        toast({ title: "تم التعديل" });
      },
    });
  };

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    const nextNum = copies.length > 0 ? Math.max(...copies.map(c => c.copyNumber)) + 1 : 1;
    createCopy.mutate({ data: { copyNumber: nextNum, label: newLabel.trim(), enabled: newEnabled } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetReceiptCopyConfigsQueryKey() });
        setShowAdd(false);
        setNewLabel("");
        setNewEnabled(true);
        toast({ title: "تمت الإضافة" });
      },
    });
  };

  const handleDelete = (id: number) => {
    deleteCopy.mutate({ id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetReceiptCopyConfigsQueryKey() });
        toast({ title: "تم الحذف" });
      },
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>عدد نسخ الفاتورة الرئيسية</CardTitle>
          <CardDescription>تحديد عدد النسخ الإجمالي للفاتورة الرئيسية التي تُطبع عند كل طلب</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">عدد النسخ</label>
              <Input
                type="number"
                value={masterCopiesCount}
                onChange={e => onCopiesCountChange(Number(e.target.value))}
                className="w-24 text-center text-lg font-bold"
                min={1}
                max={10}
              />
            </div>
            <Button onClick={onSave} disabled={isSaving} variant="outline" className="mt-6 gap-2">
              <Save className="w-4 h-4" />
              حفظ
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>تخصيص كل نسخة</CardTitle>
            <CardDescription>تحديد الغرض من كل نسخة (عميل، كاشير، محاسبة، أرشيف...)</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            إضافة نسخة
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : (
            <div className="space-y-2">
              {copies.map(copy => (
                <div key={copy.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {copy.copyNumber}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{copy.label}</p>
                    <p className="text-xs text-muted-foreground">نسخة رقم {copy.copyNumber}</p>
                  </div>
                  <Badge variant={copy.enabled ? "default" : "secondary"}>
                    {copy.enabled ? "مفعّل" : "معطّل"}
                  </Badge>
                  <Switch checked={copy.enabled} onCheckedChange={() => handleToggle(copy)} />
                  <Button variant="ghost" size="sm" onClick={() => { setEditItem(copy); setEditLabel(copy.label); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(copy.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {copies.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">لا توجد نسخ مضافة</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={o => !o && setEditItem(null)}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader><DialogTitle>تعديل النسخة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">اسم النسخة / الغرض</label>
              <Input value={editLabel} onChange={e => setEditLabel(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>إلغاء</Button>
            <Button onClick={handleEditSave} disabled={updateCopy.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader><DialogTitle>إضافة نسخة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">اسم النسخة / الغرض</label>
              <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="مثال: نسخة المحاسبة" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">مفعّل</label>
              <Switch checked={newEnabled} onCheckedChange={setNewEnabled} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>إلغاء</Button>
            <Button onClick={handleAdd} disabled={createCopy.isPending || !newLabel.trim()}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// Departments Tab
// ─────────────────────────────────────────────
function DepartmentsTab() {
  const { data: depts = [], isLoading } = useGetDepartmentPrintConfigs();
  const { data: categories = [] } = useGetCategories();
  const { data: systemPrinters = [] } = useGetPrintersList();
  const updateDept = useUpdateDepartmentPrintConfig();
  const createDept = useCreateDepartmentPrintConfig();
  const deleteDept = useDeleteDepartmentPrintConfig();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [editItem, setEditItem] = useState<DepartmentPrintConfig | null>(null);
  const [editForm, setEditForm] = useState({ categoryId: "", printerName: "", copies: 1, enabled: true, printOrder: 0 });
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ categoryId: "", printerName: "", copies: 1, enabled: true, printOrder: 0 });

  const openEdit = (item: DepartmentPrintConfig) => {
    setEditItem(item);
    setEditForm({
      categoryId: item.categoryId ? String(item.categoryId) : "",
      printerName: item.printerName ?? "",
      copies: item.copies,
      enabled: item.enabled,
      printOrder: item.printOrder,
    });
  };

  const handleEditSave = () => {
    if (!editItem) return;
    updateDept.mutate({
      id: editItem.id,
      data: {
        categoryId: editForm.categoryId ? Number(editForm.categoryId) : null,
        printerName: editForm.printerName || null,
        copies: editForm.copies,
        enabled: editForm.enabled,
        printOrder: editForm.printOrder,
      }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetDepartmentPrintConfigsQueryKey() });
        setEditItem(null);
        toast({ title: "تم التعديل" });
      },
    });
  };

  const handleAdd = () => {
    createDept.mutate({
      data: {
        categoryId: addForm.categoryId ? Number(addForm.categoryId) : null,
        printerName: addForm.printerName || null,
        copies: addForm.copies,
        enabled: addForm.enabled,
        printOrder: addForm.printOrder,
      }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetDepartmentPrintConfigsQueryKey() });
        setShowAdd(false);
        setAddForm({ categoryId: "", printerName: "", copies: 1, enabled: true, printOrder: 0 });
        toast({ title: "تمت الإضافة" });
      },
    });
  };

  const handleToggle = (item: DepartmentPrintConfig) => {
    updateDept.mutate({
      id: item.id,
      data: {
        categoryId: item.categoryId ?? null,
        printerName: item.printerName ?? null,
        copies: item.copies,
        enabled: !item.enabled,
        printOrder: item.printOrder,
      }
    }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetDepartmentPrintConfigsQueryKey() }),
    });
  };

  const handleDelete = (id: number) => {
    deleteDept.mutate({ id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetDepartmentPrintConfigsQueryKey() });
        toast({ title: "تم الحذف" });
      },
    });
  };

  const DeptForm = ({ form, onChange }: { form: typeof addForm, onChange: (f: typeof addForm) => void }) => (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm font-medium">القسم (التصنيف)</label>
        <Select value={form.categoryId} onValueChange={v => onChange({ ...form, categoryId: v })}>
          <SelectTrigger>
            <SelectValue placeholder="اختر قسماً" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">الطابعة</label>
        {systemPrinters.length > 0 ? (
          <Select value={form.printerName || "__none__"} onValueChange={v => onChange({ ...form, printerName: v === "__none__" ? "" : v })}>
            <SelectTrigger dir="ltr">
              <SelectValue placeholder="اختر طابعة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">بدون طابعة</SelectItem>
              {systemPrinters.map((p: string) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="space-y-1">
            <Input value={form.printerName} onChange={e => onChange({ ...form, printerName: e.target.value })} placeholder="اسم الطابعة أو عنوان IP (مثال: 192.168.1.100)" dir="ltr" />
            <p className="text-xs text-muted-foreground">لم يتم اكتشاف طابعات. أدخل اسم الطابعة يدوياً أو عنوان IP الشبكي</p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">عدد النسخ</label>
          <Input type="number" value={form.copies} onChange={e => onChange({ ...form, copies: Number(e.target.value) })} min={1} max={10} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">ترتيب الطباعة</label>
          <Input type="number" value={form.printOrder} onChange={e => onChange({ ...form, printOrder: Number(e.target.value) })} min={0} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">تفعيل الطباعة</label>
        <Switch checked={form.enabled} onCheckedChange={v => onChange({ ...form, enabled: v })} />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>فواتير الأقسام</CardTitle>
            <CardDescription>
              بعد طباعة الفاتورة الرئيسية، يُرسل النظام تلقائياً فاتورة مستقلة لكل قسم تحتوي فقط على الأصناف الخاصة به
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            إضافة قسم
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : (
            <div className="space-y-2">
              {depts.map(dept => (
                <div key={dept.id} className={`flex items-center gap-3 p-3 rounded-lg border bg-card transition-opacity ${!dept.enabled ? "opacity-50" : ""}`}>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {dept.printOrder}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{dept.categoryName ?? "قسم غير محدد"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {dept.printerName ? `🖨️ ${dept.printerName}` : "بدون طابعة محددة"}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{dept.copies} نسخة</span>
                    </div>
                  </div>
                  <Badge variant={dept.enabled ? "default" : "secondary"}>
                    {dept.enabled ? "مفعّل" : "معطّل"}
                  </Badge>
                  <Switch checked={dept.enabled} onCheckedChange={() => handleToggle(dept)} />
                  <Button variant="ghost" size="sm" onClick={() => openEdit(dept)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(dept.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {depts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  لا توجد أقسام مضافة. أضف قسماً لتفعيل طباعة فواتير الأقسام.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={o => !o && setEditItem(null)}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader><DialogTitle>تعديل إعدادات القسم</DialogTitle></DialogHeader>
          <DeptForm form={editForm} onChange={setEditForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>إلغاء</Button>
            <Button onClick={handleEditSave} disabled={updateDept.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader><DialogTitle>إضافة قسم جديد</DialogTitle></DialogHeader>
          <DeptForm form={addForm} onChange={setAddForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>إلغاء</Button>
            <Button onClick={handleAdd} disabled={createDept.isPending}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// Printer Layout Settings Tab
// ─────────────────────────────────────────────
function PrinterLayoutTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: saved } = useGetPrinterSettings();
  const updateMutation = useUpdatePrinterSettings();

  const defaults: PrinterSettingsInput & { mainPrinterName?: string | null } = {
    paperWidth: 80, leftMargin: 4, rightMargin: 4,
    topMargin: 2, bottomMargin: 2, fontSize: 10,
    lineSpacing: 2, charactersPerLine: 48, mainPrinterName: null,
  };

  const [form, setForm] = useState<PrinterSettingsInput & { mainPrinterName?: string | null }>(defaults);

  useEffect(() => {
    if (saved) setForm({ ...defaults, ...(saved as any) });
  }, [saved]);

  const set = (k: string, v: number | string | null) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    updateMutation.mutate({ data: form }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetPrinterSettingsQueryKey() });
        toast({ title: "تم حفظ إعدادات الطابعة" });
      },
      onError: () => toast({ variant: "destructive", title: "فشل الحفظ" }),
    });
  };

  const handleTestPrint = () => {
    const lm = form.leftMargin ?? 4;
    const rm = form.rightMargin ?? 4;
    const pw = form.paperWidth ?? 80;
    const fs = form.fontSize ?? 10;
    const tm = form.topMargin ?? 2;
    const bm = form.bottomMargin ?? 2;
    const style = document.createElement("style");
    style.id = "__test-print-style__";
    style.textContent = `
      @page { size: ${pw}mm auto; margin: 0; }
      .receipt-slip {
        font-size: ${fs}px !important;
        padding: ${tm}mm ${rm}mm ${bm}mm ${lm}mm !important;
      }
    `;
    document.head.appendChild(style);
    window.print();
    document.getElementById("__test-print-style__")?.remove();
  };

  const numField = (label: string, key: keyof PrinterSettingsInput, unit = "mm", min = 0, max = 99, step = 0.5) => (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={form[key] as number ?? 0}
          onChange={e => set(key, Number(e.target.value))}
          className="w-24 text-center"
          min={min} max={max} step={step}
        />
        <span className="text-xs text-muted-foreground w-8">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>نوع الورق</CardTitle>
          <CardDescription>عرض ورق الطابعة الحرارية</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-6">
          {[80, 58].map(w => (
            <label key={w} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="paperWidth"
                value={w}
                checked={(form.paperWidth ?? 80) === w}
                onChange={() => set("paperWidth", w)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm font-medium">{w}mm</span>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الهوامش</CardTitle>
          <CardDescription>
            عرض المحتوى = {form.paperWidth ?? 80}mm − {form.leftMargin ?? 4}mm − {form.rightMargin ?? 4}mm ={" "}
            <strong>{(form.paperWidth ?? 80) - (form.leftMargin ?? 4) - (form.rightMargin ?? 4)}mm</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 px-6">
          {numField("الهامش الأيسر", "leftMargin", "mm", 0, 20)}
          {numField("الهامش الأيمن", "rightMargin", "mm", 0, 20)}
          {numField("الهامش العلوي", "topMargin", "mm", 0, 20)}
          {numField("الهامش السفلي", "bottomMargin", "mm", 0, 20)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>الخط والسطر</CardTitle></CardHeader>
        <CardContent className="p-0 px-6">
          {numField("حجم الخط", "fontSize", "px", 6, 20, 1)}
          {numField("مسافة السطر", "lineSpacing", "px", 1, 10, 0.5)}
          {numField("عدد الأحرف بالسطر", "charactersPerLine", "حرف", 20, 80, 1)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>طابعة الفاتورة الرئيسية</CardTitle>
          <CardDescription>
            عند ضبط هذه الطابعة، ستُطبع الفاتورة الرئيسية <strong>بصمت تلقائياً</strong> دون أي نافذة حوار — وذلك عند اختيار "بعد الدفع مباشرة" في إعدادات الطباعة التلقائية.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">اسم الطابعة أو عنوان IP</label>
            <Input
              value={(form as any).mainPrinterName ?? ""}
              onChange={e => set("mainPrinterName", e.target.value || null)}
              placeholder="مثال: 192.168.1.100 أو اسم الطابعة"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">
              اتركه فارغاً لاستخدام نافذة الطباعة العادية للفاتورة الرئيسية.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 flex-wrap">
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
          <Save className="w-4 h-4" />
          حفظ الإعدادات
        </Button>
        <Button variant="outline" onClick={handleTestPrint} className="gap-2">
          <Printer className="w-4 h-4" />
          طباعة تجريبية
        </Button>
      </div>
    </div>
  );
}
