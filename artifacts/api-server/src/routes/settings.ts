import { Router } from "express";
import { db } from "../lib/sqlite";
import { getAuthUser } from "./auth";

const router = Router();

function getSettingsObj() {
  const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const map: Record<string, any> = {};
  for (const r of rows) {
    if (r.value === "true") map[r.key] = true;
    else if (r.value === "false") map[r.key] = false;
    else if (!isNaN(Number(r.value)) && r.value !== "") map[r.key] = Number(r.value);
    else map[r.key] = r.value;
  }
  return {
    businessName: map["businessName"] ?? "مطعمي",
    address: map["address"] ?? null,
    phone: map["phone"] ?? null,
    taxNumber: map["taxNumber"] ?? null,
    taxRate: map["taxRate"] ?? 15,
    currency: map["currency"] ?? "ريال",
    receiptMessage: map["receiptMessage"] ?? null,
    printLogo: map["printLogo"] ?? true,
    printQr: map["printQr"] ?? false,
    showCashier: map["showCashier"] ?? true,
    showCustomer: map["showCustomer"] ?? true,
    // Receipt format
    receiptPaperSize: map["receiptPaperSize"] ?? "80mm",
    showOrderNumber: map["showOrderNumber"] ?? true,
    showTableNumber: map["showTableNumber"] ?? true,
    showDateTime: map["showDateTime"] ?? true,
    showBarcode: map["showBarcode"] ?? false,
    showOrderType: map["showOrderType"] ?? true,
    showTax: map["showTax"] ?? true,
    showDiscount: map["showDiscount"] ?? true,
    showNotes: map["showNotes"] ?? true,
    // Print behavior
    autoPrintTrigger: map["autoPrintTrigger"] ?? "print_button",
    maxReprintCount: map["maxReprintCount"] ?? 3,
    masterCopiesCount: map["masterCopiesCount"] ?? 2,
    logoUrl: map["logoUrl"] ?? null,
  };
}

router.get("/settings", (_req, res) => {
  res.json(getSettingsObj());
});

router.put("/settings", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin") { res.status(403).json({ error: "غير مصرح" }); return; }
  const upsert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)");
  const updates = req.body as Record<string, any>;
  for (const [k, v] of Object.entries(updates)) {
    upsert.run(k, String(v));
  }
  res.json(getSettingsObj());
});

export default router;
