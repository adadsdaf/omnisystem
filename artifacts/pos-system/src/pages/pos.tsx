import { useState, useRef, useCallback } from "react";
import { flushSync } from "react-dom";
import { PosLayout } from "@/components/pos-layout";
import {
  useGetProducts, useGetCategories, useCreateOrder, useGetSettings,
  useGetReceiptCopyConfigs, useGetDepartmentPrintConfigs, useCreatePrintLog,
  usePrintReceiptDirect, useGetPrinterSettings,
} from "@workspace/api-client-react";
import type { Product, OrderItemInput, Order } from "@workspace/api-client-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Minus, Printer, ShoppingCart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReceiptPreview, MasterReceiptSlip, DeptReceiptSlip } from "@/components/receipt";

type CartItem = {
  product: Product;
  quantity: number;
};

type OrderType = "dine-in" | "takeout" | "delivery";

type PrintPage =
  | { type: "master"; copyLabel: string }
  | { type: "dept"; dept: any; items: any[] };

type PrintJob =
  | { kind: "browser-master"; copyLabel: string; logData: any }
  | { kind: "browser-dept";   dept: any; items: any[]; logData: any }
  | { kind: "direct-dept";    dept: any; items: any[]; logData: any };

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  "dine-in": "محلي",
  "takeout": "سفري",
  "delivery": "توصيل",
};

function generateReceiptText(order: Order, settings: any, cashierName: string): string {
  const lines: string[] = [];
  const w = 40;
  const center = (s: string) => s.padStart(Math.floor((w + s.length) / 2)).padEnd(w);
  const line = (ch = "-") => ch.repeat(w);

  lines.push(center(settings?.businessName ?? "المطعم"));
  if (settings?.address) lines.push(center(settings.address));
  lines.push(line("."));
  lines.push(center("فاتورة خاصة بالزبون"));
  lines.push(center(order.invoiceNumber));
  lines.push(line("."));
  const d = new Date(order.createdAt);
  const dateStr = `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  const timeStr = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  lines.push(`${dateStr}  ${timeStr}`);
  if (order.tableNumber) lines.push(`الطاولة: ${order.tableNumber}`);
  lines.push(line("-"));
  lines.push(`${"الصنف".padEnd(20)}${"الكمية".padStart(5)}${"السعر".padStart(10)}`);
  lines.push(line("-"));
  for (const item of order.items ?? []) {
    const name = item.productName.substring(0, 18).padEnd(20);
    const qty = String(item.quantity).padStart(5);
    const price = String(item.unitPrice.toLocaleString()).padStart(10);
    lines.push(`${name}${qty}${price}`);
  }
  lines.push(line("="));
  lines.push(`الإجمالي: ${order.total.toFixed(2)} ${settings?.currency ?? "ريال"}`.padStart(w));
  lines.push("");
  if (cashierName) lines.push(center(`اسم الكاشير: ${cashierName}`));
  if (order.note) lines.push(`ملاحظات: ${order.note}`);
  lines.push("");
  lines.push(center("الطلب لا يمكن استرجاعه أو إلغاؤه"));
  if (settings?.phone) lines.push(center(`أرقام التواصل: ${settings.phone}`));
  lines.push("\n\n\n");
  return lines.join("\n");
}

function generateDeptReceiptText(order: Order, dept: any, items: any[], settings: any): string {
  const lines: string[] = [];
  const w = 32;
  const center = (s: string) => s.padStart(Math.floor((w + s.length) / 2)).padEnd(w);
  const line = (ch = "-") => ch.repeat(w);

  lines.push(center(settings?.businessName ?? "المطعم"));
  lines.push(center(`قسم: ${dept.categoryName}`));
  lines.push(line("."));
  lines.push(center("فاتورة قسم"));
  lines.push(center(order.invoiceNumber));
  lines.push(line("-"));
  const d = new Date(order.createdAt);
  const dateStr = `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  lines.push(`${dateStr}`);
  if (order.tableNumber) lines.push(`الطاولة: ${order.tableNumber}`);
  lines.push(line("="));
  for (const item of items) {
    lines.push(`${item.productName.substring(0, 20).padEnd(22)}  x${item.quantity}`);
  }
  lines.push(line("="));
  if (order.note) lines.push(`ملاحظات: ${order.note}`);
  lines.push("\n\n\n");
  return lines.join("\n");
}

export default function Pos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: products = [] } = useGetProducts();
  const { data: categories = [] } = useGetCategories();
  const { data: settings } = useGetSettings();
  const { data: printerSettings } = useGetPrinterSettings();
  const { data: receiptCopies = [] } = useGetReceiptCopyConfigs();
  const { data: deptConfigs = [] } = useGetDepartmentPrintConfigs();
  const createOrderMutation = useCreateOrder();
  const createPrintLog = useCreatePrintLog();
  const printReceiptDirect = usePrintReceiptDirect();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [numberInput, setNumberInput] = useState("");
  const [discount, setDiscount] = useState(0);
  const [orderType, setOrderType] = useState<OrderType>("dine-in");
  const [tableNumber, setTableNumber] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "mixed">("cash");
  const [cashGiven, setCashGiven] = useState("");
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [reprintReason, setReprintReason] = useState("");
  const [showReprintDialog, setShowReprintDialog] = useState(false);
  const [activePrintPage, setActivePrintPage] = useState<PrintPage | null>(null);
  const numberInputRef = useRef<HTMLInputElement>(null);

  const taxRate = settings?.taxRate ?? 15;
  const currency = settings?.currency ?? "ريال";
  const autoPrintTrigger = settings?.autoPrintTrigger ?? "print_button";

  const filteredProducts = products.filter(p => {
    if (!p.active) return false;
    if (selectedCategory !== null && p.categoryId !== selectedCategory) return false;
    return true;
  });

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const changeQty = (productId: number, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.product.id !== productId) return i;
      const newQty = i.quantity + delta;
      return newQty <= 0 ? null : { ...i, quantity: newQty };
    }).filter(Boolean) as CartItem[]);
  };

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const discountAmt = Math.min(discount, subtotal);
  const afterDiscount = subtotal - discountAmt;
  const taxAmt = afterDiscount * (taxRate / 100);
  const total = afterDiscount + taxAmt;

  const handleNumberInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const num = parseInt(numberInput);
      const prod = products.find(p => p.number === num && p.active);
      if (prod) {
        addToCart(prod);
        setNumberInput("");
      } else {
        toast({ variant: "destructive", title: "لم يتم العثور على المنتج رقم " + num });
      }
    }
  };

  const handlePay = () => {
    if (cart.length === 0) return;
    setShowPayDialog(true);
  };

  const getDeptGroups = (order: Order) => {
    // تجميع عناصر الطلب حسب التصنيف بشكل إلزامي
    const categoryMap = new Map<number | string, {
      categoryId: number | null;
      categoryName: string | null;
      items: NonNullable<Order["items"]>;
      printOrder: number;
    }>();

    for (const item of order.items ?? []) {
      const key = item.categoryId ?? "__no_category__";
      if (!categoryMap.has(key)) {
        // ابحث عن إعداد قسم مطابق لهذا التصنيف (إن وُجد)
        const config = deptConfigs.find(d => d.categoryId === item.categoryId);
        categoryMap.set(key, {
          categoryId: item.categoryId ?? null,
          categoryName: item.categoryName ?? null,
          items: [],
          printOrder: config?.printOrder ?? 999,
        });
      }
      categoryMap.get(key)!.items.push(item);
    }

    // لكل تصنيف في الطلب، أنشئ مجموعة مع إعدادات القسم أو القيم الافتراضية
    return Array.from(categoryMap.values())
      .filter(g => g.items.length > 0)
      .sort((a, b) => a.printOrder - b.printOrder)
      .map(g => {
        const config = deptConfigs.find(d => d.categoryId === g.categoryId);
        return {
          dept: {
            id: config?.id ?? (g.categoryId ?? 0),
            categoryId: g.categoryId,
            categoryName: g.categoryName ?? "قسم",
            printerName: config?.printerName ?? null,
            copies: config?.copies ?? 1,
            enabled: true,
            printOrder: g.printOrder,
          },
          items: g.items,
        };
      });
  };

  const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  // ── طباعة صفحة واحدة عبر المتصفح (مع تطبيق إعدادات الطابعة) ────────
  const browserPrint = async (page: PrintPage) => {
    // تطبيق إعدادات الطابعة ديناميكياً قبل الطباعة
    const ps = printerSettings;
    const styleId = "__pos-dynamic-print__";
    document.getElementById(styleId)?.remove();
    if (ps) {
      const el = document.createElement("style");
      el.id = styleId;
      el.textContent = `
        @page { size: ${ps.paperWidth}mm auto; margin: 0; }
        .receipt-slip {
          font-size: ${ps.fontSize}px !important;
          line-height: ${1 + (ps.lineSpacing ?? 2) / 10} !important;
          padding: ${ps.topMargin}mm ${ps.rightMargin}mm ${ps.bottomMargin}mm ${ps.leftMargin}mm !important;
        }
      `;
      document.head.appendChild(el);
    }

    flushSync(() => setActivePrintPage(page));
    await new Promise<void>(r => requestAnimationFrame(() => setTimeout(r, 80)));
    window.print();
    setActivePrintPage(null);
    document.getElementById(styleId)?.remove();
  };

  // ── إرسال فاتورة قسم مباشرة للطابعة الشبكية ───────────────────────
  const directPrint = (order: Order, dept: any, items: any[], printerOverride?: string) =>
    new Promise<void>(resolve => {
      const content = generateDeptReceiptText(order, dept, items, settings);
      const printerName = printerOverride ?? dept.printerName;
      printReceiptDirect.mutate(
        { data: { printerName, content, copies: 1 } },
        {
          onSuccess: (res) => {
            if (!res.ok)
              toast({ variant: "destructive", title: `فشل طباعة قسم ${dept.categoryName}: ${res.message ?? ""}` });
            resolve();
          },
          onError: () => resolve(),
        }
      );
    });

  // ── طباعة صامتة كاملة للطابعة الشبكية (بدون نافذة حوار) ───────────
  const silentPrintAll = async (order: Order) => {
    const mainPrinter = (printerSettings as any)?.mainPrinterName as string | null | undefined;
    const copiesCount = settings?.masterCopiesCount ?? 1;
    const enabledCopies = receiptCopies.filter(c => c.enabled);
    const deptGroups = getDeptGroups(order);

    // 1) الفاتورة الرئيسية → إرسال لطابعة الفاتورة الرئيسية
    if (mainPrinter) {
      const masterText = generateReceiptText(order, settings, user?.name ?? "");
      for (let i = 0; i < copiesCount; i++) {
        const copyLabel = enabledCopies[i]?.label ?? `نسخة ${i + 1}`;
        await new Promise<void>(resolve => {
          printReceiptDirect.mutate(
            { data: { printerName: mainPrinter, content: masterText, copies: 1 } },
            {
              onSuccess: () => resolve(),
              onError: () => resolve(),
            }
          );
        });
        createPrintLog.mutate({ data: {
          orderId: order.id, invoiceNumber: order.invoiceNumber,
          receiptType: "master", departmentName: copyLabel,
          printerName: mainPrinter, copies: 1, status: "success", reprintCount: 0,
        }});
        if (i < copiesCount - 1) await sleep(200);
      }
    }

    // 2) فواتير الأقسام → كل قسم لطابعته
    for (const { dept, items } of deptGroups) {
      if (!items.length) continue;
      for (let c = 0; c < dept.copies; c++) {
        await directPrint(order, dept, items);
        createPrintLog.mutate({ data: {
          orderId: order.id, invoiceNumber: order.invoiceNumber,
          receiptType: "department", departmentName: dept.categoryName ?? "قسم",
          printerName: dept.printerName ?? null, copies: 1, status: "success", reprintCount: 0,
        }});
        if (c < dept.copies - 1) await sleep(200);
      }
    }
  };

  // ── دالة الطباعة الرئيسية (Queue تسلسلي) ──────────────────────────
  const triggerDirectPrint = async (order: Order, isReprint = false, reprintReasonText?: string) => {
    const enabledCopies = receiptCopies.filter(c => c.enabled);
    const copiesCount = settings?.masterCopiesCount ?? 2;
    const deptGroups = getDeptGroups(order);

    // ── بناء قائمة الانتظار بالترتيب ──
    const queue: PrintJob[] = [];

    // 1) الفاتورة الرئيسية — نسخة لكل تصنيف مفعّل
    for (let i = 0; i < copiesCount; i++) {
      const copyLabel = enabledCopies[i]?.label ?? `نسخة ${i + 1}`;
      queue.push({
        kind: "browser-master",
        copyLabel,
        logData: {
          orderId: order.id,
          invoiceNumber: order.invoiceNumber,
          receiptType: isReprint ? "reprint" : "master",
          departmentName: copyLabel,
          printerName: null,
          copies: 1,
          status: "success",
          reprintReason: isReprint ? (reprintReasonText ?? "إعادة طباعة") : null,
          reprintCount: isReprint ? 1 : 0,
        },
      });
    }

    // 2) فاتورة مستقلة لكل قسم موجود في الطلب
    for (const { dept, items } of deptGroups) {
      if (!items.length) continue;
      const logData = {
        orderId: order.id,
        invoiceNumber: order.invoiceNumber,
        receiptType: "department" as const,
        departmentName: dept.categoryName ?? "قسم",
        printerName: dept.printerName ?? null,
        copies: dept.copies,
        status: "success" as const,
        reprintCount: 0,
      };
      for (let c = 0; c < dept.copies; c++) {
        if (dept.printerName) {
          queue.push({ kind: "direct-dept", dept, items, logData });
        } else {
          queue.push({ kind: "browser-dept", dept, items, logData });
        }
      }
    }

    // ── تنفيذ Queue بالترتيب: فاتورة → انتهت → فاتورة التالية ──
    for (let i = 0; i < queue.length; i++) {
      const job = queue[i];

      // تسجيل الطباعة
      createPrintLog.mutate({ data: job.logData });

      if (job.kind === "browser-master") {
        await browserPrint({ type: "master", copyLabel: job.copyLabel });
      } else if (job.kind === "browser-dept") {
        await browserPrint({ type: "dept", dept: job.dept, items: job.items });
      } else if (job.kind === "direct-dept") {
        await directPrint(order, job.dept, job.items);
      }

      // تأخير قصير بين كل وظيفة لضمان الاستقرار
      if (i < queue.length - 1) await sleep(250);
    }
  };

  const confirmPay = () => {
    const items: OrderItemInput[] = cart.map(i => ({
      productId: i.product.id,
      quantity: i.quantity,
      unitPrice: i.product.price,
    }));

    createOrderMutation.mutate({
      data: {
        items,
        paymentMethod,
        subtotal,
        discount: discountAmt,
        tax: taxAmt,
        total,
        cashAmount: paymentMethod === "cash" ? total : paymentMethod === "mixed" ? parseFloat(cashGiven) || 0 : null,
        cardAmount: paymentMethod === "card" ? total : paymentMethod === "mixed" ? total - (parseFloat(cashGiven) || 0) : null,
        userId: user!.id,
        orderType,
        tableNumber: tableNumber || null,
        note: note || null,
      }
    }, {
      onSuccess: (order) => {
        setLastOrder(order);
        setShowPayDialog(false);
        setCart([]);
        setDiscount(0);
        setCashGiven("");
        setPaymentMethod("cash");
        setNote("");
        setTableNumber("");

        const mainPrinter = (printerSettings as any)?.mainPrinterName as string | null | undefined;
        const isFullySilent = autoPrintTrigger === "after_payment" && !!mainPrinter;

        if (isFullySilent) {
          // طباعة صامتة كاملة — بدون نافذة معاينة أو حوار
          toast({ title: "✅ تم تأكيد الطلب", description: `${order.invoiceNumber} — جاري الطباعة...` });
          silentPrintAll(order).then(() => {
            toast({ title: "🖨️ تمت الطباعة", description: "تمت طباعة جميع الفواتير بنجاح" });
          });
        } else if (autoPrintTrigger === "after_payment") {
          // طباعة تلقائية بعد الدفع مع نافذة المعاينة
          setShowReceipt(true);
          setTimeout(() => triggerDirectPrint(order), 600);
        } else {
          // إظهار المعاينة فقط (الطباعة يدوية)
          setShowReceipt(true);
        }
      },
      onError: () => {
        toast({ variant: "destructive", title: "فشل في حفظ الفاتورة" });
      }
    });
  };

  const handleReprint = () => {
    if (!lastOrder) return;
    const maxReprint = settings?.maxReprintCount ?? 3;
    if (maxReprint > 0) {
      setShowReprintDialog(true);
    } else {
      triggerDirectPrint(lastOrder, true);
    }
  };

  const confirmReprint = () => {
    if (!lastOrder) return;
    triggerDirectPrint(lastOrder, true, reprintReason);
    setShowReprintDialog(false);
    setReprintReason("");
  };

  const change = parseFloat(cashGiven) - total;

  const enabledCopies = receiptCopies.filter(c => c.enabled);
  const masterCopiesCount = settings?.masterCopiesCount ?? 2;
  const deptGroups = lastOrder ? getDeptGroups(lastOrder) : [];
  const copyLabels = Array.from({ length: masterCopiesCount }, (_, i) => enabledCopies[i]?.label ?? `نسخة ${i + 1}`);

  return (
    <PosLayout>
      {/* Hidden print area */}
      <div className="hidden-print-container">
        <div id="receipt-print-area">
          {lastOrder && activePrintPage && (
            <div className="print-page">
              {activePrintPage.type === "master" ? (
                <MasterReceiptSlip order={lastOrder} settings={settings ?? undefined} cashierName={user?.name} copyLabel={activePrintPage.copyLabel} />
              ) : (
                <DeptReceiptSlip order={lastOrder} dept={activePrintPage.dept} items={activePrintPage.items} settings={settings ?? undefined} cashierName={user?.name} />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex w-full h-full overflow-hidden bg-[#e8eaf0]" dir="rtl">

        {/* ═══ RIGHT PANEL: Categories + Cart ═══ */}
        <div className="w-[300px] flex flex-col bg-white border-l border-slate-300 shrink-0 shadow-md">

          {/* ── Categories bar ── */}
          <div className="bg-[#0f1e3c] px-2 py-1.5 shrink-0">
            <p className="text-[10px] text-blue-300 font-semibold mb-1.5 px-1">المجموعات / الأقسام</p>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn("px-2 py-0.5 text-[11px] rounded font-bold transition-colors",
                  selectedCategory === null ? "bg-amber-400 text-[#0f1e3c]" : "bg-white/10 text-white hover:bg-white/20")}
              >الكل</button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn("px-2 py-0.5 text-[11px] rounded font-bold transition-colors",
                    selectedCategory === cat.id ? "bg-amber-400 text-[#0f1e3c]" : "bg-white/10 text-white hover:bg-white/20")}
                  style={selectedCategory === cat.id && cat.color ? { backgroundColor: cat.color } : {}}
                >{cat.name}</button>
              ))}
            </div>
          </div>

          {/* ── Order type + table ── */}
          <div className="bg-slate-50 border-b border-slate-200 px-2 py-1.5 flex items-center gap-1.5 shrink-0">
            {(["dine-in", "takeout", "delivery"] as OrderType[]).map(t => (
              <button key={t} onClick={() => setOrderType(t)}
                className={cn("flex-1 py-1 text-[11px] font-bold rounded border transition-colors",
                  orderType === t ? "bg-[#0f1e3c] text-white border-[#0f1e3c]" : "border-slate-300 text-slate-600 hover:border-[#0f1e3c]")}
              >{ORDER_TYPE_LABELS[t]}</button>
            ))}
            {orderType === "dine-in" && (
              <Input placeholder="طاولة" value={tableNumber} onChange={e => setTableNumber(e.target.value)}
                className="w-16 h-7 text-xs text-center border-slate-300" />
            )}
          </div>

          {/* ── Cart table header ── */}
          <div className="grid grid-cols-[1fr_40px_70px_24px] bg-[#0f1e3c] text-white text-[11px] font-bold px-2 py-1 shrink-0">
            <span>الصنف</span>
            <span className="text-center">الكمية</span>
            <span className="text-center">السعر</span>
            <span />
          </div>

          {/* ── Cart rows ── */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {cart.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <ShoppingCart className="w-8 h-8 opacity-30" />
                <span>اضغط على منتج للإضافة</span>
              </div>
            )}
            {cart.map((item, idx) => (
              <div key={item.product.id}
                className={cn("grid grid-cols-[1fr_40px_70px_24px] items-center px-2 py-1 gap-0.5",
                  idx % 2 === 0 ? "bg-white" : "bg-amber-50/60")}
              >
                <span className="text-[11px] font-semibold text-slate-800 truncate leading-tight">{item.product.name}</span>
                <div className="flex flex-col items-center gap-0.5">
                  <button onClick={() => changeQty(item.product.id, 1)}
                    className="w-5 h-4 bg-green-100 hover:bg-green-200 rounded text-green-700 flex items-center justify-center leading-none">
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                  <span className="text-[12px] font-extrabold text-slate-800 tabular-nums">{item.quantity}</span>
                  <button onClick={() => changeQty(item.product.id, -1)}
                    className="w-5 h-4 bg-red-100 hover:bg-red-200 rounded text-red-600 flex items-center justify-center leading-none">
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                </div>
                <span className="text-[11px] font-bold text-amber-700 text-center tabular-nums">
                  {(item.product.price * item.quantity).toLocaleString()}
                </span>
                <button onClick={() => removeFromCart(item.product.id)}
                  className="w-5 h-5 rounded hover:bg-red-100 flex items-center justify-center text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* ── Note ── */}
          {cart.length > 0 && (
            <div className="px-2 py-1.5 border-t border-slate-100">
              <Input placeholder="ملاحظة..." value={note} onChange={e => setNote(e.target.value)}
                className="h-7 text-xs border-slate-200" />
            </div>
          )}

          {/* ── Totals ── */}
          <div className="bg-slate-50 border-t border-slate-200 px-2 py-2 space-y-1 shrink-0">
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>المجموع الفرعي</span>
              <span className="tabular-nums font-semibold">{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>الخصم</span>
              <Input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))}
                className="w-20 h-5 text-xs text-center border-slate-200 p-0" min={0} />
            </div>
            {taxRate > 0 && (
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>ضريبة {taxRate}%</span>
                <span className="tabular-nums">{taxAmt.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-sm bg-[#0f1e3c] text-white rounded px-2 py-1 mt-1">
              <span>الإجمالي</span>
              <span className="tabular-nums text-amber-300">{total.toFixed(2)} {currency}</span>
            </div>

            {/* Payment method */}
            <div className="flex gap-1 pt-0.5">
              {(["cash", "card", "mixed"] as const).map(m => (
                <button key={m} onClick={() => setPaymentMethod(m)}
                  className={cn("flex-1 py-1 text-[11px] rounded border font-bold transition-colors",
                    paymentMethod === m ? "bg-blue-700 text-white border-blue-700" : "border-slate-300 text-slate-600 hover:border-blue-500")}
                >{m === "cash" ? "نقدي" : m === "card" ? "شبكة" : "مختلط"}</button>
              ))}
            </div>

            <div className="flex gap-1.5 pt-0.5">
              <button onClick={() => setCart([])} disabled={cart.length === 0}
                className="px-3 h-9 text-xs rounded border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-40 font-bold transition-colors">
                إلغاء
              </button>
              <Button
                className="flex-1 h-9 bg-green-600 hover:bg-green-700 text-white font-extrabold text-sm tracking-wide shadow"
                disabled={cart.length === 0 || createOrderMutation.isPending}
                onClick={handlePay}
              >
                دفع
              </Button>
            </div>
          </div>
        </div>

        {/* ═══ MAIN: Products panel ═══ */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── Top bar: number input ── */}
          <div className="h-10 bg-[#0f1e3c] border-b border-slate-700 flex items-center gap-3 px-3 shrink-0">
            <span className="text-white/60 text-xs font-medium shrink-0">رقم الصنف:</span>
            <Input
              ref={numberInputRef}
              type="number"
              placeholder="اكتب الرقم + Enter"
              value={numberInput}
              onChange={e => setNumberInput(e.target.value)}
              onKeyDown={handleNumberInput}
              className="w-40 h-7 text-sm text-center font-bold bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white focus:text-slate-900"
              dir="ltr"
            />
            {cart.length > 0 && (
              <span className="text-amber-300 text-xs font-bold mr-auto">
                {cart.length} صنف — {total.toFixed(0)} {currency}
              </span>
            )}
          </div>

          {/* ── Product grid ── */}
          <div className="flex-1 overflow-y-auto p-2 bg-[#e8eaf0]">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
              {filteredProducts.map(prod => (
                <button
                  key={prod.id}
                  onClick={() => addToCart(prod)}
                  className="bg-amber-400 hover:bg-amber-300 active:scale-95 border border-amber-500 hover:border-amber-400 rounded-lg p-0 text-center transition-all duration-100 cursor-pointer flex flex-col overflow-hidden shadow-sm hover:shadow-md"
                >
                  {/* Price + number line */}
                  <div className="bg-amber-500/60 w-full px-1.5 py-1 text-center">
                    <span className="text-[12px] font-extrabold text-[#0f1e3c] tabular-nums leading-none">
                      {prod.price.toLocaleString()}
                      <span className="text-[10px] font-bold text-slate-700 mr-1">({prod.number})</span>
                    </span>
                  </div>
                  {/* Name */}
                  <div className="flex-1 flex items-center justify-center px-1.5 py-2">
                    <span className="text-[12px] font-bold text-[#0f1e3c] leading-tight text-center line-clamp-2">{prod.name}</span>
                  </div>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-400 text-sm">
                  لا توجد منتجات في هذه الفئة
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تأكيد الدفع</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex justify-between font-bold text-lg bg-amber-50 rounded-lg p-3 border border-amber-200">
              <span>المبلغ المطلوب</span>
              <span className="text-amber-600 tabular-nums">{total.toFixed(2)} {currency}</span>
            </div>
            {(paymentMethod === "cash" || paymentMethod === "mixed") && (
              <div className="space-y-1">
                <label className="text-sm text-slate-500">المبلغ المدفوع نقداً</label>
                <Input
                  type="number"
                  value={cashGiven}
                  onChange={e => setCashGiven(e.target.value)}
                  placeholder="0"
                  className="text-center text-xl font-bold h-12"
                  dir="ltr"
                  autoFocus
                />
                {parseFloat(cashGiven) >= total && (
                  <div className="flex justify-between text-sm font-bold bg-green-50 rounded p-2 text-green-700">
                    <span>الباقي</span>
                    <span className="tabular-nums">{change.toFixed(2)} {currency}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>إلغاء</Button>
            <Button
              onClick={confirmPay}
              disabled={createOrderMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              تأكيد الدفع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent dir="rtl" className="max-w-md max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Printer className="w-4 h-4 text-green-600" />
              <span>تمت العملية</span>
              {lastOrder && (
                <Badge variant="outline" className="text-xs mr-auto">{lastOrder.invoiceNumber}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 px-4 py-3">
            {lastOrder && (
              <ReceiptPreview
                order={lastOrder}
                settings={settings ?? undefined}
                cashierName={user?.name}
                masterCopiesCount={masterCopiesCount}
                copyLabels={copyLabels}
                deptGroups={deptGroups}
              />
            )}
          </ScrollArea>

          <div className="px-4 py-3 border-t shrink-0 flex gap-2 justify-between">
            <Button variant="outline" size="sm" onClick={() => setShowReceipt(false)}>إغلاق</Button>
            <div className="flex gap-2">
              {lastOrder && (
                <Button variant="outline" size="sm" onClick={handleReprint} className="gap-1.5">
                  <Printer className="w-3.5 h-3.5" />
                  إعادة طباعة
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => { if (lastOrder) triggerDirectPrint(lastOrder); }}
                className="gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                طباعة
                {deptGroups.length > 0 && <span className="opacity-70">+ {deptGroups.length} قسم</span>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reprint Reason Dialog */}
      <Dialog open={showReprintDialog} onOpenChange={setShowReprintDialog}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>سبب إعادة الطباعة</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-slate-500">يرجى إدخال سبب إعادة الطباعة (سيُسجَّل في سجل الطباعة)</p>
            <Input
              value={reprintReason}
              onChange={e => setReprintReason(e.target.value)}
              placeholder="مثال: الفاتورة تالفة، طلب العميل..."
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReprintDialog(false)}>إلغاء</Button>
            <Button onClick={confirmReprint} disabled={!reprintReason.trim()}>
              <Printer className="w-4 h-4 me-2" />
              طباعة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PosLayout>
  );
}
