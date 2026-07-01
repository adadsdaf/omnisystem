import type { Order } from "@workspace/api-client-react";

type OrderType = "dine-in" | "takeout" | "delivery";

const ORDER_TYPE_LABELS: Record<string, string> = {
  "dine-in": "محلي",
  "takeout": "سفري",
  "delivery": "توصيل",
};

interface ReceiptSettings {
  businessName?: string;
  address?: string | null;
  phone?: string | null;
  taxNumber?: string | null;
  taxRate?: number;
  currency?: string;
  receiptMessage?: string | null;
  printLogo?: boolean;
  logoUrl?: string | null;
  showCashier?: boolean;
  showCustomer?: boolean;
  showOrderNumber?: boolean;
  showTableNumber?: boolean;
  showDateTime?: boolean;
  showOrderType?: boolean;
  showTax?: boolean;
  showDiscount?: boolean;
  showNotes?: boolean;
}

interface DeptGroup {
  dept: {
    id: number;
    categoryId?: number | null;
    categoryName?: string | null;
    printerName?: string | null;
    copies: number;
    enabled: boolean;
    printOrder: number;
  };
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
    categoryId?: number | null;
    categoryName?: string | null;
  }>;
}

interface ReceiptProps {
  order: Order;
  settings?: ReceiptSettings;
  cashierName?: string;
  masterCopiesCount?: number;
  deptGroups?: DeptGroup[];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return { date: `${day}/${month}/${year}`, time: `${hours}:${mins}` };
}

/* مساعد: يعرض أرقاماً دائماً من اليسار لليمين داخل سياق RTL */
function Num({ children }: { children: React.ReactNode }) {
  return (
    <span dir="ltr" style={{ unicodeBidi: "embed", fontVariantNumeric: "tabular-nums" }}>
      {children}
    </span>
  );
}

export function MasterReceiptSlip({
  order,
  settings,
  cashierName,
  copyLabel,
}: {
  order: Order;
  settings?: ReceiptSettings;
  cashierName?: string;
  copyLabel?: string;
}) {
  const { date, time } = formatDate(order.createdAt);
  const currency = settings?.currency ?? "ريال";
  const taxRate = settings?.taxRate ?? 15;
  const orderTypeLabel = ORDER_TYPE_LABELS[order.orderType ?? "dine-in"] ?? "محلي";

  return (
    <div className="receipt-slip" dir="rtl">
      <div className="receipt-header">
        <div className="receipt-business-name">{settings?.businessName ?? "المطعم"}</div>
        {settings?.printLogo && settings?.logoUrl && (
          <div className="receipt-logo-wrap">
            <img src={settings.logoUrl} alt="شعار المطعم" className="receipt-logo" />
          </div>
        )}
        {copyLabel && <div className="receipt-copy-label">{copyLabel}</div>}
        {settings?.address && <div className="receipt-sub">{settings.address}</div>}
        {settings?.phone && (
          <div className="receipt-sub"><Num>{settings.phone}</Num></div>
        )}
        {settings?.taxNumber && (
          <div className="receipt-sub">الرقم الضريبي: <Num>{settings.taxNumber}</Num></div>
        )}
      </div>

      <div className="receipt-divider-dots" />

      <div className="receipt-title-row">
        {settings?.showDateTime !== false && (
          <div className="receipt-time-label"><Num>{time}</Num></div>
        )}
        <div className="receipt-invoice-title">
          <span className="receipt-invoice-title-text">فاتورة خاصة بالزبون</span>
        </div>
      </div>

      {settings?.showOrderNumber !== false && (
        <div className="receipt-invoice-number">
          <Num>{order.invoiceNumber}</Num>
        </div>
      )}

      {settings?.showOrderType !== false && (
        <div className="receipt-order-type">{orderTypeLabel}</div>
      )}

      <div className="receipt-divider-dots" />

      <div className="receipt-meta-row">
        {settings?.showTableNumber !== false && order.tableNumber && (
          <span>ط <Num>{order.tableNumber}</Num></span>
        )}
        {settings?.showDateTime !== false && <span><Num>{date}</Num></span>}
        {cashierName && <span>الكاشير: {cashierName}</span>}
      </div>

      <div className="receipt-divider-solid" />

      <table className="receipt-table">
        <thead>
          <tr>
            <th className="receipt-th-item">الصنف</th>
            <th className="receipt-th-qty">الكمية</th>
            <th className="receipt-th-price">السعر</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item, idx) => (
            <tr key={idx}>
              <td className="receipt-td-item">{item.productName}</td>
              <td className="receipt-td-qty"><Num>{item.quantity}</Num></td>
              <td className="receipt-td-price"><Num>{item.unitPrice.toLocaleString("en-US")}</Num></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="receipt-divider-double" />

      <div className="receipt-totals">
        {settings?.showDiscount !== false && (order.discount ?? 0) > 0 && (
          <div className="receipt-total-row">
            <span>الخصم</span>
            <span><Num>-{(order.discount ?? 0).toFixed(2)}</Num></span>
          </div>
        )}
        {settings?.showTax !== false && (order.tax ?? 0) > 0 && (
          <div className="receipt-total-row">
            <span>ضريبة (<Num>{taxRate}</Num>%)</span>
            <span><Num>{(order.tax ?? 0).toFixed(2)}</Num></span>
          </div>
        )}
        <div className="receipt-grand-total">
          <span>الإجمالي:</span>
          <span><Num>{order.total.toFixed(2)} {currency}</Num></span>
        </div>
      </div>

      {settings?.showCashier !== false && cashierName && (
        <div className="receipt-cashier">اسم الكاشير: {cashierName}</div>
      )}

      {settings?.showNotes !== false && order.note && (
        <div className="receipt-notes-box">
          <div className="receipt-notes-label">ملاحظات الطلب</div>
          <div className="receipt-notes-text">{order.note}</div>
        </div>
      )}

      {settings?.receiptMessage && (
        <div className="receipt-footer-msg">{settings.receiptMessage}</div>
      )}

      <div className="receipt-no-return">الطلب لا يمكن استرجاعه أو إلغاؤه</div>

      {settings?.phone && (
        <div className="receipt-contact">أرقام التواصل: <Num>{settings.phone}</Num></div>
      )}
    </div>
  );
}

export function DeptReceiptSlip({
  order,
  dept,
  items,
  settings,
  cashierName,
}: {
  order: Order;
  dept: DeptGroup["dept"];
  items: DeptGroup["items"];
  settings?: ReceiptSettings;
  cashierName?: string;
}) {
  const { date, time } = formatDate(order.createdAt);
  const orderTypeLabel = ORDER_TYPE_LABELS[order.orderType ?? "dine-in"] ?? "محلي";
  const currency = settings?.currency ?? "ريال";
  const deptTotal = items.reduce((s, i) => s + (i.unitPrice ?? 0) * i.quantity, 0);

  return (
    <div className="receipt-slip receipt-dept-slip" dir="rtl">

      {/* ── اسم التصنيف ── */}
      <div className="dept-slip-category-bar">{dept.categoryName}</div>

      {/* ── صف: أمر صرف | رقم الطلب الكبير | نوع الطلب ── */}
      <div className="dept-slip-top-row">
        <span className="dept-slip-amr">أمر صرف</span>
        <span className="dept-slip-big-num"><Num>{order.invoiceNumber}</Num></span>
        <span className="dept-slip-order-type">{orderTypeLabel}</span>
      </div>

      {/* ── صف: الطاولة والتاريخ والوقت ── */}
      <div className="dept-slip-info-row">
        {order.tableNumber && (
          <span className="dept-slip-info-table">ط <Num>{order.tableNumber}</Num></span>
        )}
        <span className="dept-slip-info-date"><Num>{date}</Num></span>
        <span className="dept-slip-info-time"><Num>{time}</Num></span>
      </div>

      <div className="receipt-divider-solid" />

      {/* ── الأصناف ── */}
      <table className="dept-slip-table">
        <thead>
          <tr className="dept-slip-th-row">
            <th className="dept-slip-th-name">الصنف</th>
            <th className="dept-slip-th-qty">الكمية</th>
            <th className="dept-slip-th-price">السعر</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="dept-slip-item-row">
              <td className="dept-slip-item-name">{item.productName}</td>
              <td className="dept-slip-item-qty"><Num>{item.quantity}</Num></td>
              <td className="dept-slip-item-price"><Num>{(item.unitPrice ?? 0).toLocaleString("en-US")}</Num></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="receipt-divider-solid" />

      {/* ── الإجمالي ── */}
      <div className="dept-slip-total-row">
        <span className="dept-slip-total-label">الإجمـالـي:</span>
        <span className="dept-slip-total-val"><Num>{deptTotal.toLocaleString("en-US")} {currency}</Num></span>
      </div>

      {/* ── ملاحظات الطلب ── */}
      {order.note && settings?.showNotes !== false && (
        <div className="dept-slip-notes">
          <span className="dept-slip-notes-label">ملاحظات الطلب</span>
          <div>{order.note}</div>
        </div>
      )}

      {/* ── اسم الكاشير ── */}
      {cashierName && (
        <div className="dept-slip-cashier">اسم الكاشير: {cashierName}</div>
      )}
    </div>
  );
}

export function ReceiptPrintArea({
  order,
  settings,
  cashierName,
  masterCopiesCount = 1,
  copyLabels = [],
  deptGroups = [],
}: ReceiptProps & { copyLabels?: string[] }) {
  const slips: React.ReactNode[] = [];

  for (let i = 0; i < masterCopiesCount; i++) {
    slips.push(
      <div key={`master-${i}`} className="print-page">
        <MasterReceiptSlip
          order={order}
          settings={settings}
          cashierName={cashierName}
          copyLabel={copyLabels[i]}
        />
      </div>
    );
  }

  for (const { dept, items } of deptGroups) {
    for (let c = 0; c < dept.copies; c++) {
      slips.push(
        <div key={`dept-${dept.id}-${c}`} className="print-page">
          <DeptReceiptSlip
            order={order}
            dept={dept}
            items={items}
            settings={settings}
          />
        </div>
      );
    }
  }

  return (
    <div id="receipt-print-area">
      {slips}
    </div>
  );
}

export function ReceiptPreview({
  order,
  settings,
  cashierName,
  masterCopiesCount = 1,
  copyLabels = [],
  deptGroups = [],
}: ReceiptProps & { copyLabels?: string[] }) {
  const { date, time } = formatDate(order.createdAt);
  const currency = settings?.currency ?? "ريال";
  const taxRate = settings?.taxRate ?? 15;
  const orderTypeLabel = ORDER_TYPE_LABELS[order.orderType ?? "dine-in"] ?? "محلي";

  return (
    <div dir="rtl" className="receipt-preview-container">
      <div className="receipt-preview-master">
        <div className="text-center mb-1">
          <div className="text-base font-bold">{settings?.businessName ?? "المطعم"}</div>
          {settings?.address && <div className="text-xs text-gray-500">{settings.address}</div>}
          {settings?.phone && (
            <div className="text-xs text-gray-500" dir="ltr">{settings.phone}</div>
          )}
        </div>

        <div className="border-t border-dashed my-1" />

        <div className="flex justify-between items-start text-xs">
          {settings?.showDateTime !== false && (
            <span dir="ltr">{time}</span>
          )}
          <div className="text-center flex-1">
            <div className="font-bold text-sm underline">فاتورة خاصة بالزبون</div>
            {settings?.showOrderNumber !== false && (
              <div className="text-xs font-bold mt-0.5" dir="ltr">{order.invoiceNumber}</div>
            )}
            {settings?.showOrderType !== false && (
              <div className="text-xs">{orderTypeLabel}</div>
            )}
          </div>
        </div>

        <div className="border-t border-dashed my-1" />

        <div className="flex justify-between text-xs">
          {settings?.showTableNumber !== false && order.tableNumber && (
            <span>ط <span dir="ltr">{order.tableNumber}</span></span>
          )}
          {settings?.showDateTime !== false && (
            <span dir="ltr">{date}</span>
          )}
          {cashierName && <span>ك: {cashierName}</span>}
        </div>

        <div className="border-t my-1" />

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-right py-0.5">الصنف</th>
              <th className="text-center py-0.5">الكمية</th>
              <th className="text-left py-0.5" dir="ltr">السعر</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item, idx) => (
              <tr key={idx} className="border-b border-dashed">
                <td className="py-0.5">{item.productName}</td>
                <td className="text-center py-0.5" dir="ltr">{item.quantity}</td>
                <td className="text-left py-0.5 tabular-nums" dir="ltr">{item.unitPrice.toLocaleString("en-US")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t-2 border-double my-1" />

        <div className="space-y-0.5 text-xs">
          {settings?.showDiscount !== false && (order.discount ?? 0) > 0 && (
            <div className="flex justify-between">
              <span>الخصم</span>
              <span dir="ltr">-{(order.discount ?? 0).toFixed(2)}</span>
            </div>
          )}
          {settings?.showTax !== false && (order.tax ?? 0) > 0 && (
            <div className="flex justify-between">
              <span>ضريبة ({taxRate}%)</span>
              <span dir="ltr">{(order.tax ?? 0).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm border-t pt-0.5">
            <span>الإجمالي:</span>
            <span dir="ltr">{order.total.toFixed(2)} {currency}</span>
          </div>
        </div>

        {settings?.showCashier !== false && cashierName && (
          <div className="text-center text-xs mt-1 border-t pt-1">
            اسم الكاشير: {cashierName}
          </div>
        )}

        {settings?.showNotes !== false && order.note && (
          <div className="mt-1 text-xs bg-gray-100 rounded p-1">
            <div className="font-bold text-[10px]">ملاحظات الطلب</div>
            <div>{order.note}</div>
          </div>
        )}

        {settings?.receiptMessage && (
          <div className="text-center text-[10px] text-gray-500 mt-1">{settings.receiptMessage}</div>
        )}

        <div className="text-center text-[10px] text-gray-500 mt-0.5">
          الطلب لا يمكن استرجاعه أو إلغاؤه
        </div>
        {settings?.phone && (
          <div className="text-center text-[10px] text-gray-500" dir="ltr">
            {settings.phone}
          </div>
        )}

        <div className="text-[9px] text-gray-400 text-center mt-1">
          {masterCopiesCount > 1 ? `${masterCopiesCount} نسخ` : "نسخة واحدة"}{deptGroups.length > 0 ? ` + ${deptGroups.length} قسم` : ""}
        </div>
      </div>

      {deptGroups.length > 0 && (
        <div className="mt-2 space-y-2">
          <div className="text-xs font-bold text-gray-500 border-t pt-1">فواتير الأقسام ({deptGroups.length})</div>
          {deptGroups.map(({ dept, items }) => (
            <div key={dept.id} className="border rounded p-2 bg-blue-50 text-xs">
              <div className="font-bold text-blue-800 mb-1">قسم: {dept.categoryName} ({dept.copies} نسخة)</div>
              {dept.printerName && (
                <div className="text-[10px] text-gray-500 mb-1">الطابعة: {dept.printerName}</div>
              )}
              <table className="w-full">
                <thead>
                  <tr className="border-b border-blue-200">
                    <th className="text-right py-0.5">الصنف</th>
                    <th className="text-center py-0.5 font-bold">الكمية</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-dashed border-blue-100">
                      <td className="py-0.5">{item.productName}</td>
                      <td className="text-center font-bold text-lg py-0.5" dir="ltr">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {order.note && (
                <div className="text-[10px] text-gray-500 mt-1">ملاحظة: {order.note}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
